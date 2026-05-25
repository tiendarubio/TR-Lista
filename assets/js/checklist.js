document.addEventListener('DOMContentLoaded', async () => {
  if (window.TRAuth?.waitForReady) {
    try {
      await window.TRAuth.waitForReady();
    } catch (authError) {
      console.error('Error preparando autenticación:', authError);
    }
  }

  if (window.TRAuth && !window.TRAuth.isAuthorized?.()) {
    return;
  }

  const $ = (id) => document.getElementById(id);

  const storeSelect = $('storeSelect');
  const versionSelect = $('versionSelect');
  const storeBadge = $('storeBadge');
  const storeBadgeText = $('storeBadgeText');
  const lastSaved = $('lastSaved');

  const body = $('chkBody');
  const searchInput = $('searchInput');
  const btnSearchModeToggle = $('btnSearchModeToggle');
  const searchLeadLabel = $('searchLeadLabel');
  const suggestions = $('suggestions');
  const btnSave = $('btnSave');
  const btnExport = $('btnExport');
  const btnToggleRequisition = $('btnToggleRequisition');
  const btnClear = $('btnClear');
  const btnCleanUnreviewed = $('btnCleanUnreviewed');
  const btnReviewSelected = $('btnReviewSelected');
  const btnDispatchSelected = $('btnDispatchSelected');
  const btnDeleteSelected = $('btnDeleteSelected');
  const thBodega = $('thBodega');
  const chkSelectAllRows = $('chkSelectAllRows');
  const bulkSelectionBar = $('bulkSelectionBar');
  const bulkSelectionCount = $('bulkSelectionCount');
  const btnClearSelection = $('btnClearSelection');
  const btnToggleSelectAllBulk = $('btnToggleSelectAllBulk');
  const moreActionsMenu = $('moreActionsMenu');
  const appLoadingOverlay = $('appLoadingOverlay');
  const appLoadingText = $('appLoadingText');
  const qtyPreviewBubble = $('qtyPreviewBubble');
  const mobileFabToggle = $('mobileFabToggle');
  const mobileFabMenu = $('mobileFabMenu');
  const mobileFabBackdrop = $('mobileFabBackdrop');
  const btnFabSave = $('btnFabSave');
  const btnFabSearchList = $('btnFabSearchList');
  const btnFabSortWarehouse = $('btnFabSortWarehouse');
  const btnFabExport = $('btnFabExport');
  const btnFabScrollTop = $('btnFabScrollTop');
  const searchModeHint = $('searchModeHint');
  const listSearchCount = $('listSearchCount');
  const mobileChecklistCards = $('mobileChecklistCards');

  // Flujo de solicitudes
  const requestFlowCard = $('requestFlowCard');
  const requestFlowTitle = $('requestFlowTitle');
  const requestFlowMeta = $('requestFlowMeta');
  const requestStatusBadge = $('requestStatusBadge');
  const btnStartList = $('btnStartList');
  const btnSubmitRequest = $('btnSubmitRequest');
  const btnViewCurrentRequest = $('btnViewCurrentRequest');
  const btnConfirmRequestReceived = $('btnConfirmRequestReceived');
  const btnViewRequestHistory = $('btnViewRequestHistory');
  const warehouseInboxCard = $('warehouseInboxCard');
  const warehouseInboxMeta = $('warehouseInboxMeta');
  const btnWarehouseInbox = $('btnWarehouseInbox');
  const btnWarehouseNotifications = $('btnWarehouseNotifications');
  const btnCreateWarehouseRequest = $('btnCreateWarehouseRequest');
  const warehouseInboxBadge = $('warehouseInboxBadge');
  const btnCloseWarehouseRequest = $('btnCloseWarehouseRequest');
  const btnMarkRequestDispatched = $('btnMarkRequestDispatched');
  const btnCancelWarehouseRequest = $('btnCancelWarehouseRequest');
  const btnMergeWarehouseRequests = $('btnMergeWarehouseRequests');
  const warehouseIdleNotice = $('warehouseIdleNotice');
  const scanToastHost = $('scanToastHost');

  // Histórico
  const histDateInput = $('histDateInput');
  const btnHistToday = $('btnHistToday');
  const btnToggleHistLock = $('btnToggleHistLock');
  const btnMergeSelectedToToday = $('btnMergeSelectedToToday');
  const btnHistCalendar = $('btnHistCalendar');
  const histCalendarPanel = $('histCalendarPanel');

  // Scanner elements
  const btnScan = $('btnScan');
  const btnScannerSoundToggle = $('btnScannerSoundToggle');
  const scanWrap = $('scanWrap');
  const scanVideo = $('scanVideo');
  const html5QrReader = $('html5QrReader');
  const btnFilePick = $('btnFilePick');
  const fileScan = $('fileScan');

  let sortAsc = true;
  let lastUpdateISO = null;
  let loadingCounter = 0;

  let mediaStream = null;
  let scanInterval = null;
  let detector = null;
  let html5QrScanner = null;
  let html5QrScannerActive = false;

  // Histórico
  let histPicker = null;
  let currentViewDate = null; // null = hoy (editable)
  let histDatesWithData = new Set();
  let historicalUnlockEnabled = false;
  let protectedVersionUnlockEnabled = false;
  let requisitionDone = false;
  let requisitionDoneAt = null;
  let requestFlowState = { status: 'none', requestId: null, submittedAt: null, createdAt: null, itemCount: 0, record: null };
  let activeWarehouseRequest = null;
  let activeWarehouseRequestSnapshot = '';
  let lastCommittedVersionValue = versionSelect?.value || 'base';
  let listSearchTerm = '';
  let primarySearchMode = 'catalog';
  let catalogSearchIndex = null;
  let catalogSearchRenderTimer = null;
  let lastCatalogQuery = '';
  let suppressProductAddedToast = false;
  let isBulkRenderingRows = false;
  let scannerAudioContext = null;
  let scannerSoundEnabled = localStorage.getItem('trlistaScannerSound') !== 'off';
  let warehouseRequestsUnsubscribe = null;
  let warehouseNotificationPrimed = false;
  let knownWarehouseRequestIds = new Set();
  let notifiedWarehouseRequestIds = new Set();
  let warehouseInboxCounts = { pending: 0, review: 0, dispatched: 0, received: 0, total: 0 };
  let clientConfigCache = null;
  let fcmRegistrationPromise = null;
  let fcmTokenRegistered = false;
  let autoSaveTimer = null;
  let autoSaveInFlight = false;
  let autoSaveQueued = false;
  let autoSaveDirty = false;
  let lastAutoSaveSignature = '';
  let lastAutoSaveToastAt = 0;
  const AUTO_SAVE_DELAY_MS = 2500;

  const REQUEST_STATUSES = Object.freeze({
    NONE: 'none',
    DRAFT: 'draft',
    SENT: 'enviado',
    REVIEW: 'en_revision',
    DISPATCHED: 'despachado',
    PARTIAL_DISPATCH: 'despacho_parcial',
    RECEIVED: 'recibido',
    CANCELLED: 'cancelado',
    MERGED: 'fusionado'
  });

  const REQUEST_STATUS_META = Object.freeze({
    none: { label: 'Sin iniciar', badge: 'text-bg-secondary' },
    draft: { label: 'En edición', badge: 'text-bg-warning' },
    borrador: { label: 'En edición', badge: 'text-bg-warning' },
    enviado: { label: 'Enviada a bodega', badge: 'text-bg-primary' },
    en_revision: { label: 'En revisión', badge: 'text-bg-info' },
    despacho_parcial: { label: 'Despacho parcial', badge: 'text-bg-warning' },
    despachado: { label: 'Despachada', badge: 'text-bg-success' },
    recibido: { label: 'Recibida', badge: 'text-bg-dark' },
    cancelado: { label: 'Cancelada', badge: 'text-bg-danger' },
    cancelada: { label: 'Cancelada', badge: 'text-bg-danger' },
    fusionado: { label: 'Fusionada', badge: 'text-bg-secondary' },
    fusionada: { label: 'Fusionada', badge: 'text-bg-secondary' }
  });

  function normalizeRequestStatus(status, fallback = REQUEST_STATUSES.NONE) {
    const value = String(status || fallback || REQUEST_STATUSES.NONE).trim().toLowerCase();
    if (value === 'borrador') return REQUEST_STATUSES.DRAFT;
    if (value === 'recibida') return REQUEST_STATUSES.RECEIVED;
    if (value === 'cancelada') return REQUEST_STATUSES.CANCELLED;
    if (value === 'fusionada') return REQUEST_STATUSES.MERGED;
    return value || fallback || REQUEST_STATUSES.NONE;
  }

  function getToastIcon(type) {
    if (type === 'success') return 'fa-circle-check';
    if (type === 'warning') return 'fa-triangle-exclamation';
    if (type === 'error') return 'fa-circle-xmark';
    return 'fa-circle-info';
  }


  function updateScannerSoundButton() {
    if (!btnScannerSoundToggle) return;
    btnScannerSoundToggle.classList.toggle('is-muted', !scannerSoundEnabled);
    btnScannerSoundToggle.title = scannerSoundEnabled ? 'Sonido del escáner activado' : 'Sonido del escáner desactivado';
    btnScannerSoundToggle.setAttribute('aria-pressed', scannerSoundEnabled ? 'true' : 'false');
    btnScannerSoundToggle.innerHTML = scannerSoundEnabled
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';
  }

  function getScannerAudioContext() {
    if (!scannerSoundEnabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      if (!scannerAudioContext) scannerAudioContext = new AudioCtx();
      if (scannerAudioContext.state === 'suspended') {
        scannerAudioContext.resume().catch(() => {});
      }
      return scannerAudioContext;
    } catch (_err) {
      return null;
    }
  }

  function vibrateScannerFeedback(type) {
    if (!scannerSoundEnabled || !navigator.vibrate) return;
    const patterns = {
      success: [70],
      warning: [45, 35, 45],
      error: [110, 55, 110],
      info: [35]
    };
    try { navigator.vibrate(patterns[type] || patterns.info); } catch (_err) {}
  }

  function playTone(ctx, startAt, frequency, duration, gainValue = 0.055) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.025);
  }

  function playScannerFeedback(type = 'info') {
    if (!scannerSoundEnabled) return;
    vibrateScannerFeedback(type);

    const ctx = getScannerAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + 0.01;
      if (type === 'success') {
        playTone(ctx, now, 880, 0.075, 0.05);
        playTone(ctx, now + 0.085, 1175, 0.09, 0.05);
      } else if (type === 'warning') {
        playTone(ctx, now, 740, 0.055, 0.045);
        playTone(ctx, now + 0.075, 740, 0.055, 0.045);
      } else if (type === 'error') {
        playTone(ctx, now, 260, 0.14, 0.06);
      } else {
        playTone(ctx, now, 660, 0.055, 0.04);
      }
    } catch (_err) {}
  }

  updateScannerSoundButton();

  if (btnScannerSoundToggle) {
    btnScannerSoundToggle.addEventListener('click', () => {
      scannerSoundEnabled = !scannerSoundEnabled;
      localStorage.setItem('trlistaScannerSound', scannerSoundEnabled ? 'on' : 'off');
      updateScannerSoundButton();
      if (scannerSoundEnabled) {
        playScannerFeedback('info');
        showScanToast('info', 'Sonido activado', 'El escáner avisará con beep y vibración.', { timeout: 2200 });
      } else {
        showScanToast('info', 'Sonido desactivado', 'El escáner seguirá mostrando avisos visuales.', { timeout: 2200 });
      }
    });
  }

  function showAppToast(type, title, message, options = {}) {
    if (!scanToastHost) return;

    const toast = document.createElement('div');
    const safeType = ['success', 'info', 'warning', 'error'].includes(type) ? type : 'info';
    const timeout = Number(options.timeout || 2600);
    toast.className = `scan-toast scan-toast-${safeType}`;
    toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="scan-toast-icon" aria-hidden="true"><i class="fa-solid ${getToastIcon(safeType)}"></i></span>
      <span class="scan-toast-content">
        <span class="scan-toast-title">${escapeHtml(title || '')}</span>
        <span class="scan-toast-message">${escapeHtml(message || '')}</span>
      </span>
      <button type="button" class="scan-toast-close" aria-label="Cerrar aviso"><i class="fa-solid fa-xmark"></i></button>
    `;

    const closeToast = () => {
      if (!toast.isConnected) return;
      toast.classList.add('is-hiding');
      window.setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('.scan-toast-close')?.addEventListener('click', closeToast);
    scanToastHost.appendChild(toast);

    while (scanToastHost.children.length > 3) {
      scanToastHost.firstElementChild?.remove();
    }

    if (timeout > 0) {
      window.setTimeout(closeToast, timeout);
    }
  }

  function showScanToast(type, title, message, options = {}) {
    // Compatibilidad: el nombre histórico se mantiene, pero todos los avisos pasan por una sola función.
    return showAppToast(type, title, message, options);
  }

  function normalizeCatalogText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function ensureCatalogSearchIndex(rows = window.CATALOGO_CACHE || []) {
    if (catalogSearchIndex && catalogSearchIndex.source === rows) {
      return catalogSearchIndex.items;
    }

    const items = (Array.isArray(rows) ? rows : []).map(row => {
      const nombre = row?.[0] || '';
      const codInv = row?.[1] || '';
      const bodega = row?.[2] || '';
      const barcode = row?.[3] || '';
      return {
        row,
        searchText: normalizeCatalogText(`${nombre} ${codInv} ${bodega} ${barcode}`)
      };
    });

    catalogSearchIndex = { source: rows, items };
    return items;
  }

  function clearCatalogSearchTimer() {
    if (catalogSearchRenderTimer) {
      window.clearTimeout(catalogSearchRenderTimer);
      catalogSearchRenderTimer = null;
    }
  }

  function renderCatalogSuggestions(rows, rawQuery) {
    if (!suggestions) return;
    const q = normalizeCatalogText(rawQuery);
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (!q) return;

    const matches = ensureCatalogSearchIndex(rows)
      .filter(entry => entry.searchText.includes(q))
      .slice(0, 40);

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted small';
      li.textContent = 'Sin coincidencias en catálogo.';
      suggestions.appendChild(li);
      return;
    }

    const frag = document.createDocumentFragment();
    matches.forEach(({ row: r }) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      const nombre = r[0] || '';
      const codInv = r[1] || 'N/A';
      const bodega = r[2] || '';
      const barcode = r[3] || 'sin código';
      li.textContent = `${nombre} (${barcode}) [${codInv}] — ${bodega}`;
      li.addEventListener('click', async () => {
        await handleProductSelection(buildItemFromCatalogRow(r));
      });
      frag.appendChild(li);
    });
    suggestions.appendChild(frag);
  }

  const currentUserRole = String(window.TRAuth?.getCurrentRole?.() || 'sin_acceso').trim().toLowerCase();
  const currentUserEmail = String(window.TRAuth?.getCurrentUser?.()?.email || '').trim().toLowerCase();
  const currentUserStoreKey = String(window.TRAuth?.getCurrentStoreKey?.() || '').trim();

  function hasRole(...roles) {
    return roles.includes(currentUserRole);
  }

  function canUnlockHistoricalViews() {
    return hasRole('admin', 'supervisor');
  }

  function canUseProtectedLists() {
    return hasRole('admin', 'supervisor');
  }

  function canMergeHistoricalRows() {
    return hasRole('admin', 'supervisor');
  }

  function canUseWarehouseTools() {
    return hasRole('admin', 'supervisor');
  }

  // El usuario de bodega (ROLE_SUPERVISOR_EMAILS) trabaja por bandeja.
  // No debe cargar ni editar una tabla hasta abrir una solicitud enviada.
  function requiresWarehouseRequestContext() {
    return hasRole('supervisor');
  }

  function hasActiveWarehouseRequest() {
    return !!(activeWarehouseRequest && activeWarehouseRequest.requestId);
  }

  function getActiveWarehouseSnapshot() {
    if (!hasActiveWarehouseRequest()) return '';
    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    return JSON.stringify({
      requestId: activeWarehouseRequest.requestId,
      storeKey: storeSelect?.value || '',
      versionKey: versionSelect?.value || '',
      requestDate: getTargetChecklistDate(),
      status: activeWarehouseRequest.status || '',
      items
    });
  }

  function rememberActiveWarehouseSnapshot() {
    activeWarehouseRequestSnapshot = getActiveWarehouseSnapshot();
  }

  function hasUnsavedActiveWarehouseChanges() {
    if (!requiresWarehouseRequestContext() || !hasActiveWarehouseRequest()) return false;
    return getActiveWarehouseSnapshot() !== activeWarehouseRequestSnapshot;
  }

  async function confirmLeaveActiveWarehouseRequest(actionLabel = 'cambiar de solicitud') {
    if (!hasUnsavedActiveWarehouseChanges()) return true;

    const result = await Swal.fire({
      title: 'Cambios sin guardar',
      html: '<div class="text-start small">Tienes cambios sin guardar en la solicitud activa.<br><br>¿Qué deseas hacer antes de ' + escapeHtml(actionLabel) + '?</div>',
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Guardar y continuar',
      denyButtonText: 'Continuar sin guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      const saveResult = await persistCurrentChecklist({
        showSuccess: false,
        successTitle: 'Guardado',
        successMessage: 'Cambios guardados correctamente.'
      });
      return !!saveResult?.ok;
    }

    if (result.isDenied) return true;
    return false;
  }

  function getAutoSaveSignature() {
    try {
      const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
      return JSON.stringify({
        role: currentUserRole,
        storeKey: storeSelect?.value || '',
        versionKey: versionSelect?.value || '',
        targetDay: getTargetChecklistDate(),
        requestId: activeWarehouseRequest?.requestId || requestFlowState?.requestId || '',
        requestStatus: normalizeRequestStatus(requestFlowState?.status || activeWarehouseRequest?.status || REQUEST_STATUSES.NONE),
        items
      });
    } catch (_err) {
      return '';
    }
  }

  function canAutoSaveCurrentChecklist() {
    if (!body || !btnSave) return false;
    if (loadingCounter > 0 || isBulkRenderingRows) return false;
    if (isEditingLocked()) return false;

    if (isBranchOperator()) {
      return isRequestDraftStatus(requestFlowState?.status);
    }

    if (requiresWarehouseRequestContext()) {
      return hasActiveWarehouseRequest();
    }

    // Admin conserva guardado manual para evitar escrituras automáticas sobre vistas técnicas/legacy.
    return false;
  }

  function setAutoSaveStatus(status, detail = '') {
    if (!lastSaved) return;
    if (status === 'pending') {
      lastSaved.innerHTML = '<i class="fa-solid fa-circle-exclamation me-1 text-warning"></i>Cambios sin guardar' + (detail ? ': ' + escapeHtml(detail) : '.');
      return;
    }
    if (status === 'saving') {
      lastSaved.innerHTML = '<i class="fa-solid fa-rotate fa-spin me-1 text-primary"></i>Guardando automáticamente...';
      return;
    }
    if (status === 'error') {
      lastSaved.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1 text-danger"></i>No se pudo autoguardar.';
    }
  }

  function queueAutoSave(reason = 'cambio') {
    if (!canAutoSaveCurrentChecklist()) return;
    const signature = getAutoSaveSignature();
    if (!signature || signature === lastAutoSaveSignature) return;

    autoSaveDirty = true;
    setAutoSaveStatus('pending');
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
      autoSaveTimer = null;
      runAutoSave(reason);
    }, AUTO_SAVE_DELAY_MS);
  }

  function cancelPendingAutoSave() {
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    autoSaveDirty = false;
    autoSaveQueued = false;
  }

  async function runAutoSave(reason = 'cambio') {
    if (!autoSaveDirty || !canAutoSaveCurrentChecklist()) return;
    if (autoSaveInFlight) {
      autoSaveQueued = true;
      return;
    }

    const beforeSignature = getAutoSaveSignature();
    if (!beforeSignature || beforeSignature === lastAutoSaveSignature) {
      autoSaveDirty = false;
      return;
    }

    autoSaveInFlight = true;
    autoSaveDirty = false;
    setAutoSaveStatus('saving');

    try {
      const docId = getDocIdForCurrentList();
      const payload = collectPayload();
      const targetDay = getTargetChecklistDate();

      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);

      if (isBranchOperator()) {
        requestFlowState = buildRequestSummaryFromRecord(payload);
      } else if (activeWarehouseRequest) {
        await syncActiveWarehouseRequest();
      }

      lastAutoSaveSignature = getAutoSaveSignature() || beforeSignature;
      updateLastSavedText(payload.meta?.updatedAt || new Date().toISOString());
      updateRequestFlowUI();

      const nowMs = Date.now();
      if (nowMs - lastAutoSaveToastAt > 12000) {
        showScanToast('success', 'Guardado automático', formatSV(payload.meta?.updatedAt || new Date().toISOString()), { timeout: 1900 });
        lastAutoSaveToastAt = nowMs;
      }
    } catch (err) {
      console.error('Error en autoguardado:', err);
      setAutoSaveStatus('error');
      showScanToast('error', 'No se pudo autoguardar', 'Revisa la conexión y usa Guardar.', { timeout: 4200 });
      autoSaveDirty = true;
    } finally {
      autoSaveInFlight = false;
      if (autoSaveQueued) {
        autoSaveQueued = false;
        queueAutoSave('cambio pendiente');
      }
    }
  }

  function resetAutoSaveBaseline() {
    cancelPendingAutoSave();
    ensureWarehouseFilterOption();
    ensureWarehouseVersionFilterOption();
    lastAutoSaveSignature = getAutoSaveSignature();
  }

  function isWarehouseWaitingForRequest() {
    return requiresWarehouseRequestContext() && !hasActiveWarehouseRequest();
  }

  function canWarehouseEditActiveRequest() {
    return canUseWarehouseTools() && (!requiresWarehouseRequestContext() || hasActiveWarehouseRequest());
  }

  function canWarehouseUseActiveRequestAction() {
    return canWarehouseEditActiveRequest() && !isEditingLocked();
  }

  function canUseBulkSelection() {
    return hasRole('admin', 'supervisor', 'operador');
  }

  function isBranchOperator() {
    return hasRole('operador');
  }

  function supportsBrowserNotifications() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  function getBrowserNotificationPermission() {
    if (!supportsBrowserNotifications()) return 'unsupported';
    return Notification.permission || 'default';
  }

  async function loadClientConfig() {
    if (clientConfigCache) return clientConfigCache;
    try {
      const response = await fetch('/api/client-config', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo leer configuración pública.');
      clientConfigCache = await response.json();
    } catch (err) {
      console.warn('No se pudo cargar configuración pública:', err);
      clientConfigCache = { ok: false, firebaseVapidKey: '' };
    }
    return clientConfigCache;
  }

  function supportsFirebaseMessaging() {
    return typeof firebase !== 'undefined'
      && !!firebase.messaging
      && 'serviceWorker' in navigator
      && supportsBrowserNotifications()
      && (location.protocol === 'https:' || location.hostname === 'localhost');
  }

  async function getCurrentUserIdToken() {
    const user = window.TRAuth?.getCurrentUser?.();
    if (!user || typeof user.getIdToken !== 'function') return '';
    try {
      return await user.getIdToken();
    } catch (err) {
      console.warn('No se pudo obtener ID token:', err);
      return '';
    }
  }

  async function registerWarehouseFcmToken({ silent = false } = {}) {
    if (!canUseWarehouseTools()) return false;
    if (!supportsFirebaseMessaging()) {
      if (!silent) await Swal.fire('No compatible', 'Este navegador no permite push web con Firebase Cloud Messaging.', 'info');
      return false;
    }

    if (Notification.permission !== 'granted') return false;
    if (fcmRegistrationPromise) return fcmRegistrationPromise;

    fcmRegistrationPromise = (async () => {
      const config = await loadClientConfig();
      const vapidKey = String(config.firebaseVapidKey || '').trim();
      if (!vapidKey) {
        if (!silent) await Swal.fire('Falta VAPID key', 'La variable VITE_FIREBASE_VAPID_KEY no está disponible desde /api/client-config.', 'warning');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = firebase.messaging();
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
      if (!token) {
        if (!silent) showScanToast('warning', 'Push no registrado', 'El navegador no devolvió token FCM.', { timeout: 3500 });
        return false;
      }

      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        if (!silent) await Swal.fire('Sesión requerida', 'No se pudo validar la sesión para registrar notificaciones.', 'warning');
        return false;
      }

      const response = await fetch('/api/register-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({ token, userAgent: navigator.userAgent || '' })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo registrar el token FCM.');

      fcmTokenRegistered = true;

      try {
        messaging.onMessage((payload) => {
          const notification = payload.notification || {};
          const dataPayload = payload.data || {};
          const requestId = String(dataPayload.requestId || '').trim();
          const fallbackReq = {
            id: requestId,
            requestId,
            status: dataPayload.status || REQUEST_STATUSES.SENT,
            storeName: dataPayload.storeName || 'Sucursal',
            itemCount: Number(dataPayload.itemCount || 0),
            _notificationTitle: notification.title || 'Nueva solicitud a bodega',
            _notificationBody: notification.body || ''
          };

          if (requestId && canUseWarehouseTools()) {
            loadRequestFromFirestore(requestId)
              .then(req => {
                notifyNewWarehouseRequest(req || fallbackReq);
                updateWarehouseInboxBadge(warehouseInboxCounts);
              })
              .catch(() => notifyNewWarehouseRequest(fallbackReq));
          } else {
            notifyNewWarehouseRequest(fallbackReq);
          }
        });
      } catch (_) {}

      return true;
    })().finally(() => {
      fcmRegistrationPromise = null;
      updateWarehouseNotificationButton();
    });

    return fcmRegistrationPromise;
  }

  function getWarehouseNotificationPermissionLabel() {
    const permission = getBrowserNotificationPermission();
    if (permission === 'granted' && fcmTokenRegistered) return 'Push ON';
    if (permission === 'granted') return 'Notificaciones activas';
    if (permission === 'denied') return 'Notificaciones bloqueadas';
    if (permission === 'unsupported') return 'No compatible';
    return 'Activar notificaciones';
  }

  function updateWarehouseNotificationButton() {
    if (!btnWarehouseNotifications) return;
    const show = canUseWarehouseTools();
    btnWarehouseNotifications.classList.toggle('d-none', !show);
    if (!show) return;

    const permission = getBrowserNotificationPermission();
    btnWarehouseNotifications.disabled = permission === 'unsupported';
    btnWarehouseNotifications.classList.toggle('is-active', permission === 'granted');
    btnWarehouseNotifications.classList.toggle('is-blocked', permission === 'denied');
    btnWarehouseNotifications.title = permission === 'denied'
      ? 'El navegador bloqueó las notificaciones. Actívalas desde la configuración del sitio.'
      : getWarehouseNotificationPermissionLabel();
    btnWarehouseNotifications.innerHTML = permission === 'granted'
      ? '<i class="fa-solid fa-bell me-1" aria-hidden="true"></i><span>Notificaciones ON</span>'
      : '<i class="fa-regular fa-bell me-1" aria-hidden="true"></i><span>' + escapeHtml(getWarehouseNotificationPermissionLabel()) + '</span>';
  }

  async function requestWarehouseBrowserNotifications() {
    if (!supportsBrowserNotifications()) {
      await Swal.fire('No compatible', 'Este navegador no permite notificaciones del sistema para esta app.', 'info');
      updateWarehouseNotificationButton();
      return false;
    }

    if (Notification.permission === 'denied') {
      await Swal.fire('Notificaciones bloqueadas', 'El navegador bloqueó las notificaciones. Debes habilitarlas desde la configuración del sitio o del navegador.', 'info');
      updateWarehouseNotificationButton();
      return false;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    updateWarehouseNotificationButton();

    if (permission !== 'granted') {
      showScanToast('warning', 'Notificaciones no activadas', 'Seguirás viendo avisos dentro de la app.', { timeout: 3000 });
      return false;
    }

    const fcmOk = await registerWarehouseFcmToken({ silent: false });
    updateWarehouseNotificationButton();

    if (fcmOk) {
      showScanToast('success', 'Push activado', 'Bodega podrá recibir avisos del navegador cuando entren solicitudes.', { timeout: 3500 });
    } else {
      showScanToast('info', 'Notificaciones activas', 'Recibirás avisos mientras la app esté abierta. Revisa VAPID/FCM para push cerrado.', { timeout: 4200 });
    }

    playWarehouseNotificationSound();
    return true;
  }

  function playWarehouseNotificationSound() {
    // Usa Web Audio para evitar archivos de audio pesados.
    let ctx = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!scannerAudioContext) scannerAudioContext = new AudioCtx();
      ctx = scannerAudioContext;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const tones = [740, 980];
      tones.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (index * 0.09));
        gain.gain.setValueAtTime(0.0001, now + (index * 0.09));
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015 + (index * 0.09));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + (index * 0.09));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (index * 0.09));
        osc.stop(now + 0.14 + (index * 0.09));
      });
    } catch (_) {}

    if (navigator.vibrate) {
      try { navigator.vibrate([90, 40, 90]); } catch (_) {}
    }
  }

  function getWarehouseNotificationKey(req) {
    if (!req) return '';
    return String(req.id || req.requestId || req._notificationBody || '').trim();
  }

  function shouldNotifyWarehouseRequest(req) {
    const status = normalizeRequestStatus(req?.status || REQUEST_STATUSES.SENT);
    if (status !== REQUEST_STATUSES.SENT) return false;
    const key = getWarehouseNotificationKey(req);
    if (!key) return true;
    if (notifiedWarehouseRequestIds.has(key)) return false;
    notifiedWarehouseRequestIds.add(key);
    return true;
  }

  function showWarehouseBrowserNotification(req) {
    if (!supportsBrowserNotifications() || Notification.permission !== 'granted') return;
    const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
    const storeName = req.storeName || getStoreLabel(req.storeKey);
    const requestId = req.id || req.requestId || 'sin ID';
    const friendlyId = getFriendlyRequestCode(req);
    try {
      const notification = new Notification('Nueva solicitud a bodega', {
        body: storeName + ' envió ' + count + ' producto(s). Solicitud: ' + friendlyId,
        tag: 'trlista-' + requestId,
        requireInteraction: false
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        openWarehouseRequest(req).catch(err => console.error('No se pudo abrir solicitud desde notificación:', err));
      };
    } catch (err) {
      console.warn('No se pudo mostrar notificación del navegador:', err);
    }
  }

  function updateWarehouseInboxBadge(counts = warehouseInboxCounts) {
    warehouseInboxCounts = counts || warehouseInboxCounts;
    const pending = Number(warehouseInboxCounts.pending || 0);
    if (warehouseInboxBadge) {
      warehouseInboxBadge.textContent = pending > 99 ? '99+' : String(pending);
      warehouseInboxBadge.classList.toggle('d-none', pending <= 0);
    }

    if (warehouseInboxMeta && requiresWarehouseRequestContext() && !hasActiveWarehouseRequest()) {
      const review = Number(warehouseInboxCounts.review || 0);
      const dispatched = Number(warehouseInboxCounts.dispatched || 0);
      warehouseInboxMeta.textContent = 'Bandeja de solicitudes. Pendientes: ' + pending + ' · En revisión: ' + review + ' · Despachadas: ' + dispatched + '.';
    }
  }

  function calculateWarehouseRequestCounts(requests = []) {
    const counts = { pending: 0, review: 0, dispatched: 0, received: 0, total: requests.length };
    requests.forEach(req => {
      const status = normalizeRequestStatus(req.status || REQUEST_STATUSES.SENT);
      if (status === REQUEST_STATUSES.SENT) counts.pending += 1;
      else if (status === REQUEST_STATUSES.REVIEW || status === REQUEST_STATUSES.PARTIAL_DISPATCH) counts.review += 1;
      else if (status === REQUEST_STATUSES.DISPATCHED) counts.dispatched += 1;
      else if (status === REQUEST_STATUSES.RECEIVED) counts.received += 1;
    });
    return counts;
  }

  function notifyNewWarehouseRequest(req) {
    if (!req || !shouldNotifyWarehouseRequest(req)) return;
    const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
    const storeName = req.storeName || getStoreLabel(req.storeKey);
    const requestId = req.id || req.requestId || 'sin ID';
    const title = req._notificationTitle || 'Nueva solicitud recibida';
    const bodyText = req._notificationBody || (storeName + ' envió ' + count + ' producto(s). Solicitud: ' + getFriendlyRequestCode(req));

    showScanToast('success', title, bodyText, { timeout: 7000 });
    playWarehouseNotificationSound();
    showWarehouseBrowserNotification(req);
  }

  function startWarehouseInboxNotifications() {
    if (!canUseWarehouseTools()) return;
    if (warehouseRequestsUnsubscribe) {
      try { warehouseRequestsUnsubscribe(); } catch (_) {}
      warehouseRequestsUnsubscribe = null;
    }

    try {
      const db = getFirestoreDb();
      const query = db.collection('requests').limit(120);
      warehouseNotificationPrimed = false;
      knownWarehouseRequestIds = new Set();
      notifiedWarehouseRequestIds = new Set();

      warehouseRequestsUnsubscribe = query.onSnapshot((snap) => {
        const rows = snap.docs
          .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
          .sort((a, b) => String(b.submittedAt || b.createdAt || '').localeCompare(String(a.submittedAt || a.createdAt || '')));

        updateWarehouseInboxBadge(calculateWarehouseRequestCounts(rows));

        if (!warehouseNotificationPrimed) {
          rows.forEach(req => knownWarehouseRequestIds.add(String(req.id || req.requestId || '')));
          warehouseNotificationPrimed = true;
          return;
        }

        snap.docChanges().forEach(change => {
          const req = { id: change.doc.id, ...(change.doc.data() || {}) };
          const id = String(req.id || req.requestId || '');
          const isNew = change.type === 'added' && !knownWarehouseRequestIds.has(id);
          if (id) knownWarehouseRequestIds.add(id);
          if (isNew) notifyNewWarehouseRequest(req);
        });

        if (typeof refreshHistoryPicker === 'function') {
          refreshHistoryPicker().catch(err => console.warn('No se pudo refrescar calendario por notificación:', err));
        }
      }, (err) => {
        console.warn('No se pudo activar escucha de solicitudes:', err);
        showScanToast('warning', 'Bandeja sin escucha automática', 'Puedes seguir usando “Ver bandeja” para actualizar manualmente.', { timeout: 5000 });
      });
    } catch (err) {
      console.warn('No se pudo iniciar notificaciones de bodega:', err);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (warehouseRequestsUnsubscribe) {
      try { warehouseRequestsUnsubscribe(); } catch (_) {}
    }
  });

  function canDeleteRows() {
    return hasRole('admin', 'supervisor', 'operador');
  }

  function getRoleAccessLabel() {
    return currentUserEmail || currentUserRole || 'sin_acceso';
  }

  function getAssignedStoreLabel() {
    if (typeof getStoreLabel === 'function') {
      return getStoreLabel(currentUserStoreKey);
    }
    return currentUserStoreKey || 'tu sucursal';
  }

  function hasStoreRestriction() {
    return currentUserRole === 'operador' && !!currentUserStoreKey;
  }


  function getRequestStatusMeta(status) {
    const value = normalizeRequestStatus(status);
    return REQUEST_STATUS_META[value] || { label: value || 'Sin iniciar', badge: 'text-bg-secondary' };
  }

  function getRequestStatusLabel(status) {
    return getRequestStatusMeta(status).label;
  }

  function getRequestStatusBadgeClass(status) {
    return getRequestStatusMeta(status).badge;
  }

  function isRequestTerminalStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [REQUEST_STATUSES.DISPATCHED, REQUEST_STATUSES.RECEIVED, REQUEST_STATUSES.CANCELLED, REQUEST_STATUSES.MERGED].includes(value);
  }

  function getRequestDateKey(req) {
    return String(req?.requestDate || req?.submittedAt || req?.createdAt || '').slice(0, 10);
  }


  function getRequestStorePrefix(storeKey) {
    const key = String(storeKey || '').trim();
    if (key === 'lista_sexta_calle') return 'SXTA';
    if (key === 'lista_avenida_morazan') return 'AVM';
    if (key === 'lista_centro_comercial') return 'CC';
    if (key === '__all__') return 'TODAS';
    return normalizeRequestIdPart(key || 'GEN').slice(0, 6).toUpperCase();
  }

  function getRequestTypeLabel(reqOrVersion) {
    const version = typeof reqOrVersion === 'string'
      ? reqOrVersion
      : String(reqOrVersion?.versionKey || reqOrVersion?.version || 'base');
    return getVersionLabel(version || 'base');
  }

  function getFriendlyRequestCode(reqLike = {}) {
    const rawId = String(reqLike.id || reqLike.requestId || reqLike.request_id || '').trim();
    const storeKey = String(reqLike.storeKey || reqLike.destinationStoreKey || '').trim();
    const date = getRequestDateKey(reqLike) || String(rawId.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '').trim();
    const compactDate = date ? date.replace(/-/g, '') : '';
    const origin = String(reqLike.origin || '').toLowerCase();
    const version = String(reqLike.versionKey || reqLike.version || '').trim();
    const prefix = origin === 'warehouse'
      ? ('BOD-' + getRequestStorePrefix(storeKey))
      : getRequestStorePrefix(storeKey || rawId.split('__')[0]);
    if (compactDate) {
      const typeSuffix = version === 'traslado' || origin === 'warehouse' ? '-TR' : '';
      return prefix + '-' + compactDate + typeSuffix;
    }
    return rawId ? rawId.replace(/^lista_/i, '').replace(/__/g, ' · ').replace(/_/g, ' ') : 'Solicitud sin ID';
  }

  function getRequestDisplayTitle(reqLike = {}) {
    const origin = String(reqLike.origin || '').toLowerCase();
    const storeName = reqLike.destinationStoreName || reqLike.storeName || getStoreLabel(reqLike.destinationStoreKey || reqLike.storeKey);
    const typeLabel = getRequestTypeLabel(reqLike);
    if (origin === 'warehouse') {
      return 'Traslado Bodega → ' + storeName;
    }
    return 'Solicitud ' + getFriendlyRequestCode(reqLike) + ' · ' + typeLabel;
  }

  function getRequestDisplaySubtitle(reqLike = {}) {
    const storeName = reqLike.destinationStoreName || reqLike.storeName || getStoreLabel(reqLike.destinationStoreKey || reqLike.storeKey);
    const typeLabel = getRequestTypeLabel(reqLike);
    const date = getRequestDateKey(reqLike);
    const parts = [storeName, typeLabel];
    if (date) parts.push(date);
    return parts.filter(Boolean).join(' · ');
  }

  function isRequestSentStatus(status) {
    const value = normalizeRequestStatus(status, '');
    return [REQUEST_STATUSES.SENT, REQUEST_STATUSES.REVIEW, REQUEST_STATUSES.PARTIAL_DISPATCH, REQUEST_STATUSES.DISPATCHED, REQUEST_STATUSES.RECEIVED, REQUEST_STATUSES.CANCELLED, REQUEST_STATUSES.MERGED].includes(value);
  }

  function isRequestDraftStatus(status) {
    return normalizeRequestStatus(status, '') === REQUEST_STATUSES.DRAFT;
  }

  function getCurrentRequestIdForToday() {
    const day = typeof getTodayString === 'function' ? getTodayString() : null;
    if (!day || typeof getRequestId !== 'function') return null;
    return getRequestId(storeSelect.value, versionSelect.value, day);
  }

  function normalizeRequestIdPart(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'sin_valor';
  }

  function buildWarehouseCreatedRequestId(storeKey, versionKey, day = getTodayString()) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    return ['bodega', storeKey, versionKey || 'base', day, stamp]
      .map(normalizeRequestIdPart)
      .join('__');
  }

  function buildStoreOptionsHtml(selectedValue = '') {
    const options = Array.from(storeSelect?.options || [])
      .filter(option => option.value && option.value !== '__all__');
    return options.map(option => `
      <option value="${htmlAttrEscape(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${escapeHtml(option.textContent || option.label || option.value)}</option>
    `).join('');
  }

  function buildVersionOptionsHtml(selectedValue = 'base', optionsConfig = {}) {
    const includeProtected = !!optionsConfig.includeProtected;
    const onlyProtected = !!optionsConfig.onlyProtected;
    const options = Array.from(versionSelect?.options || [])
      .filter(option => {
        if (!option.value) return false;
        const protectedOption = option.value === 'traslado';
        if (onlyProtected) return protectedOption;
        return includeProtected || !protectedOption;
      });
    return options.map(option => `
      <option value="${htmlAttrEscape(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${escapeHtml(option.textContent || option.label || option.value)}</option>
    `).join('');
  }

  function buildRequestSummaryFromRecord(record = {}) {
    const meta = record?.meta || {};
    const items = Array.isArray(record?.items) ? record.items : [];
    const status = String(meta.request_status || meta.solicitud_status || '').trim().toLowerCase();
    const requestId = String(meta.request_id || '').trim() || getCurrentRequestIdForToday();
    const createdAt = meta.request_created_at || meta.createdAt || meta.updatedAt || null;
    const submittedAt = meta.request_submitted_at || meta.submittedAt || null;
    const dispatchedAt = meta.request_dispatched_at || meta.dispatchedAt || null;
    const cancelledAt = meta.request_cancelled_at || meta.cancelledAt || null;
    const mergedAt = meta.request_merged_at || meta.mergedAt || null;
    const mergedIntoRequestId = meta.merged_into_request_id || meta.mergedIntoRequestId || null;
    const receivedAt = meta.request_received_at || meta.receivedAt || null;
    const origin = meta.request_origin || meta.origin || null;

    if (status) {
      return {
        status,
        requestId,
        createdAt,
        submittedAt,
        dispatchedAt,
        cancelledAt,
        mergedAt,
        mergedIntoRequestId,
        receivedAt,
        origin,
        itemCount: Number(meta.request_item_count || items.length || 0),
        record
      };
    }

    if (items.length) {
      return {
        status: REQUEST_STATUSES.DRAFT,
        requestId,
        createdAt: meta.updatedAt || null,
        submittedAt: null,
        itemCount: items.length,
        record
      };
    }

    return {
      status: REQUEST_STATUSES.NONE,
      requestId: null,
      createdAt: null,
      submittedAt: null,
      itemCount: 0,
      record: null
    };
  }

  function isBranchRequestEditingLocked() {
    if (!isBranchOperator()) return false;
    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    return !isRequestDraftStatus(status);
  }

  function updateRequestFlowUI() {
    const isBranch = isBranchOperator();
    const warehouse = canUseWarehouseTools();
    const warehouseRequestMode = requiresWarehouseRequestContext();
    const warehouseHasActive = hasActiveWarehouseRequest();
    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    const sent = isRequestSentStatus(status);
    const draft = isRequestDraftStatus(status);
    const none = status === 'none' || !status;
    const itemCount = Number(requestFlowState?.itemCount || body?.rows?.length || 0);
    const requestId = requestFlowState?.requestId || getCurrentRequestIdForToday();

    if (requestFlowCard) requestFlowCard.classList.toggle('d-none', !isBranch);
    if (warehouseInboxCard) warehouseInboxCard.classList.toggle('d-none', !warehouse);

    if (requestStatusBadge) {
      requestStatusBadge.className = 'badge rounded-pill ' + getRequestStatusBadgeClass(status);
      requestStatusBadge.textContent = getRequestStatusLabel(status);
      requestStatusBadge.classList.toggle('d-none', none && !isBranch);
    }

    if (requestFlowTitle) {
      if (none) requestFlowTitle.textContent = 'Inicia una lista para esta sucursal.';
      else if (draft) requestFlowTitle.textContent = 'Lista en edición.';
      else if (status === REQUEST_STATUSES.DISPATCHED) requestFlowTitle.textContent = 'Solicitud despachada por bodega.';
      else if (status === REQUEST_STATUSES.RECEIVED) requestFlowTitle.textContent = 'Solicitud recibida.';
      else requestFlowTitle.textContent = 'Solicitud enviada a bodega.';
    }

    if (requestFlowMeta) {
      if (none) {
        requestFlowMeta.textContent = 'Presiona “Iniciar lista” para comenzar a llenar productos. Solo se permite una solicitud por día.';
      } else if (draft) {
        requestFlowMeta.textContent = 'Puedes guardar durante el proceso. Cuando termines, usa “Finalizar y enviar”. Items actuales: ' + itemCount + '.';
      } else {
        const sentText = requestFlowState?.submittedAt ? formatSV(requestFlowState.submittedAt) : 'fecha no registrada';
        const extraParts = [];
        if (requestFlowState?.dispatchedAt) extraParts.push('Despachada: ' + formatSV(requestFlowState.dispatchedAt));
        if (requestFlowState?.receivedAt) extraParts.push('Recibida: ' + formatSV(requestFlowState.receivedAt));
        if (requestFlowState?.cancelledAt) extraParts.push('Cancelada: ' + formatSV(requestFlowState.cancelledAt));
        if (requestFlowState?.mergedIntoRequestId) extraParts.push('Fusionada con: ' + getFriendlyRequestCode({ requestId: requestFlowState.mergedIntoRequestId, id: requestFlowState.mergedIntoRequestId, storeKey: storeSelect?.value, versionKey: versionSelect?.value }));
        requestFlowMeta.textContent = getFriendlyRequestCode(requestFlowState?.record || { requestId, storeKey: storeSelect?.value, versionKey: versionSelect?.value, submittedAt: requestFlowState?.submittedAt }) + ' · Enviada: ' + sentText + ' · Items: ' + itemCount + (extraParts.length ? ' · ' + extraParts.join(' · ') : '') + '.';
      }
    }

    if (btnStartList) btnStartList.classList.toggle('d-none', !isBranch || !none);
    if (btnSubmitRequest) {
      btnSubmitRequest.classList.toggle('d-none', !isBranch || !draft);
      btnSubmitRequest.disabled = !draft || isEditingLocked();
      btnSubmitRequest.setAttribute('aria-disabled', String(btnSubmitRequest.disabled));
    }
    if (btnViewCurrentRequest) btnViewCurrentRequest.classList.toggle('d-none', !isBranch || !(sent || draft));
    if (btnConfirmRequestReceived) {
      const showReceive = isBranch && status === REQUEST_STATUSES.DISPATCHED && !!requestId;
      btnConfirmRequestReceived.classList.toggle('d-none', !showReceive);
      btnConfirmRequestReceived.disabled = !showReceive;
      btnConfirmRequestReceived.setAttribute('aria-disabled', String(btnConfirmRequestReceived.disabled));
    }
    if (btnViewRequestHistory) btnViewRequestHistory.classList.toggle('d-none', !isBranch);

    const checklistCard = document.querySelector('.table-checklist-shell');
    const searchShell = document.querySelector('.checklist-search-shell');
    const shouldShowEditor = isBranch ? draft : (!warehouseRequestMode || warehouseHasActive);
    if (checklistCard) checklistCard.classList.toggle('d-none', !shouldShowEditor);
    if (searchShell) searchShell.classList.toggle('d-none', !shouldShowEditor);
    if (warehouseIdleNotice) warehouseIdleNotice.classList.toggle('d-none', !(warehouseRequestMode && !warehouseHasActive));

    if (isBranch) {
      if (btnSave) btnSave.disabled = !draft;
      if (btnFabSave) btnFabSave.disabled = !draft;
      if (btnClear) btnClear.disabled = !draft;
      if (searchInput) searchInput.disabled = !draft;
      if (btnScan) btnScan.disabled = !draft;
      if (btnSearchModeToggle) btnSearchModeToggle.disabled = !draft;
    }

    if (warehouseInboxMeta && warehouse) {
      if (warehouseRequestMode && warehouseHasActive) {
        const req = activeWarehouseRequest || {};
        const dirtyText = hasUnsavedActiveWarehouseChanges() ? ' · Cambios sin guardar' : '';
        warehouseInboxMeta.textContent = 'Solicitud activa: ' + getFriendlyRequestCode(req) + ' · ' + getRequestDisplaySubtitle(req) + ' · ' + getRequestStatusLabel(req.status || 'en_revision') + dirtyText + '.';
      } else {
        updateWarehouseInboxBadge();
      }
    }

    if (btnCleanUnreviewed) {
      const canClean = canWarehouseEditActiveRequest();
      btnCleanUnreviewed.classList.toggle('d-none', !canClean);
      btnCleanUnreviewed.disabled = !canClean || isEditingLocked() || body.rows.length === 0;
      btnCleanUnreviewed.setAttribute('aria-disabled', String(btnCleanUnreviewed.disabled));
    }
    if (btnCreateWarehouseRequest) {
      const showCreateWarehouse = canUseWarehouseTools();
      btnCreateWarehouseRequest.classList.toggle('d-none', !showCreateWarehouse);
      btnCreateWarehouseRequest.disabled = !showCreateWarehouse;
      btnCreateWarehouseRequest.setAttribute('aria-disabled', String(btnCreateWarehouseRequest.disabled));
    }
    if (btnCloseWarehouseRequest) {
      const showClose = warehouseRequestMode && warehouseHasActive;
      btnCloseWarehouseRequest.classList.toggle('d-none', !showClose);
      btnCloseWarehouseRequest.disabled = !showClose;
      btnCloseWarehouseRequest.setAttribute('aria-disabled', String(btnCloseWarehouseRequest.disabled));
    }
    if (btnMarkRequestDispatched) {
      const activeStatus = normalizeRequestStatus(activeWarehouseRequest?.status || '', '');
      const showDispatch = canWarehouseEditActiveRequest() && !!activeWarehouseRequest?.requestId && !isRequestTerminalStatus(activeStatus);
      btnMarkRequestDispatched.classList.toggle('d-none', !showDispatch);
      btnMarkRequestDispatched.disabled = !showDispatch || isEditingLocked();
      btnMarkRequestDispatched.setAttribute('aria-disabled', String(btnMarkRequestDispatched.disabled));
    }
    if (btnCancelWarehouseRequest) {
      const activeStatus = normalizeRequestStatus(activeWarehouseRequest?.status || '', '');
      const showCancel = canWarehouseEditActiveRequest() && !!activeWarehouseRequest?.requestId && !isRequestTerminalStatus(activeStatus);
      btnCancelWarehouseRequest.classList.toggle('d-none', !showCancel);
      btnCancelWarehouseRequest.disabled = !showCancel || isEditingLocked();
      btnCancelWarehouseRequest.setAttribute('aria-disabled', String(btnCancelWarehouseRequest.disabled));
    }
    if (btnMergeWarehouseRequests) {
      const showMerge = canUseWarehouseTools();
      btnMergeWarehouseRequests.classList.toggle('d-none', !showMerge);
      btnMergeWarehouseRequests.disabled = !showMerge;
      btnMergeWarehouseRequests.setAttribute('aria-disabled', String(btnMergeWarehouseRequests.disabled));
    }

    if (requiresWarehouseRequestContext()) {
      const disabledBecauseActive = warehouseHasActive;
      if (storeSelect) {
        storeSelect.disabled = disabledBecauseActive;
        storeSelect.title = disabledBecauseActive ? 'Cierra la solicitud activa antes de cambiar el filtro de tienda.' : 'Filtro de tienda para la bandeja de bodega.';
      }
      if (versionSelect) {
        versionSelect.disabled = disabledBecauseActive;
        versionSelect.title = disabledBecauseActive ? 'Cierra la solicitud activa antes de cambiar la versión.' : 'Filtro de versión para la bandeja de bodega.';
      }
    }

    updateBulkSelectionUI();
    refreshMobileChecklistCards();
  }

  async function showRequestDetail(requestLike) {
    const req = requestLike || requestFlowState || {};
    const items = Array.isArray(req.items)
      ? req.items
      : Array.isArray(req.record?.items)
        ? req.record.items
        : [];
    const requestId = req.id || req.requestId || req.request_id || requestFlowState?.requestId || 'sin ID';
    const status = req.status || req.request_status || requestFlowState?.status || 'none';
    const storeName = req.storeName || req.tienda || getStoreLabel(req.storeKey || storeSelect.value);
    const submittedAt = req.submittedAt || requestFlowState?.submittedAt || req.request_submitted_at || null;
    const dispatchedAt = req.dispatchedAt || requestFlowState?.dispatchedAt || req.request_dispatched_at || null;
    const cancelledAt = req.cancelledAt || requestFlowState?.cancelledAt || req.request_cancelled_at || null;
    const mergedAt = req.mergedAt || requestFlowState?.mergedAt || req.request_merged_at || null;
    const mergedIntoRequestId = req.mergedIntoRequestId || requestFlowState?.mergedIntoRequestId || req.merged_into_request_id || null;
    const receivedAt = req.receivedAt || requestFlowState?.receivedAt || req.request_received_at || null;
    const origin = req.origin || req.request_origin || null;
    const destinationStoreName = req.destinationStoreName || req.destino || null;

    const canConfirmReceivedFromDetail = isBranchOperator() && normalizeRequestStatus(status) === REQUEST_STATUSES.DISPATCHED && !!requestId;

    const rowsHtml = items.length
      ? items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(item.nombre || item.name || '')}</td>
            <td>${escapeHtml(item.codigoInv || item.inventoryCode || '')}</td>
            <td>${escapeHtml(item.bodega || item.warehouse || '')}</td>
            <td class="text-end">${escapeHtml(item.cantidad || item.quantity || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" class="text-center text-muted">Sin items.</td></tr>';

    const detailResult = await Swal.fire({
      title: 'Detalle de solicitud',
      width: 920,
      html: `
        <div class="text-start small">
          <div class="mb-2"><strong>Solicitud:</strong> ${escapeHtml(getFriendlyRequestCode(req))}</div>
          <div class="mb-2"><strong>Tienda:</strong> ${escapeHtml(storeName)}</div>
          ${origin === 'warehouse' ? `<div class="mb-2"><strong>Origen:</strong> Bodega${destinationStoreName ? ' · Destino: ' + escapeHtml(destinationStoreName) : ''}</div>` : ''}
          <div class="mb-2"><strong>Estado:</strong> ${escapeHtml(getRequestStatusLabel(status))}</div>
          ${submittedAt ? `<div class="mb-2"><strong>Solicitada:</strong> ${escapeHtml(formatSV(submittedAt))}</div>` : ''}
          ${dispatchedAt ? `<div class="mb-2"><strong>Despachada:</strong> ${escapeHtml(formatSV(dispatchedAt))}</div>` : ''}
          ${receivedAt ? `<div class="mb-2"><strong>Recibida:</strong> ${escapeHtml(formatSV(receivedAt))}</div>` : ''}
          ${cancelledAt ? `<div class="mb-2"><strong>Cancelada:</strong> ${escapeHtml(formatSV(cancelledAt))}</div>` : ''}
          ${mergedIntoRequestId ? `<div class="mb-2"><strong>Fusionada con:</strong> ${escapeHtml(getFriendlyRequestCode({ requestId: mergedIntoRequestId, id: mergedIntoRequestId, storeKey: req.storeKey, versionKey: req.versionKey, requestDate: String(mergedIntoRequestId).match(/\d{4}-\d{2}-\d{2}/)?.[0] || getRequestDateKey(req) }))}${mergedAt ? ' · ' + escapeHtml(formatSV(mergedAt)) : ''}</div>` : ''}
          <div class="mb-3"><strong>Enviada:</strong> ${escapeHtml(submittedAt ? formatSV(submittedAt) : 'No enviada')}</div>
          <div class="table-responsive request-detail-table-wrap">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr><th>#</th><th>Producto</th><th>Cód. inv.</th><th>Bodega</th><th class="text-end">Cant.</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `,
      confirmButtonText: canConfirmReceivedFromDetail ? 'Confirmar recibido' : 'Cerrar',
      showCancelButton: canConfirmReceivedFromDetail,
      cancelButtonText: 'Cerrar'
    });

    if (canConfirmReceivedFromDetail && detailResult.isConfirmed) {
      await confirmBranchRequestReceived({ requestId, status }, { skipPrompt: true });
    }
  }


  function getComputedDispatchStatus() {
    const rows = [...body.getElementsByTagName('tr')];
    if (!rows.length) return normalizeRequestStatus(activeWarehouseRequest?.status || REQUEST_STATUSES.REVIEW);
    const dispatchedCount = rows.filter(tr => !!getDispatchButton(tr)?.classList.contains('on')).length;
    if (dispatchedCount <= 0) return REQUEST_STATUSES.REVIEW;
    if (dispatchedCount >= rows.length) return REQUEST_STATUSES.DISPATCHED;
    return REQUEST_STATUSES.PARTIAL_DISPATCH;
  }

  function updateActiveRequestDispatchVisualStatus() {
    if (!activeWarehouseRequest?.requestId || !canUseWarehouseTools()) return;
    const currentStatus = normalizeRequestStatus(activeWarehouseRequest.status || REQUEST_STATUSES.REVIEW);
    if (isRequestTerminalStatus(currentStatus)) return;
    const nextStatus = getComputedDispatchStatus();
    if (nextStatus === REQUEST_STATUSES.DISPATCHED) {
      // No cerrar automáticamente la solicitud completa; el botón "Marcar despachada" mantiene el cierre formal.
      activeWarehouseRequest.status = REQUEST_STATUSES.PARTIAL_DISPATCH;
    } else {
      activeWarehouseRequest.status = nextStatus;
    }
    updateRequestFlowUI();
  }

  async function syncActiveWarehouseRequest(statusOverride = null) {
    if (!activeWarehouseRequest || !canUseWarehouseTools()) return;

    const rows = [...body.getElementsByTagName('tr')];
    const items = rows.map(buildChecklistItemFromRow);
    let status = statusOverride || activeWarehouseRequest.status || 'en_revision';
    if (!statusOverride && !isRequestTerminalStatus(status)) {
      const computed = getComputedDispatchStatus();
      status = computed === REQUEST_STATUSES.DISPATCHED ? REQUEST_STATUSES.PARTIAL_DISPATCH : computed;
    }
    const requestId = activeWarehouseRequest.requestId;
    if (!requestId) return;

    const payload = {
      ...activeWarehouseRequest.original,
      requestId,
      storeKey: storeSelect.value,
      storeName: storeSelect.options[storeSelect.selectedIndex]?.text || getStoreLabel(storeSelect.value),
      versionKey: versionSelect.value,
      versionLabel: getVersionLabel(versionSelect.value),
      requestDate: getTargetChecklistDate(),
      status,
      itemCount: items.length,
      dispatchedAt: activeWarehouseRequest.original?.dispatchedAt || null,
      dispatchedByEmail: activeWarehouseRequest.original?.dispatchedByEmail || null,
      cancelledAt: activeWarehouseRequest.original?.cancelledAt || null,
      cancelledByEmail: activeWarehouseRequest.original?.cancelledByEmail || null,
      mergedAt: activeWarehouseRequest.original?.mergedAt || null,
      receivedAt: activeWarehouseRequest.original?.receivedAt || null,
      receivedByEmail: activeWarehouseRequest.original?.receivedByEmail || null,
      receivedByUid: activeWarehouseRequest.original?.receivedByUid || null,
      origin: activeWarehouseRequest.original?.origin || null,
      destinationStoreKey: activeWarehouseRequest.original?.destinationStoreKey || null,
      destinationStoreName: activeWarehouseRequest.original?.destinationStoreName || null,
      mergedIntoRequestId: activeWarehouseRequest.original?.mergedIntoRequestId || null,
      items,
      lastWarehouseUpdateAt: new Date().toISOString(),
      lastWarehouseUpdateByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
      lastWarehouseUpdateByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
    };

    await saveRequestToFirestore(requestId, payload);
    activeWarehouseRequest = { ...activeWarehouseRequest, status, original: payload };
    rememberActiveWarehouseSnapshot();
  }

  async function openWarehouseRequest(requestLike) {
    if (!canUseWarehouseTools()) return showRequestDetail(requestLike);
    if (!requestLike) return;

    const requestId = requestLike.id || requestLike.requestId;
    const storeKey = requestLike.storeKey;
    const versionKey = requestLike.versionKey || 'base';
    const requestDate = requestLike.requestDate || getTodayString();
    if (!requestId || !storeKey) {
      await Swal.fire('Solicitud incompleta', 'No se pudo abrir la solicitud porque falta tienda o identificador.', 'error');
      return;
    }

    if (activeWarehouseRequest?.requestId && activeWarehouseRequest.requestId !== requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('abrir otra solicitud');
      if (!canLeave) return;
    }

    await withLoading('Abriendo solicitud para revisión...', async () => {
      if (storeSelect && Array.from(storeSelect.options).some(option => option.value === storeKey)) {
        storeSelect.value = storeKey;
      }
      if (versionSelect && Array.from(versionSelect.options).some(option => option.value === versionKey)) {
        versionSelect.value = versionKey;
      }
      updateStoreUI();
      currentViewDate = requestDate;
      historicalUnlockEnabled = true;
      protectedVersionUnlockEnabled = canUseProtectedLists() || !isProtectedVersionSelected();
      activeWarehouseRequest = {
        requestId,
        status: requestLike.status || 'enviado',
        original: { ...requestLike }
      };

      body.innerHTML = '';
      resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
      clearBulkSelection();
      clearHistoricalSelection();

      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId, requestDate);
      // En el flujo nuevo la solicitud es la fuente principal. El histórico legacy queda como respaldo.
      const sourceItems = Array.isArray(requestLike.items)
        ? requestLike.items
        : ((record && Array.isArray(record.items) && record.items.length) ? record.items : []);
      applyChecklistMeta(record?.meta || {});
      renderChecklistItems(sourceItems);
      lastUpdateISO = record?.meta?.updatedAt || requestLike.lastWarehouseUpdateAt || requestLike.submittedAt || null;
      updateLastSavedText(lastUpdateISO);

      if (!isRequestTerminalStatus(requestLike.status || REQUEST_STATUSES.SENT) && normalizeRequestStatus(requestLike.status || REQUEST_STATUSES.SENT) === REQUEST_STATUSES.SENT) {
        await updateRequestStatus(requestId, REQUEST_STATUSES.REVIEW, {
          reviewStartedAt: new Date().toISOString(),
          reviewStartedByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
        });
        activeWarehouseRequest.status = REQUEST_STATUSES.REVIEW;
      }

      await refreshHistoryPicker();
      rememberActiveWarehouseSnapshot();
      resetAutoSaveBaseline();
      setHistoricalViewMode(false);
      updateRequestFlowUI();
      applyListSearchFilter();
    });
  }

  function buildRequestListHtml(requests = [], options = {}) {
    const filterSummary = String(options.filterSummary || '').trim();
    const renderRows = (rows = []) => rows.map(req => {
      const status = req.status || 'enviado';
      const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
      const dt = req.submittedAt || req.createdAt || '';
      const friendlyCode = getFriendlyRequestCode(req);
      const title = getRequestDisplayTitle(req);
      const subtitle = getRequestDisplaySubtitle(req);
      const dispatchedText = req.dispatchedAt ? 'Despachada: ' + formatSV(req.dispatchedAt) : '';
      const mergedText = req.mergedIntoRequestId ? 'Fusionada con: ' + getFriendlyRequestCode({ requestId: req.mergedIntoRequestId, id: req.mergedIntoRequestId, storeKey: req.storeKey, versionKey: req.versionKey, requestDate: String(req.mergedIntoRequestId).match(/\d{4}-\d{2}-\d{2}/)?.[0] || getRequestDateKey(req) }) : '';
      const cancelledText = req.cancelledAt ? 'Cancelada: ' + formatSV(req.cancelledAt) : '';
      const receivedText = req.receivedAt ? 'Recibida: ' + formatSV(req.receivedAt) : '';
      const originText = req.origin === 'warehouse' ? 'Origen: Bodega' : '';
      const extraText = dispatchedText || receivedText || mergedText || cancelledText || originText;
      return `
        <button type="button" class="request-list-row" data-request-id="${htmlAttrEscape(req.id || req.requestId || '')}" title="${htmlAttrEscape(title)}">
          <span class="request-list-main">
            <strong>${escapeHtml(friendlyCode)}</strong>
            <small>${escapeHtml(subtitle)} · ${count} item(s)${extraText ? ' · ' + escapeHtml(extraText) : ''}</small>
          </span>
          <span class="request-list-side">
            <span class="badge rounded-pill ${getRequestStatusBadgeClass(status)}">${escapeHtml(getRequestStatusLabel(status))}</span>
            <small>${escapeHtml(dt ? formatSV(dt) : 'Sin fecha')}</small>
          </span>
        </button>
      `;
    }).join('');

    const sections = Array.isArray(options.sections) ? options.sections.filter(section => Array.isArray(section.rows) && section.rows.length) : [];
    const summaryHtml = filterSummary ? `<div class="request-filter-summary text-start mb-3"><i class="fa-solid fa-filter me-1" aria-hidden="true"></i>${escapeHtml(filterSummary)}</div>` : '';

    if (sections.length) {
      return `
        ${summaryHtml}
        <div class="request-list-modal text-start">
          ${sections.map(section => `
            <div class="request-list-section mb-3">
              <div class="d-flex justify-content-between align-items-center px-1 mb-2">
                <strong class="small text-uppercase text-muted">${escapeHtml(section.title || 'Solicitudes')}</strong>
                <span class="badge text-bg-light border">${section.rows.length}</span>
              </div>
              ${renderRows(section.rows)}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!requests.length) {
      return summaryHtml + '<div class="text-muted small text-start">No hay solicitudes para mostrar.</div>';
    }

    return `
      ${summaryHtml}
      <div class="request-list-modal text-start">
        ${renderRows(requests)}
      </div>
    `;
  }

  async function openRequestsList(options = {}) {
    const title = options.title || (canUseWarehouseTools() ? 'Solicitudes recibidas' : 'Mis solicitudes');
    let requests = await listRequestsForCurrentAccess({ limit: 120 });
    let requestListSections = null;
    if (requiresWarehouseRequestContext()) {
      const selectedStoreFilter = String(storeSelect?.value || '').trim();
      const selectedVersionFilter = String(versionSelect?.value || '').trim();
      if (selectedStoreFilter && selectedStoreFilter !== '__all__') {
        requests = requests.filter(req => String(req.storeKey || '') === selectedStoreFilter);
      }
      if (selectedVersionFilter && selectedVersionFilter !== '__all__') {
        requests = requests.filter(req => String(req.versionKey || 'base') === selectedVersionFilter);
      }

      const today = (typeof getTodayString === 'function') ? getTodayString() : '';
      const selectedDate = currentViewDate || today;

      if (selectedDate) {
        if (!currentViewDate && selectedDate === today) {
          const pendingEarlier = requests.filter(req => {
            const reqDate = getRequestDateKey(req);
            return reqDate && reqDate < selectedDate && !isRequestTerminalStatus(req.status || 'enviado');
          });
          const todayRequests = requests.filter(req => getRequestDateKey(req) === selectedDate);
          requests = [...pendingEarlier, ...todayRequests];
          requestListSections = [
            { title: 'Pendientes anteriores', rows: pendingEarlier },
            { title: 'Solicitudes de hoy', rows: todayRequests }
          ];
        } else {
          requests = requests.filter(req => getRequestDateKey(req) === selectedDate);
          requestListSections = [{ title: 'Solicitudes del ' + selectedDate, rows: requests }];
        }
      }
    }
    const filterSummary = requiresWarehouseRequestContext()
      ? [
          'Tienda: ' + (storeSelect?.value === '__all__' ? 'Todas las sucursales' : getStoreLabel(storeSelect?.value)),
          'Tipo: ' + (versionSelect?.value === '__all__' ? 'Todos' : getVersionLabel(versionSelect?.value || 'base')),
          'Vista: ' + (currentViewDate ? ('Fecha ' + currentViewDate) : 'Hoy + pendientes anteriores')
        ].join(' · ')
      : '';
    const result = await Swal.fire({
      title,
      width: 980,
      html: buildRequestListHtml(requests, { sections: requestListSections, filterSummary }),
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: 'Cerrar',
      didOpen: (popup) => {
        popup.querySelectorAll('[data-request-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const requestId = String(btn.getAttribute('data-request-id') || '').trim();
            if (!requestId) return;
            const found = requests.find(req => String(req.id || req.requestId || '') === requestId) || await loadRequestFromFirestore(requestId);
            if (canUseWarehouseTools()) {
              await openWarehouseRequest(found);
              Swal.close();
            } else {
              await showRequestDetail(found);
            }
          });
        });
      }
    });
    return result;
  }

  function isStoreAllowedForCurrentUser(storeKey) {
    if (!hasStoreRestriction()) return true;
    return String(storeKey || '').trim() === currentUserStoreKey;
  }

  async function showStoreDeniedAlert(actionLabel = 'usar esta sucursal') {
    await Swal.fire(
      'Sucursal restringida',
      'Tu usuario solo puede ' + actionLabel + ' de ' + getAssignedStoreLabel() + '.',
      'info'
    );
  }

  async function enforceCurrentStoreAccess(actionLabel = 'usar esta sucursal') {
    if (!storeSelect || isStoreAllowedForCurrentUser(storeSelect.value)) return true;

    const previousValue = storeSelect.value;
    if (currentUserStoreKey && Array.from(storeSelect.options).some(option => option.value === currentUserStoreKey)) {
      storeSelect.value = currentUserStoreKey;
    }

    if (previousValue !== storeSelect.value) {
      updateStoreUI();
    }

    await showStoreDeniedAlert(actionLabel);
    return false;
  }

  async function showRoleDeniedAlert(actionLabel = 'usar esta función', allowedLabel = 'usuarios autorizados') {
    await Swal.fire(
      'Acceso restringido',
      'Tu usuario (' + getRoleAccessLabel() + ') no tiene permisos para ' + actionLabel + '. Esta acción está disponible solo para ' + allowedLabel + '.',
      'info'
    );
  }

  function restrictOperatorStoreAccess() {
    if (!hasStoreRestriction() || !storeSelect) return;

    const allowedOption = Array.from(storeSelect.options).find(option => option.value === currentUserStoreKey);
    if (!allowedOption) return;

    Array.from(storeSelect.options).forEach(option => {
      const isAllowed = option.value === currentUserStoreKey;
      option.hidden = !isAllowed;
      option.disabled = !isAllowed;
      option.selected = isAllowed;
    });

    storeSelect.value = currentUserStoreKey;
    storeSelect.disabled = true;
    storeSelect.setAttribute('aria-disabled', 'true');
    storeSelect.dataset.lockedStore = currentUserStoreKey;
    storeSelect.dataset.allowedStore = currentUserStoreKey;
    storeSelect.title = 'Esta cuenta está limitada a ' + getAssignedStoreLabel() + '.';

    const label = document.querySelector('label[for="storeSelect"]');
    if (label && !label.querySelector('.store-lock-hint')) {
      const hint = document.createElement('span');
      hint.className = 'store-lock-hint';
      hint.textContent = ' · fija por usuario';
      label.appendChild(hint);
    }
  }

  const COL_INDEX = {
    bulkSelect: 0,
    rowNumber: 1,
    barcode: 2,
    name: 3,
    inventoryCode: 4,
    warehouse: 5,
    quantity: 6,
    actions: 7
  };

  const MOBILE_BREAKPOINT = 767.98;
  const ROW_CELL_LABELS = {
    [COL_INDEX.bulkSelect]: 'Seleccionar',
    [COL_INDEX.rowNumber]: '#',
    [COL_INDEX.barcode]: 'Cód. barras',
    [COL_INDEX.name]: 'Producto',
    [COL_INDEX.inventoryCode]: 'Cód. inv.',
    [COL_INDEX.warehouse]: 'Bodega',
    [COL_INDEX.quantity]: 'Cantidad',
    [COL_INDEX.actions]: 'Acciones'
  };

  const sharedUtils = window.TRUtils || {};
  const htmlAttrEscape = sharedUtils.htmlAttrEscape || ((value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '&quot;');
  });
  const escapeHtml = sharedUtils.escapeHtml || ((value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  });
  const normalizeMatchValue = sharedUtils.normalizeText || ((value) => String(value || '').trim().toLowerCase());
  const hasUsefulCode = sharedUtils.hasUsefulCode || ((value) => {
    const normalized = normalizeMatchValue(value);
    return !!normalized && normalized !== 'n/a' && normalized !== 'na' && normalized !== 'sin código' && normalized !== 'sin codigo';
  });
  const setToggleState = sharedUtils.setToggleState || ((button, shouldBeOn) => {
    if (!button) return;
    button.classList.toggle('on', !!shouldBeOn);
    button.classList.toggle('off', !shouldBeOn);
  });
  const toggleBtn = sharedUtils.toggleButtonState || ((button) => {
    if (!button) return;
    setToggleState(button, !button.classList.contains('on'));
  });

  const checklistHelpers = window.TRChecklistHelpers || {};
  const normalizeListSearchTerm = checklistHelpers.normalizeListSearchTerm || ((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase());
  const buildRowSearchText = (row) => (checklistHelpers.buildRowSearchText
    ? checklistHelpers.buildRowSearchText(row, COL_INDEX)
    : [
        row?.cells?.[COL_INDEX.barcode]?.innerText || '',
        row?.cells?.[COL_INDEX.name]?.innerText || '',
        row?.cells?.[COL_INDEX.inventoryCode]?.innerText || '',
        row?.cells?.[COL_INDEX.warehouse]?.innerText || '',
        row?.querySelector('.qty')?.value || ''
      ].join(' ').toLowerCase());
  const getReviewButton = checklistHelpers.getReviewButton || ((row) => row?.querySelector('.btn-toggle-review') || null);
  const getDispatchButton = checklistHelpers.getDispatchButton || ((row) => row?.querySelector('.btn-toggle-dispatch') || null);
  const getMoveButton = checklistHelpers.getMoveButton || ((row) => row?.querySelector('.btn-move-list') || null);
  const getDeleteButton = checklistHelpers.getDeleteButton || ((row) => row?.querySelector('.btn-delete-row') || null);
  const buildChecklistItemFromRow = (row) => (checklistHelpers.buildChecklistItemFromRow
    ? checklistHelpers.buildChecklistItemFromRow(row, COL_INDEX)
    : {
        codigo_barras: row?.cells?.[COL_INDEX.barcode]?.innerText?.trim?.() || '',
        nombre: row?.cells?.[COL_INDEX.name]?.innerText?.trim?.() || '',
        codigo_inventario: row?.cells?.[COL_INDEX.inventoryCode]?.innerText?.trim?.() || '',
        bodega: row?.cells?.[COL_INDEX.warehouse]?.innerText?.trim?.() || '',
        cantidad: (row?.querySelector('.qty')?.value || '').trim(),
        revisado: getReviewButton(row) ? getReviewButton(row).classList.contains('on') : false,
        despachado: getDispatchButton(row) ? getDispatchButton(row).classList.contains('on') : false
      });
  const buildItemFromCatalogRow = checklistHelpers.buildItemFromCatalogRow || ((row, fallbackCode = '') => ({
    codigo_barras: row?.[3] || fallbackCode || '',
    nombre: row?.[0] || '',
    codigo_inventario: row?.[1] || 'N/A',
    bodega: row?.[2] || '',
    cantidad: '',
    revisado: false,
    despachado: false
  }));
  const itemsMatch = checklistHelpers.itemsMatch || ((itemA, itemB) => {
    const barcodeA = normalizeMatchValue(itemA?.codigo_barras);
    const barcodeB = normalizeMatchValue(itemB?.codigo_barras);
    const inventoryA = normalizeMatchValue(itemA?.codigo_inventario);
    const inventoryB = normalizeMatchValue(itemB?.codigo_inventario);

    if (hasUsefulCode(barcodeA) && hasUsefulCode(barcodeB) && barcodeA === barcodeB) return true;
    if (hasUsefulCode(inventoryA) && hasUsefulCode(inventoryB) && inventoryA === inventoryB) return true;
    return false;
  });
  const findMatchingItemInArray = checklistHelpers.findMatchingItemInArray || ((items, item) => (items || []).find((existingItem) => itemsMatch(existingItem, item)) || null);



  function setLoadingState(isLoading, message = 'Cargando...') {
    if (!appLoadingOverlay) return;

    if (isLoading) {
      loadingCounter += 1;
      if (appLoadingText) {
        appLoadingText.textContent = message || 'Cargando...';
      }
      appLoadingOverlay.classList.remove('d-none');
      appLoadingOverlay.setAttribute('aria-hidden', 'false');
      return;
    }

    loadingCounter = Math.max(0, loadingCounter - 1);

    if (loadingCounter === 0) {
      appLoadingOverlay.classList.add('d-none');
      appLoadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  async function withLoading(message, task) {
    setLoadingState(true, message);
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

    try {
      return await task();
    } finally {
      setLoadingState(false);
    }
  }

  function setToolbarButtonContent(btn, iconClassName, label) {
    if (!btn) return;
    btn.innerHTML = `
      <i class="${iconClassName}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
    `;
  }

  function closeMoreActionsMenu() {
    if (moreActionsMenu?.hasAttribute('open')) {
      moreActionsMenu.removeAttribute('open');
    }
  }

  function setMobileFabOpen(shouldOpen) {
    if (!mobileFabToggle || !mobileFabMenu || !mobileFabBackdrop) return;
    const isOpen = !!shouldOpen;
    mobileFabMenu.classList.toggle('d-none', !isOpen);
    mobileFabBackdrop.classList.toggle('d-none', !isOpen);
    mobileFabMenu.setAttribute('aria-hidden', String(!isOpen));
    mobileFabToggle.setAttribute('aria-expanded', String(isOpen));
    mobileFabToggle.closest('.mobile-fab-shell')?.classList.toggle('is-open', isOpen);
  }

  function closeMobileFab() {
    setMobileFabOpen(false);
  }


function getTableRows() {
  return [...body.querySelectorAll('tr')];
}


function ensureRowDomId(tr) {
  if (!tr) return '';
  if (!tr.dataset.rowId) {
    rowDomIdCounter += 1;
    tr.dataset.rowId = 'row-' + rowDomIdCounter;
  }
  return tr.dataset.rowId;
}

function getMobileCardForRow(tr) {
  const rowId = ensureRowDomId(tr);
  if (!rowId || !mobileChecklistCards) return null;
  return mobileChecklistCards.querySelector('[data-row-id="' + rowId + '"]');
}

function revealRowForLocate(tr) {
  if (!tr) return;
  if (tr.classList.contains('table-row-hidden-by-search')) {
    listSearchTerm = '';
    if (searchInput && primarySearchMode === 'list') {
      searchInput.value = '';
    }
    applyListSearchFilter();
  }
}

function rowMatchesCurrentListSearch(tr) {
  if (!listSearchTerm) return true;
  return buildRowSearchText(tr).includes(listSearchTerm);
}

function findExistingRowByCode(code) {
  const normalizedCode = normalizeMatchValue(code);
  if (!hasUsefulCode(normalizedCode)) return null;

  return getTableRows().find(tr => {
    const rowBarcode = normalizeMatchValue(tr?.cells?.[COL_INDEX.barcode]?.innerText || '');
    const rowInventoryCode = normalizeMatchValue(tr?.cells?.[COL_INDEX.inventoryCode]?.innerText || '');

    return (
      (hasUsefulCode(rowBarcode) && rowBarcode === normalizedCode) ||
      (hasUsefulCode(rowInventoryCode) && rowInventoryCode === normalizedCode)
    );
  }) || null;
}

async function handleScannedOrImportedCode(code) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return false;

  if (searchInput) {
    searchInput.value = normalizedCode;
  }

  showScanToast('info', 'Código leído', normalizedCode, { timeout: 1800 });

  const existingRow = findExistingRowByCode(normalizedCode);
  if (existingRow) {
    if (primarySearchMode === 'list') {
      syncPrimarySearchToListSearch();
    } else {
      suggestions.innerHTML = '';
      currentFocus = -1;
    }

    await handleExistingRowAction(existingRow);
    playScannerFeedback('warning');
    showScanToast('warning', 'Producto ya estaba en la lista', buildChecklistItemFromRow(existingRow)?.nombre || normalizedCode, { timeout: 3200 });
    return true;
  }

  const beforeCount = getTableRows().length;
  suppressProductAddedToast = true;
  try {
    await handlePrimarySearchSubmit();
  } finally {
    suppressProductAddedToast = false;
  }
  const afterCount = getTableRows().length;

  if (afterCount > beforeCount) {
    const addedRow = body?.querySelector('tr');
    const addedName = addedRow ? (buildChecklistItemFromRow(addedRow)?.nombre || normalizedCode) : normalizedCode;
    playScannerFeedback('success');
    showScanToast('success', 'Producto agregado', addedName, { timeout: 3200 });
  } else {
    playScannerFeedback('error');
    showScanToast('error', 'No se encontró el producto', 'Código: ' + normalizedCode, { timeout: 4200 });
  }

  return true;
}


function updateListSearchMeta() {
  if (!listSearchCount) return;
  const rows = getTableRows();
  const visible = rows.filter(tr => rowMatchesCurrentListSearch(tr)).length;
  listSearchCount.textContent = `${visible} / ${rows.length}`;
}

function updatePrimarySearchModeUI() {
  const isListMode = primarySearchMode === 'list';

  if (searchInput) {
    searchInput.placeholder = isListMode
      ? 'Buscar en la lista actual'
      : 'Nombre, código inventario o código de barras';
  }

  if (searchLeadLabel) {
    searchLeadLabel.textContent = isListMode ? 'Buscar lista' : 'Buscar producto';
  }

  if (searchModeHint) {
    searchModeHint.textContent = isListMode ? 'Modo: lista actual' : 'Modo: catálogo';
    searchModeHint.classList.toggle('is-list-mode', isListMode);
  }

  if (btnSearchModeToggle) {
    btnSearchModeToggle.dataset.searchMode = primarySearchMode;
    btnSearchModeToggle.classList.toggle('is-list-mode', isListMode);
    btnSearchModeToggle.title = isListMode
      ? 'Cambiar a búsqueda de catálogo'
      : 'Cambiar a búsqueda en la lista actual';
    btnSearchModeToggle.setAttribute('aria-label', btnSearchModeToggle.title);
    btnSearchModeToggle.innerHTML = isListMode
      ? '<i class="fa-solid fa-table-list" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-box-archive" aria-hidden="true"></i>';
  }

  if (!isListMode) {
    listSearchTerm = '';
  } else {
    suggestions.innerHTML = '';
    currentFocus = -1;
  }

  applyListSearchFilter();
}

function syncPrimarySearchToListSearch() {
  listSearchTerm = normalizeListSearchTerm(searchInput?.value || '');
  applyListSearchFilter();
}


function resetSearchState(options = {}) {
  const {
    mode = 'catalog',
    clearInput = true,
    applyFilter = true,
    clearSuggestions = true
  } = options || {};

  primarySearchMode = mode === 'list' ? 'list' : 'catalog';

  if (clearInput && searchInput) {
    searchInput.value = '';
  }

  if (clearSuggestions && suggestions) {
    suggestions.innerHTML = '';
  }

  currentFocus = -1;
  listSearchTerm = primarySearchMode === 'list'
    ? normalizeListSearchTerm(searchInput?.value || '')
    : '';

  updatePrimarySearchModeUI();

  if (!applyFilter) return;

  if (primarySearchMode === 'list') {
    syncPrimarySearchToListSearch();
    return;
  }

  applyListSearchFilter();
}

function preserveCompactScroll(task) {
  if (!isCompactScreen()) {
    return task();
  }

  const scrollY = window.scrollY;
  const activeElement = document.activeElement;
  const result = task();

  window.requestAnimationFrame(() => {
    try {
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
    } catch (_) {}
    window.scrollTo(0, scrollY);
  });

  return result;
}

function syncMobileCardSelectionState(card, checked) {
  if (!card) return;
  card.classList.toggle('is-selected', !!checked);
  const checkbox = card.querySelector('.mobile-card-select');
  if (checkbox) checkbox.checked = !!checked;
}


function refreshMobileChecklistCards() {
  if (!mobileChecklistCards) return;
  if (!isCompactScreen()) {
    mobileChecklistCards.innerHTML = '';
    return;
  }

  const rows = getTableRows();
  mobileChecklistCards.innerHTML = '';

  rows.forEach((tr) => {
    const item = buildChecklistItemFromRow(tr);
    const selected = tr.querySelector('.row-bulk-select-checkbox')?.checked;
    const matchesSearch = rowMatchesCurrentListSearch(tr);

    ensureRowDomId(tr);
    const card = document.createElement('article');
    card.className = 'mobile-check-card';
    card.dataset.rowId = tr.dataset.rowId || '';
    if (selected) card.classList.add('is-selected');
    if (matchesSearch && listSearchTerm) card.classList.add('is-search-match');
    if (!matchesSearch) card.classList.add('mobile-card-row-hidden');

    const numberText = tr.cells[COL_INDEX.rowNumber]?.textContent?.trim() || '';
    const barcode = item.codigo_barras || '—';
    const inventory = item.codigo_inventario || 'N/A';
    const warehouse = item.bodega || '—';
    const quantity = item.cantidad || 'Sin cantidad';

    card.innerHTML = `
      <div class="mobile-card-top">
        <div class="mobile-card-check">
          <label class="mobile-card-check-wrap" title="Seleccionar tarjeta">
            <input type="checkbox" class="form-check-input mobile-card-select" aria-label="Seleccionar producto">
            <span class="mobile-card-check-icon">
              <i class="fa-solid fa-square-check" aria-hidden="true"></i>
            </span>
          </label>
        </div>
        <div class="mobile-card-main">
          <h6 class="mobile-card-title">${escapeHtml(item.nombre || 'Producto')}</h6>
          <div class="mobile-card-meta">
            <div class="mobile-card-meta-item">
              <span class="mobile-card-meta-label">Cód. barras</span>
              <span class="mobile-card-meta-value">${escapeHtml(barcode)}</span>
            </div>
            <div class="mobile-card-meta-item">
              <span class="mobile-card-meta-label">Cód. inv.</span>
              <span class="mobile-card-meta-value">${escapeHtml(inventory)}</span>
            </div>
            <div class="mobile-card-meta-item" style="grid-column: 1 / -1;">
              <span class="mobile-card-meta-label">Bodega</span>
              <span class="mobile-card-meta-value">${escapeHtml(warehouse)}</span>
            </div>
          </div>

        </div>
        <span class="mobile-card-index">${escapeHtml(numberText)}</span>
      </div>

      <div class="mobile-card-qty">
        <button type="button" class="btn mobile-card-qty-btn" aria-label="Editar cantidad">
          <span class="qty-label">Cantidad</span>
          <span class="qty-value">${escapeHtml(quantity)}</span>
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
        </button>
      </div>

      <div class="mobile-card-actions" role="group" aria-label="Acciones del producto">
        <button type="button" class="btn btn-outline-primary mobile-action-review btn-toggle off" aria-label="Marcar encontrado en bodega" title="Encontrado en bodega">
          <i class="fa-solid fa-eye" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn-outline-success mobile-action-dispatch btn-toggle off" aria-label="Marcar despachado" title="Despachado">
          <i class="fa-solid fa-truck-ramp-box" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary mobile-action-delete" aria-label="Eliminar" title="Eliminar">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    `;

    const sourceCheckbox = tr.querySelector('.row-bulk-select-checkbox');
    const cardCheckbox = card.querySelector('.mobile-card-select');
    if (sourceCheckbox && cardCheckbox) {
      const cardCheckWrap = card.querySelector('.mobile-card-check');
      if (cardCheckWrap) cardCheckWrap.classList.toggle('d-none', !canUseBulkSelection());
      cardCheckbox.checked = canUseBulkSelection() && !!sourceCheckbox.checked;
      cardCheckbox.disabled = !!sourceCheckbox.disabled;
      cardCheckbox.addEventListener('change', () => {
        sourceCheckbox.checked = cardCheckbox.checked;
        syncMobileCardSelectionState(card, cardCheckbox.checked);
        preserveCompactScroll(() => updateBulkSelectionUI());
      });
    }

    card.querySelector('.mobile-card-qty-btn')?.addEventListener('click', async () => {
      const input = tr.querySelector('.qty');
      await openQtyEditor(input);
      updateQtyPreview(null);
      preserveCompactScroll(() => applyListSearchFilter());
    });

    card.querySelector('.mobile-action-review')?.addEventListener('click', () => {
      const btn = getReviewButton(tr);
      if (!btn) return;
      preserveCompactScroll(() => {
        toggleBtn(btn);
        queueAutoSave('marcar revisado');
        applyListSearchFilter();
      });
    });

    card.querySelector('.mobile-action-dispatch')?.addEventListener('click', () => {
      const btn = getDispatchButton(tr);
      if (!btn) return;
      preserveCompactScroll(() => {
        toggleBtn(btn);
        queueAutoSave('marcar despachado');
        updateActiveRequestDispatchVisualStatus();
        applyListSearchFilter();
      });
    });


    card.querySelector('.mobile-action-delete')?.addEventListener('click', async () => {
      const btn = getDeleteButton(tr);
      if (!btn) return;
      const scrollY = window.scrollY;
      btn.click();
      window.setTimeout(() => {
        applyListSearchFilter();
        window.scrollTo(0, scrollY);
      }, 450);
    });

    applyRoleStateToMobileCard(card, tr);
    mobileChecklistCards.appendChild(card);
  });

  const visibleCount = rows.filter(tr => rowMatchesCurrentListSearch(tr)).length;
}

function applyListSearchFilter() {
  if (primarySearchMode !== 'list') {
    listSearchTerm = '';
  } else {
    listSearchTerm = normalizeListSearchTerm(searchInput?.value || '');
  }

  getTableRows().forEach(tr => {
    tr.classList.toggle('table-row-hidden-by-search', !rowMatchesCurrentListSearch(tr));
  });

  updateListSearchMeta();
  refreshMobileChecklistCards();
}

async function openInsertedRowsSearch() {
  closeMobileFab();

  primarySearchMode = 'list';
  updatePrimarySearchModeUI();

  if (!isCompactScreen()) {
    window.setTimeout(() => {
      searchInput?.focus();
      searchInput?.select();
    }, 120);
  }
}


  function isCompactScreen() {
    return window.TRUtils?.isCompactViewport
      ? window.TRUtils.isCompactViewport(MOBILE_BREAKPOINT)
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function focusSearchInput(options = {}) {
    const { center = false, select = false } = options || {};
    if (!searchInput || isCompactScreen()) return;

    const targetSearchBlock = searchInput.closest('.checklist-search-shell');
    if (center && targetSearchBlock) {
      targetSearchBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.setTimeout(() => {
      try {
        searchInput.focus({ preventScroll: !center });
      } catch (_) {
        try { searchInput.focus(); } catch (_) {}
      }

      if (select && typeof searchInput.select === 'function') {
        searchInput.select();
      }
    }, center ? 220 : 90);
  }

  function applyResponsiveRowLabels(tr) {
    if (!tr?.cells) return;

    [...tr.cells].forEach((cell, idx) => {
      cell.setAttribute('data-label', ROW_CELL_LABELS[idx] || '');
      if (idx === COL_INDEX.bulkSelect) {
        cell.classList.add('cell-select');
      }
      if (idx === COL_INDEX.name) {
        cell.classList.add('cell-name');
      }
      if (idx === COL_INDEX.inventoryCode) {
        cell.classList.add('cell-inventory');
      }
      if (idx === COL_INDEX.warehouse) {
        cell.classList.add('cell-warehouse');
      }
      if (idx === COL_INDEX.quantity) {
        cell.classList.add('cell-quantity');
      }
      if (idx === COL_INDEX.actions) {
        cell.classList.add('cell-actions');
      }
    });
  }

  function syncQtyInputMode(input) {
    if (!input) return;
    input.readOnly = isCompactScreen();
    input.classList.toggle('qty-mobile-readonly', input.readOnly);
    input.setAttribute('inputmode', input.readOnly ? 'none' : 'text');
  }

  async function openQtyEditor(input) {
    if (!input) return;
    const result = await Swal.fire({
      title: 'Editar cantidad',
      input: 'text',
      inputValue: String(input.value || ''),
      inputLabel: 'Cantidad',
      inputPlaceholder: 'Escribe la cantidad completa',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      }
    });

    if (!result.isConfirmed) return;
    input.value = String(result.value || '').trim();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function handleQtyInputInteraction(ev) {
    const input = ev.currentTarget;
    if (!isCompactScreen() || !input) return;
    ev.preventDefault();
    ev.stopPropagation();
    input.blur();
    await openQtyEditor(input);
  }


  function updateQtyPreview(input) {
    if (!qtyPreviewBubble) return;

    const value = String(input?.value || '').trim();
    const shouldShow = !!input && document.activeElement === input && value.length > 10;

    if (!shouldShow) {
      qtyPreviewBubble.classList.add('d-none');
      qtyPreviewBubble.setAttribute('aria-hidden', 'true');
      return;
    }

    qtyPreviewBubble.textContent = value;
    const rect = input.getBoundingClientRect();
    qtyPreviewBubble.classList.remove('d-none');
    qtyPreviewBubble.setAttribute('aria-hidden', 'false');
    qtyPreviewBubble.style.left = Math.max(12, Math.min(window.innerWidth - qtyPreviewBubble.offsetWidth - 12, rect.left)) + 'px';
    qtyPreviewBubble.style.top = Math.min(window.innerHeight - 16, rect.bottom + 10) + 'px';
  }

  function bindQtyPreview(input) {
    if (!input) return;

    syncQtyInputMode(input);

    const sync = () => {
      input.setAttribute('title', input.value || '');
      updateQtyPreview(input);
    };

    input.addEventListener('focus', sync);
    input.addEventListener('input', sync);
    input.addEventListener('blur', () => updateQtyPreview(null));
    input.addEventListener('click', async (ev) => {
      if (isCompactScreen()) {
        await handleQtyInputInteraction(ev);
        return;
      }
      sync();
    });
    input.addEventListener('keydown', async (ev) => {
      if (!isCompactScreen()) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        await handleQtyInputInteraction(ev);
      }
    });
    sync();
  }

  window.addEventListener('resize', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
    [...body.querySelectorAll('.qty')].forEach(syncQtyInputMode);
  });

  document.addEventListener('scroll', () => {
    const active = document.activeElement;
    updateQtyPreview(active && active.classList && active.classList.contains('qty') ? active : null);
  }, true);


  function getDocIdForCurrentList() {
    const storeKey = storeSelect.value;
    if (!isStoreAllowedForCurrentUser(storeKey)) {
      throw new Error('Sucursal no permitida para este usuario.');
    }
    return getBinId(storeKey, versionSelect.value);
  }

  function isHistoricalDateSelected() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate !== today);
  }

  function isPastHistoricalDateSelected() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate < today);
  }

  function getTargetChecklistDate() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return currentViewDate || today;
  }

  function isProtectedVersionSelected() {
    const versionKey = String(versionSelect?.value || '');
    if (typeof isProtectedVersionKey === 'function') {
      return !!isProtectedVersionKey(versionKey);
    }
    return versionKey === 'traslado';
  }

  function isProtectedVersionEditingLocked() {
    return isProtectedVersionSelected() && !protectedVersionUnlockEnabled;
  }

  function getActiveEditingContexts() {
    const contexts = [];

    if (isHistoricalDateSelected()) {
      contexts.push(currentViewDate ? ('histórico (' + currentViewDate + ')') : 'histórico');
    }

    if (isProtectedVersionSelected()) {
      contexts.push('protegido (' + getVersionLabel(versionSelect.value) + ')');
    }

    return contexts;
  }

  function getEditingModeMessage() {
    const contexts = getActiveEditingContexts();
    if (!contexts.length) {
      return {
        text: 'Modo: checklist del día actual (editable).',
        className: 'text-muted'
      };
    }

    if (isEditingLocked()) {
      return {
        text: 'Modo ' + contexts.join(' + ') + ': solo lectura.',
        className: 'text-primary'
      };
    }

    return {
      text: 'Modo ' + contexts.join(' + ') + ': edición habilitada temporalmente.',
      className: 'text-success'
    };
  }

  async function showEditingLockedAlert(actionLabel = 'continuar') {
    const contexts = getActiveEditingContexts();
    const contextText = contexts.length
      ? ('Esta vista está protegida (' + contexts.join(' + ') + ').')
      : 'Esta vista está protegida.';

    await Swal.fire(
      'Edición bloqueada',
      'Para ' + actionLabel + ', desbloquea la edición o cambia de vista. ' + contextText,
      'info'
    );
  }

  async function requestUnlockPassword(options = {}) {
    const title = options.title || 'Desbloquear edición';
    const text = options.text || 'Ingresa la contraseña para continuar.';
    const confirmButtonText = options.confirmButtonText || 'Desbloquear';

    const result = await Swal.fire({
      title,
      text,
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: '••••••••',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      preConfirm: async (password) => {
        if (!password) {
          Swal.showValidationMessage('Debes ingresar la contraseña.');
          return false;
        }

        try {
          const ok = await validateHistoricalPassword(password);
          if (!ok) {
            Swal.showValidationMessage('Contraseña incorrecta.');
            return false;
          }
          return true;
        } catch (err) {
          Swal.showValidationMessage(String(err.message || err));
          return false;
        }
      }
    });

    return !!result.isConfirmed;
  }

  async function ensureProtectedDestinationAccess(versionKey, actionLabel = 'continuar') {
    const isProtectedDestination = (typeof isProtectedVersionKey === 'function')
      ? isProtectedVersionKey(versionKey)
      : (versionKey === 'traslado');

    if (!isProtectedDestination) return true;

    if (!canUseProtectedLists()) {
      await showRoleDeniedAlert(actionLabel + ' en la lista protegida', 'bodega o administradores');
      return false;
    }

    if (canUseWarehouseTools()) return true;

    return requestUnlockPassword({
      title: 'Acceso a lista protegida',
      text: 'Ingresa la contraseña para ' + actionLabel + ' en la lista ' + getVersionLabel(versionKey) + '.',
      confirmButtonText: 'Continuar'
    });
  }

  function buildChecklistMeta(options = {}) {
    const storeKey = options.storeKey ?? storeSelect.value;
    const storeName = options.storeName ?? storeSelect.options[storeSelect.selectedIndex].text;
    const versionKey = options.versionKey ?? versionSelect.value;
    const updatedAt = options.updatedAt || new Date().toISOString();
    const reqDone = typeof options.requisitionDone === 'boolean'
      ? options.requisitionDone
      : requisitionDone;
    const reqDoneAt = reqDone
      ? (options.requisitionDoneAt ?? requisitionDoneAt ?? updatedAt)
      : null;

    return {
      tienda_key: storeKey,
      tienda: storeName,
      version: versionKey,
      version_label: getVersionLabel(versionKey),
      requisition_done: reqDone,
      requisition_done_at: reqDoneAt,
      updatedAt
    };
  }

  function applyChecklistMeta(meta = {}) {
    requisitionDone = !!meta?.requisition_done;
    requisitionDoneAt = requisitionDone
      ? String(meta?.requisition_done_at || '').trim() || null
      : null;

    updateRequisitionUI();
  }

  function getVersionLabel(versionKey) {
    if (typeof getListLabel === 'function') {
      return getListLabel(versionKey);
    }

    const fallback = {
      base: 'Principal',
      alterna: 'Alterna',
      traslado: 'Traslado'
    };

    return fallback[versionKey] || versionKey;
  }

  function getDestinationVersionKeys(storeKey, currentVersionKey) {
    const available = (typeof getStoreVersions === 'function')
      ? getStoreVersions(storeKey)
      : Object.entries((typeof STORE_BINS !== 'undefined' && STORE_BINS[storeKey]) ? STORE_BINS[storeKey] : {})
          .filter(([, docId]) => !!docId)
          .map(([versionKey]) => versionKey);

    return available.filter(versionKey => versionKey !== currentVersionKey);
  }



  function getAllDestinationVersionKeys(storeKey) {
    const available = (typeof getStoreVersions === 'function')
      ? getStoreVersions(storeKey)
      : Object.entries((typeof STORE_BINS !== 'undefined' && STORE_BINS[storeKey]) ? STORE_BINS[storeKey] : {})
          .filter(([, docId]) => !!docId)
          .map(([versionKey]) => versionKey);

    return available.filter(Boolean);
  }

  function getBulkSelectionCheckboxes() {
    return [...body.querySelectorAll('.row-bulk-select-checkbox')];
  }

  function getSelectedTableRows() {
    return getBulkSelectionCheckboxes()
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr'))
      .filter(Boolean);
  }

  function clearBulkSelection() {
    getBulkSelectionCheckboxes().forEach(cb => {
      cb.checked = false;
    });

    if (chkSelectAllRows) {
      chkSelectAllRows.checked = false;
      chkSelectAllRows.indeterminate = false;
    }
  }


  function clearHistoricalSelection() {
    clearBulkSelection();
    updateHistoricalSelectionUI();
  }

  function updateBulkSelectionUI() {
    const checkboxes = getBulkSelectionCheckboxes();
    const selectableCheckboxes = checkboxes.filter(cb => !cb.disabled);
    const selectedCount = selectableCheckboxes.filter(cb => cb.checked).length;
    const hasRows = checkboxes.length > 0;
    const editingLocked = isEditingLocked();

    if (chkSelectAllRows) {
      chkSelectAllRows.disabled = !canUseBulkSelection() || !hasRows;
      chkSelectAllRows.setAttribute('aria-disabled', String(chkSelectAllRows.disabled));
      chkSelectAllRows.checked = !!selectableCheckboxes.length && selectedCount === selectableCheckboxes.length;
      chkSelectAllRows.indeterminate = selectedCount > 0 && selectedCount < selectableCheckboxes.length;
    }

    const allSelected = !!selectableCheckboxes.length && selectedCount === selectableCheckboxes.length;

    if (bulkSelectionBar) {
      const shouldShow = canUseBulkSelection() && selectedCount > 0;
      const activeInsideBulkBar = bulkSelectionBar.contains(document.activeElement);

      if (!shouldShow && activeInsideBulkBar) {
        try {
          document.activeElement?.blur?.();
        } catch (_) {}
      }

      bulkSelectionBar.classList.toggle('d-none', !shouldShow);
      bulkSelectionBar.toggleAttribute('hidden', !shouldShow);
      bulkSelectionBar.inert = !shouldShow;
      bulkSelectionBar.setAttribute('aria-hidden', String(!shouldShow));
      document.body.classList.toggle('has-mobile-selection', shouldShow && isCompactScreen());
    }

    if (bulkSelectionCount) {
      bulkSelectionCount.textContent = selectedCount === 1 ? '1 seleccionada' : (selectedCount + ' seleccionadas');
    }

    if (btnClearSelection) {
      btnClearSelection.disabled = selectedCount === 0;
      btnClearSelection.setAttribute('aria-disabled', String(btnClearSelection.disabled));
    }

    if (btnToggleSelectAllBulk) {
      btnToggleSelectAllBulk.disabled = !canUseBulkSelection() || !selectableCheckboxes.length;
      btnToggleSelectAllBulk.setAttribute('aria-disabled', String(btnToggleSelectAllBulk.disabled));
      setToolbarButtonContent(
        btnToggleSelectAllBulk,
        allSelected ? 'fa-regular fa-square-minus' : 'fa-regular fa-square-check',
        allSelected ? 'Quitar todas' : 'Todas'
      );
    }

    if (btnReviewSelected) {
      btnReviewSelected.classList.toggle('d-none', !canUseWarehouseTools());
      btnReviewSelected.disabled = !canUseWarehouseTools() || editingLocked || selectedCount === 0;
      btnReviewSelected.setAttribute('aria-disabled', String(btnReviewSelected.disabled));
      setToolbarButtonContent(btnReviewSelected, 'fa-solid fa-clipboard-check', 'Revisar');
    }

    if (btnDispatchSelected) {
      btnDispatchSelected.classList.toggle('d-none', !canUseWarehouseTools());
      btnDispatchSelected.disabled = !canUseWarehouseTools() || editingLocked || selectedCount === 0;
      btnDispatchSelected.setAttribute('aria-disabled', String(btnDispatchSelected.disabled));
      setToolbarButtonContent(btnDispatchSelected, 'fa-solid fa-truck-ramp-box', 'Despachar');
    }

    if (btnDeleteSelected) {
      const canShowBulkDelete = canUseBulkSelection() && canDeleteRows();
      btnDeleteSelected.classList.toggle('d-none', !canShowBulkDelete);
      btnDeleteSelected.disabled = !canShowBulkDelete || editingLocked || selectedCount === 0;
      btnDeleteSelected.setAttribute('aria-disabled', String(btnDeleteSelected.disabled));
      btnDeleteSelected.title = canShowBulkDelete ? 'Eliminar seleccionados' : 'Sin permiso para eliminar seleccionados';
      setToolbarButtonContent(btnDeleteSelected, 'fa-solid fa-trash-can', 'Eliminar');
    }

    updateHistoricalSelectionUI();
    refreshMobileChecklistCards();
  }


  async function markSelectedRowsWithState(kind) {
    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert(kind === 'reviewed' ? 'marcar múltiples filas como revisadas' : 'marcar múltiples filas como despachadas', 'bodega o administradores');
      return;
    }

    if (isEditingLocked()) {
      await showEditingLockedAlert(kind === 'reviewed' ? 'marcar múltiples filas como revisadas' : 'marcar múltiples filas como despachadas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await Swal.fire(
        'Sin selección',
        'Selecciona al menos una fila para aplicar esta acción masiva.',
        'info'
      );
      return;
    }

    const actionLabel = kind === 'reviewed' ? 'revisadas' : 'despachadas';

    let changedCount = 0;

    selectedRows.forEach(tr => {
      const btn = kind === 'reviewed' ? getReviewButton(tr) : getDispatchButton(tr);
      if (!btn || btn.classList.contains('on')) return;
      setToggleState(btn, true);
      changedCount += 1;
    });

    clearBulkSelection();
    updateBulkSelectionUI();
    refreshMobileChecklistCards();
    if (kind === 'dispatched') updateActiveRequestDispatchVisualStatus();
    if (changedCount) queueAutoSave(kind === 'reviewed' ? 'marcado revisado' : 'marcado despachado');

    await Swal.fire(
      changedCount ? 'Actualizado' : 'Sin cambios',
      changedCount
        ? ('Se marcaron ' + changedCount + ' fila(s) como ' + actionLabel + '.')
        : ('Las filas seleccionadas ya estaban ' + actionLabel + '.'),
      changedCount ? 'success' : 'info'
    );
  }

  async function deleteSelectedRows() {
    if (!canDeleteRows()) {
      await showRoleDeniedAlert('eliminar filas en selección múltiple', 'usuarios autorizados');
      return;
    }

    if (isEditingLocked()) {
      await showEditingLockedAlert('eliminar múltiples filas');
      return;
    }

    const selectedRows = getSelectedTableRows();
    if (!selectedRows.length) {
      await Swal.fire(
        'Sin selección',
        'Selecciona al menos una fila para eliminarla de la tabla actual.',
        'info'
      );
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar filas seleccionadas?',
      html: '<div class="small text-muted">Se eliminarán <strong>' + selectedRows.length + '</strong> fila(s) de la tabla actual. Recuerda guardar para persistir el cambio.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    selectedRows.forEach(tr => tr.remove());
    renumber();
    updateBulkSelectionUI();
    refreshMobileChecklistCards();
    queueAutoSave('eliminar seleccionados');

    await Swal.fire(
      'Filas eliminadas',
      'Se eliminaron ' + selectedRows.length + ' fila(s) de la tabla actual.',
      'success'
    );
  }

  function isHistoricalSelectionAvailable() {
    return isPastHistoricalDateSelected() && canMergeHistoricalRows();
  }

  if (chkSelectAllRows) {
    chkSelectAllRows.addEventListener('change', () => {
      if (!canUseBulkSelection()) {
        chkSelectAllRows.checked = false;
        return;
      }
      const shouldCheck = !!chkSelectAllRows.checked;
      getBulkSelectionCheckboxes().forEach(cb => {
        if (!cb.disabled) cb.checked = shouldCheck;
      });
      refreshMobileChecklistCards();
      updateBulkSelectionUI();
    });
  }

  if (btnReviewSelected) {
    btnReviewSelected.addEventListener('click', async () => {
      await markSelectedRowsWithState('reviewed');
    });
  }

  if (btnDispatchSelected) {
    btnDispatchSelected.addEventListener('click', async () => {
      await markSelectedRowsWithState('dispatched');
    });
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async () => {
      await deleteSelectedRows();
    });
  }

  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
      getBulkSelectionCheckboxes().forEach(cb => {
        cb.checked = false;
      });
      refreshMobileChecklistCards();
      updateBulkSelectionUI();
      updateHistoricalSelectionUI();
    });
  }

  if (btnToggleSelectAllBulk) {
    btnToggleSelectAllBulk.addEventListener('click', () => {
      const checkboxes = getBulkSelectionCheckboxes().filter(cb => !cb.disabled);
      if (!checkboxes.length) {
        updateBulkSelectionUI();
        return;
      }

      const shouldSelectAll = checkboxes.some(cb => !cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = shouldSelectAll;
      });

      refreshMobileChecklistCards();
      updateBulkSelectionUI();
      updateHistoricalSelectionUI();
    });
  }

  function updateHistoricalSelectionUI() {
    const canMerge = isHistoricalSelectionAvailable();

    if (btnMergeSelectedToToday) {
      const selectedCount = getSelectedTableRows().length;
      const shouldShow = false;

      btnMergeSelectedToToday.classList.toggle('d-none', !shouldShow);
      btnMergeSelectedToToday.disabled = !canMerge || selectedCount === 0;
      btnMergeSelectedToToday.setAttribute('aria-disabled', String(btnMergeSelectedToToday.disabled));
      btnMergeSelectedToToday.title = canMerge
        ? 'Enviar productos seleccionados a la lista de hoy'
        : '';

      if (shouldShow) {
        setToolbarButtonContent(btnMergeSelectedToToday, 'fa-solid fa-share-from-square', 'Enviar hoy');
      }
    }
  }


  function buildMergeItemFromHistoricalRow(tr) {
    const item = buildChecklistItemFromRow(tr);
    return {
      ...item,
      revisado: false,
      despachado: false
    };
  }


  async function mergeSelectedHistoricalRowsToToday() {
    try {
      if (!canMergeHistoricalRows()) {
        await showRoleDeniedAlert('enviar históricos a hoy', 'supervisores o administradores');
        return;
      }

      if (!isHistoricalSelectionAvailable()) {
        await Swal.fire(
          'No aplica',
          'Esta acción solo está disponible cuando estás viendo una fecha anterior.',
          'info'
        );
        return;
      }

      const selectedRows = getSelectedTableRows();
      if (!selectedRows.length) {
        await Swal.fire(
          'Sin selección',
          'Selecciona al menos un producto histórico para enviarlo a la fecha actual.',
          'info'
        );
        return;
      }

      if (!(await enforceCurrentStoreAccess('mover productos'))) return;

      const storeKey = storeSelect.value;
      const destinationKeys = getAllDestinationVersionKeys(storeKey);

      if (!destinationKeys.length) {
        await Swal.fire(
          'Configuración incompleta',
          'No hay listas destino disponibles para esta tienda.',
          'error'
        );
        return;
      }

      const destinationOptions = Object.fromEntries(
        destinationKeys.map(versionKey => [versionKey, getVersionLabel(versionKey)])
      );

      const selection = await Swal.fire({
        title: 'Enviar productos a hoy',
        html: `
          <div class="text-start small text-muted">
            Se copiarán <strong>${selectedRows.length}</strong> producto(s) desde la vista histórica hacia una lista del día actual.<br>
            Los productos que ya existan en el destino se omitirán automáticamente.<br>
            Los estados <strong>Revisado</strong> y <strong>Despachado</strong> se reiniciarán en la lista de hoy.
          </div>
        `,
        input: 'select',
        inputOptions: destinationOptions,
        inputPlaceholder: 'Selecciona la lista destino de hoy',
        showCancelButton: true,
        confirmButtonText: 'Enviar a hoy',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) return 'Debes seleccionar una lista destino.';
          return undefined;
        }
      });

      if (!selection.isConfirmed) return;

      const toKey = selection.value;
      const hasProtectedDestinationAccess = await ensureProtectedDestinationAccess(
        toKey,
        'enviar productos a hoy'
      );

      if (!hasProtectedDestinationAccess) {
        return;
      }

      const toDoc = getBinId(storeKey, toKey);
      const today = (typeof getTodayString === 'function') ? getTodayString() : (typeof getTodayString === 'function' ? getTodayString() : '');

      if (!toDoc || !today) {
        await Swal.fire(
          'Configuración incompleta',
          'No se encontró la lista destino o la fecha actual.',
          'error'
        );
        return;
      }

      const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
      let destinationRecord = await loadChecklistFromFirestore(toDoc, today);

      if (!destinationRecord || !Array.isArray(destinationRecord.items)) {
        destinationRecord = {
          meta: buildChecklistMeta({
            storeKey,
            storeName: tiendaName,
            versionKey: toKey,
            requisitionDone: false,
            requisitionDoneAt: null,
            updatedAt: null
          }),
          items: []
        };
      }

      const destinationItems = Array.isArray(destinationRecord.items)
        ? destinationRecord.items.slice()
        : [];

      const addedItems = [];
      const omittedItems = [];

      selectedRows.forEach(tr => {
        const candidate = buildMergeItemFromHistoricalRow(tr);
        if (findMatchingItemInArray(destinationItems, candidate)) {
          omittedItems.push(candidate);
          return;
        }

        destinationItems.push(candidate);
        addedItems.push(candidate);
      });

      if (!addedItems.length) {
            await Swal.fire(
          'Sin cambios',
          'Todos los productos seleccionados ya existen en la lista de hoy elegida. No se agregó nada.',
          'info'
        );
        return;
      }

      destinationRecord.items = destinationItems;
      destinationRecord.meta = buildChecklistMeta({
        storeKey,
        storeName: tiendaName,
        versionKey: toKey,
        requisitionDone: !!destinationRecord.meta?.requisition_done,
        requisitionDoneAt: destinationRecord.meta?.requisition_done_at || null
      });

      await saveChecklistToFirestore(toDoc, destinationRecord, today);
      rememberHistoryDate(toDoc, today);
      await refreshHistoryPicker();

      clearBulkSelection();
      updateBulkSelectionUI();

      await Swal.fire({
        title: 'Productos enviados',
        icon: 'success',
        html: `
          <div class="text-start small">
            <div><strong>Destino:</strong> ${escapeHtml(getVersionLabel(toKey))} (${escapeHtml(today)})</div>
            <div><strong>Agregados:</strong> ${addedItems.length}</div>
            <div><strong>Omitidos por duplicado:</strong> ${omittedItems.length}</div>
          </div>
        `
      });
    } catch (err) {
      console.error(err);
      await Swal.fire(
        'Error',
        'No se pudieron enviar los productos seleccionados a la lista de hoy. Intenta nuevamente.',
        'error'
      );
    }
  }

  function updateHistoricalLockUI() {
    if (!btnToggleHistLock) return;

    const isPastHistorical = isPastHistoricalDateSelected();
    const isProtected = isProtectedVersionSelected();
    const canShowHistoricalUnlock = isPastHistorical && canUnlockHistoricalViews();
    const canShowProtectedUnlock = isProtected && canUseProtectedLists();
    const shouldShow = canShowHistoricalUnlock || canShowProtectedUnlock;
    const isUnlocked =
      (canShowHistoricalUnlock && historicalUnlockEnabled) ||
      (canShowProtectedUnlock && protectedVersionUnlockEnabled);

    if (btnHistToday) {
      // El botón Hoy debe estar siempre disponible; antes quedaba deshabilitado en modo hoy
      // y el clic terminaba abriendo el calendario por el contenedor.
      btnHistToday.disabled = false;
      btnHistToday.setAttribute('aria-disabled', 'false');
    }

    btnToggleHistLock.disabled = !shouldShow;
    btnToggleHistLock.setAttribute('aria-disabled', String(!shouldShow));
    btnToggleHistLock.classList.toggle('d-none', !shouldShow);
    btnToggleHistLock.classList.remove('btn-outline-warning', 'btn-outline-success', 'btn-outline-secondary');

    if (!shouldShow) {
      btnToggleHistLock.classList.add('btn-outline-secondary');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloq.');
      btnToggleHistLock.title = 'Desbloquear edición';
      return;
    }

    if (isUnlocked) {
      btnToggleHistLock.classList.add('btn-outline-success');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-lock', 'Bloquear');
      btnToggleHistLock.title = 'Bloquear edición';
    } else {
      btnToggleHistLock.classList.add('btn-outline-warning');
      setToolbarButtonContent(btnToggleHistLock, 'fa-solid fa-unlock-keyhole', 'Desbloq.');
      btnToggleHistLock.title = 'Desbloquear edición';
    }
  }

  function updateRequisitionUI() {
    if (!btnToggleRequisition) return;

    if (!canUseWarehouseTools()) {
      btnToggleRequisition.classList.add('d-none');
      btnToggleRequisition.disabled = true;
      btnToggleRequisition.setAttribute('aria-disabled', 'true');
      return;
    }

    btnToggleRequisition.classList.remove('d-none');
    const locked = isEditingLocked();
    btnToggleRequisition.disabled = locked;
    btnToggleRequisition.setAttribute('aria-disabled', String(locked));
    btnToggleRequisition.classList.remove('btn-outline-secondary', 'btn-success', 'text-white');

    if (requisitionDone) {
      btnToggleRequisition.classList.add('btn-success', 'text-white');
      setToolbarButtonContent(btnToggleRequisition, 'fa-solid fa-flag', 'Req. hecha');
      btnToggleRequisition.title = requisitionDoneAt
        ? ('Marcada como hecha: ' + formatSV(requisitionDoneAt))
        : 'Marcada como requisición hecha.';
    } else {
      btnToggleRequisition.classList.add('btn-outline-secondary');
      setToolbarButtonContent(btnToggleRequisition, 'fa-regular fa-flag', 'Req. pend.');
      btnToggleRequisition.title = 'Marcar esta lista como requisición hecha.';
    }
  }

  function resetHistoricalUnlock() {
    historicalUnlockEnabled = false;
    protectedVersionUnlockEnabled = false;
    updateHistoricalLockUI();
    updateRequisitionUI();
  }

  async function validateHistoricalPassword(password) {
    const resp = await fetch('/api/validate-historical-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(data.error || 'No se pudo validar la contraseña.');
    }

    return !!data.ok;
  }

  function applyRolePermissionsToRow(tr, disableEditing = isEditingLocked()) {
    if (!tr) return;

    const qty = tr.querySelector('.qty');
    const btnRev = getReviewButton(tr);
    const btnDes = getDispatchButton(tr);
    const btnMove = getMoveButton(tr);
    const btnDel = getDeleteButton(tr);
    const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');
    const bulkCell = tr.querySelector('.row-bulk-select-cell');

    if (bulkCell) bulkCell.classList.toggle('d-none', !canUseBulkSelection());

    if (qty) qty.disabled = disableEditing;
    if (btnRev) {
      btnRev.disabled = disableEditing || !canUseWarehouseTools();
      btnRev.classList.toggle('d-none', !canUseWarehouseTools());
    }
    if (btnDes) {
      btnDes.disabled = disableEditing || !canUseWarehouseTools();
      btnDes.classList.toggle('d-none', !canUseWarehouseTools());
    }
    if (btnMove) {
      btnMove.disabled = disableEditing || !canUseWarehouseTools();
      btnMove.classList.toggle('d-none', !canUseWarehouseTools());
    }

    if (btnDel) {
      const deleteDisabled = disableEditing || !canDeleteRows();
      btnDel.disabled = deleteDisabled;
      btnDel.classList.toggle('d-none', !canDeleteRows());
      btnDel.title = canDeleteRows() ? 'Quitar producto' : 'Sin permiso para quitar';
      btnDel.setAttribute('aria-label', canDeleteRows() ? 'Quitar producto' : 'Quitar producto (sin permiso)');
    }

    if (bulkSelect) {
      bulkSelect.disabled = !canUseBulkSelection();
      bulkSelect.checked = canUseBulkSelection() ? bulkSelect.checked : false;
      bulkSelect.setAttribute('aria-disabled', String(!canUseBulkSelection()));
    }
  }

  function applyRoleStateToMobileCard(card, tr) {
    if (!card || !tr) return;

    const qtyButton = card.querySelector('.mobile-card-qty-btn');
    const reviewButton = card.querySelector('.mobile-action-review');
    const dispatchButton = card.querySelector('.mobile-action-dispatch');
        const deleteButton = card.querySelector('.mobile-action-delete');
    const qtyInput = tr.querySelector('.qty');
    const sourceReview = getReviewButton(tr);
    const sourceDispatch = getDispatchButton(tr);
        const sourceDelete = getDeleteButton(tr);

    if (qtyButton) qtyButton.disabled = !!qtyInput?.disabled;
    if (reviewButton) {
      reviewButton.disabled = !canUseWarehouseTools() || !!sourceReview?.disabled;
      reviewButton.classList.toggle('d-none', !canUseWarehouseTools());
      setToggleState(reviewButton, !!sourceReview?.classList.contains('on'));
    }
    if (dispatchButton) {
      dispatchButton.disabled = !canUseWarehouseTools() || !!sourceDispatch?.disabled;
      dispatchButton.classList.toggle('d-none', !canUseWarehouseTools());
      setToggleState(dispatchButton, !!sourceDispatch?.classList.contains('on'));
    }

    const cardCheck = card.querySelector('.mobile-card-check');
        if (cardCheck) cardCheck.classList.toggle('d-none', !canUseBulkSelection());

    if (deleteButton) {
      deleteButton.disabled = !canDeleteRows() || !!sourceDelete?.disabled;
      deleteButton.classList.toggle('d-none', !canDeleteRows());
      deleteButton.title = canDeleteRows() ? 'Quitar' : 'Sin permiso';
      deleteButton.setAttribute('aria-label', canDeleteRows() ? 'Quitar producto' : 'Quitar producto (sin permiso)');
    }
  }

  function applyRolePermissions() {
    restrictOperatorStoreAccess();

    const warehouseTools = canUseWarehouseTools();
    setWarehouseFilterLabels();
    if (warehouseTools) ensureWarehouseVersionFilterOption();
    document.body.classList.toggle('role-branch-operator', !warehouseTools);
    document.body.classList.toggle('role-warehouse-tools', warehouseTools);

    const histWrapper = document.querySelector('.hist-date-wrapper');
    if (histWrapper) histWrapper.classList.toggle('d-none', !warehouseTools);

    [btnExport, btnFabExport, moreActionsMenu].forEach(el => {
      if (!el) return;
      el.classList.toggle('d-none', !warehouseTools);
      if (!warehouseTools) {
        el.setAttribute('aria-hidden', 'true');
        if ('disabled' in el) el.disabled = true;
      } else {
        el.removeAttribute('aria-hidden');
        if ('disabled' in el) el.disabled = false;
      }
    });

    const bulkHeader = document.querySelector('th.bulk-select-col');
    if (bulkHeader) bulkHeader.classList.toggle('d-none', !canUseBulkSelection());

    const actionsHeader = document.querySelector('#chkTable thead th:last-child');
    if (actionsHeader) actionsHeader.textContent = warehouseTools ? 'Acciones' : 'Quitar';

    if (versionSelect) {
      Array.from(versionSelect.options).forEach(option => {
        if (option.value === '__all__') {
          option.hidden = !requiresWarehouseRequestContext();
          option.disabled = !requiresWarehouseRequestContext();
          return;
        }
        const protectedOption = (typeof isProtectedVersionKey === 'function')
          ? isProtectedVersionKey(option.value)
          : option.value === 'traslado';

        if (!protectedOption) return;

        option.disabled = !canUseProtectedLists();
        option.hidden = !canUseProtectedLists();
      });

      const currentProtected = (typeof isProtectedVersionKey === 'function')
        ? isProtectedVersionKey(versionSelect.value)
        : versionSelect.value === 'traslado';

      if ((currentProtected && !canUseProtectedLists()) || (!requiresWarehouseRequestContext() && versionSelect.value === '__all__')) {
        versionSelect.value = 'base';
        lastCommittedVersionValue = 'base';
      }
    }

    if (btnReviewSelected) btnReviewSelected.classList.toggle('d-none', !warehouseTools);
    if (btnDispatchSelected) btnDispatchSelected.classList.toggle('d-none', !warehouseTools);
    if (btnCleanUnreviewed) {
      btnCleanUnreviewed.classList.toggle('d-none', !warehouseTools);
      btnCleanUnreviewed.disabled = !warehouseTools || isEditingLocked();
      btnCleanUnreviewed.setAttribute('aria-disabled', String(btnCleanUnreviewed.disabled));
    }

    if (btnDeleteSelected) {
      const canShowBulkDelete = canUseBulkSelection() && canDeleteRows();
      btnDeleteSelected.classList.toggle('d-none', !canShowBulkDelete);
      btnDeleteSelected.title = canShowBulkDelete ? 'Eliminar seleccionados' : 'Sin permiso para eliminar seleccionados';
    }

    if (btnMergeSelectedToToday) {
      btnMergeSelectedToToday.classList.add('d-none');
      btnMergeSelectedToToday.disabled = true;
      btnMergeSelectedToToday.setAttribute('aria-disabled', 'true');
    }

    Array.from(body?.getElementsByTagName('tr') || []).forEach(tr => applyRolePermissionsToRow(tr, isEditingLocked()));
    refreshMobileChecklistCards();
    updateRequestFlowUI();
  }

  function setHistoricalViewMode(_isHistorical) {
    const histModeText = document.getElementById('histViewModeText');
    const disableEditing = isEditingLocked();
    const modeMessage = getEditingModeMessage();

    if (histModeText) {
      histModeText.classList.remove('text-muted', 'text-primary', 'text-success');
      histModeText.textContent = modeMessage.text;
      histModeText.classList.add(modeMessage.className);
    }

    if (searchInput) searchInput.disabled = disableEditing;
    if (btnScan) btnScan.disabled = disableEditing;
    if (btnFilePick) btnFilePick.disabled = disableEditing;
    if (fileScan) fileScan.disabled = disableEditing;
    if (disableEditing && mediaStream) stopScanner();

    if (btnSave) btnSave.disabled = disableEditing;
    if (btnClear) btnClear.disabled = disableEditing;

    [...body.getElementsByTagName('tr')].forEach(tr => {
      applyRolePermissionsToRow(tr, disableEditing);
    });

    updateHistoricalLockUI();
    updateHistoricalSelectionUI();
    updateBulkSelectionUI();
    updateRequisitionUI();
    updateRequestFlowUI();
  }


  function isEditingLocked() {
    return isWarehouseWaitingForRequest() || isHistoricalEditingLocked() || isProtectedVersionEditingLocked() || isBranchRequestEditingLocked();
  }

  // --- Centrar siempre el elemento que tiene el foco (buscador o cantidad) ---
  function centerOnElement(el) {
    if (!el || isCompactScreen()) return;
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      const middle = absoluteTop - (window.innerHeight / 2) + rect.height / 2;
      window.scrollTo({ top: middle, behavior: 'smooth' });
    }, 0);
  }

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t === searchInput || t.classList.contains('qty')) {
      centerOnElement(t);
    }
  });

  document.addEventListener('click', (e) => {
    if (!moreActionsMenu?.hasAttribute('open')) return;
    const target = e.target;
    if (target instanceof Node && !moreActionsMenu.contains(target)) {
      closeMoreActionsMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMoreActionsMenu();
    }
  });

  function updateStoreUI() {
    const val = storeSelect.value;
    const storeShell = storeSelect ? storeSelect.closest('.store-select-shell') : null;

    storeBadge.classList.remove('badge-sexta', 'badge-morazan', 'badge-centro');
    if (storeShell) {
      storeShell.classList.remove('store-tone-sexta', 'store-tone-morazan', 'store-tone-centro');
    }

    if (val === '__all__') {
      storeBadge.classList.add('badge-morazan');
      storeBadgeText.textContent = 'Todas las sucursales';
      if (storeShell) storeShell.classList.add('store-tone-morazan');
    } else if (val === 'lista_sexta_calle') {
      storeBadge.classList.add('badge-sexta');
      storeBadgeText.textContent = 'Sexta Calle';
      if (storeShell) storeShell.classList.add('store-tone-sexta');
    } else if (val === 'lista_avenida_morazan') {
      storeBadge.classList.add('badge-morazan');
      storeBadgeText.textContent = 'Avenida Morazán';
      if (storeShell) storeShell.classList.add('store-tone-morazan');
    } else {
      storeBadge.classList.add('badge-centro');
      storeBadgeText.textContent = 'Centro Comercial';
      if (storeShell) storeShell.classList.add('store-tone-centro');
    }
  }
  restrictOperatorStoreAccess();
  applyRolePermissions();
  updateStoreUI();




  function renumber() {
    [...body.getElementsByTagName('tr')].forEach((row, idx) => {
      row.cells[COL_INDEX.rowNumber].textContent = (body.rows.length - idx);
    });
  }


  function findExistingRowByItem(item) {
    return [...body.getElementsByTagName('tr')].find(tr => itemsMatch(buildChecklistItemFromRow(tr), item)) || null;
  }

  function clearSearchUI() {
    suggestions.innerHTML = '';
    currentFocus = -1;
    if (searchInput) searchInput.value = '';
    if (primarySearchMode === 'list') {
      applyListSearchFilter();
    }
  }

  function flashAndFocusRow(tr, preferredTarget = 'qty') {
    if (!tr) return;

    revealRowForLocate(tr);

    tr.classList.remove('row-existing-highlight');
    void tr.offsetWidth;
    tr.classList.add('row-existing-highlight');

    window.setTimeout(() => {
      tr.classList.remove('row-existing-highlight');
    }, 3800);

    if (isCompactScreen()) {
      refreshMobileChecklistCards();
      const card = getMobileCardForRow(tr);
      if (!card) return;

      card.classList.remove('mobile-card-locate-highlight');
      void card.offsetWidth;
      card.classList.add('mobile-card-locate-highlight');
      window.setTimeout(() => {
        card.classList.remove('mobile-card-locate-highlight');
      }, 3800);

      const scrollCardIntoView = () => {
        const cardRect = card.getBoundingClientRect();
        const absoluteTop = cardRect.top + window.pageYOffset;
        const targetTop = Math.max(0, absoluteTop - ((window.innerHeight - cardRect.height) / 2));
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      };

      window.setTimeout(scrollCardIntoView, 30);
      return;
    }

    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      const qtyInput = tr.querySelector('.qty');
      const dispatchBtn = getDispatchButton(tr);
      const reviewBtn = getReviewButton(tr);
      const focusTarget =
        (preferredTarget === 'dispatch' ? dispatchBtn : null) ||
        qtyInput ||
        dispatchBtn ||
        reviewBtn ||
        tr;

      if (focusTarget === tr) {
        tr.setAttribute('tabindex', '-1');
      }

      try {
        focusTarget.focus({ preventScroll: true });
      } catch (_) {
        try { focusTarget.focus(); } catch (_) {}
      }
    }, 220);
  }

  function ensureRowDispatched(tr) {
    const btnDes = getDispatchButton(tr);
    if (!btnDes) return false;

    const wasDispatched = btnDes.classList.contains('on');
    if (!wasDispatched) {
      setToggleState(btnDes, true);
    }
    return !wasDispatched;
  }


  function isHistoricalEditingLocked() {
    const today = (typeof getTodayString === 'function') ? getTodayString() : null;
    return !!(currentViewDate && today && currentViewDate !== today && !historicalUnlockEnabled);
  }

  function updateLastSavedText(updatedAt, emptyText = 'Aún no guardado.') {
    lastUpdateISO = updatedAt || null;
    lastSaved.innerHTML =
      '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
      (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : emptyText);
  }

  async function persistCurrentChecklist(options = {}) {
    if (isWarehouseWaitingForRequest()) {
      await Swal.fire('Sin solicitud abierta', 'Bodega debe abrir una solicitud desde la bandeja antes de guardar cambios.', 'info');
      return { ok: false, reason: 'warehouse_no_request' };
    }

    const {
      successTitle = 'Guardado',
      successMessage = 'Checklist guardado correctamente.',
      successIcon = 'success',
      showSuccess = true
    } = options || {};

    if (isEditingLocked()) {
      await showEditingLockedAlert('guardar cambios');
      return { ok: false, reason: 'locked' };
    }

    if (!(await enforceCurrentStoreAccess('guardar información'))) {
      return { ok: false, reason: 'store_denied' };
    }

    return withLoading('Guardando checklist...', async () => {
      const docId = getDocIdForCurrentList();
      const payload = collectPayload();
      const targetDay = getTargetChecklistDate();

      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);
      if (isBranchOperator()) {
        requestFlowState = buildRequestSummaryFromRecord(payload);
      } else if (activeWarehouseRequest) {
        await syncActiveWarehouseRequest();
      }
      updateLastSavedText(payload.meta?.updatedAt || null);
      resetAutoSaveBaseline();
      await refreshHistoryPicker();
      updateRequestFlowUI();

      resetAutoSaveBaseline();

      if (showSuccess) {
        await Swal.fire(successTitle, successMessage, successIcon);
      }

      return { ok: true, docId, payload, targetDay };
    });
  }

  async function promptExistingRowAction(item, existingRow) {
    const isAlreadyDispatched = getDispatchButton(existingRow)?.classList.contains('on');
    const safeName = escapeHtml(item?.nombre || 'Este producto');
    let selectedAction = 'cancel';

    await Swal.fire({
      title: 'Producto ya agregado',
      html: `
        <div class="text-start small text-muted mb-3">
          <strong>${safeName}</strong> ya existe en la lista actual. ¿Qué deseas hacer?
        </div>
        <div class="d-grid gap-2 existing-item-actions">
          <button type="button" class="btn btn-primary" data-action="locate">
            <i class="fa-solid fa-location-crosshairs me-1"></i>
            ${isCompactScreen() ? 'Ubicar producto' : 'Ubicarme en esa fila'}
          </button>
          <button type="button" class="btn btn-success" data-action="dispatch" ${isAlreadyDispatched ? 'disabled' : ''}>
            <i class="fa-solid fa-truck-ramp-box me-1"></i>
            ${isAlreadyDispatched ? 'Ya está marcado como despachado' : 'Marcarlo como despachado y guardar'}
          </button>
          <button type="button" class="btn btn-outline-secondary" data-action="duplicate">
            <i class="fa-solid fa-plus me-1"></i>
            Agregar otra fila de todas formas
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      returnFocus: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        popup.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action') || 'cancel';
            if (action === 'dispatch' && btn.hasAttribute('disabled')) {
              return;
            }
            selectedAction = action;
            Swal.close();
          });
        });
      }
    });

    return selectedAction;
  }

  
  async function handleExistingRowAction(existingRow) {
    if (!existingRow) return false;

    const existingItem = buildChecklistItemFromRow(existingRow);
    const action = await promptExistingRowAction(existingItem, existingRow);

    if (action === 'duplicate') {
      addRowFromData(existingItem, { focusQuantity: true });
      return true;
    }

    if (action === 'dispatch') {
      const dispatchBtn = getDispatchButton(existingRow);
      const changed = ensureRowDispatched(existingRow);
      flashAndFocusRow(existingRow, 'dispatch');

      if (!changed) {
        await Swal.fire('Sin cambios', 'Ese producto ya estaba marcado como despachado.', 'info');
        return true;
      }

      try {
        await persistCurrentChecklist({
          successTitle: 'Despachado',
          successMessage: 'El producto existente se marcó como despachado y se guardó automáticamente.'
        });
      } catch (e) {
        if (dispatchBtn) {
          setToggleState(dispatchBtn, false);
        }
        flashAndFocusRow(existingRow, 'dispatch');
        await Swal.fire(
          'Error',
          'Se marcó el producto en pantalla, pero no se pudo guardar automáticamente. ' + String(e),
          'error'
        );
      }
      return true;
    }

    if (action === 'locate') {
      window.setTimeout(() => {
        flashAndFocusRow(existingRow, 'qty');
      }, isCompactScreen() ? 160 : 60);
      return true;
    }

    return action !== 'cancel';
  }

async function handleProductSelection(item) {
    if (isWarehouseWaitingForRequest()) {
      await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de agregar productos.', 'info');
      return;
    }

    if (isBranchOperator() && !isRequestDraftStatus(requestFlowState?.status)) {
      await Swal.fire('Lista no iniciada', 'Presiona “Iniciar lista” antes de agregar productos.', 'info');
      return;
    }

    const existingRow = findExistingRowByItem(item);

    if (!existingRow) {
      addRowFromData(item, { focusQuantity: true });
      clearSearchUI();
      if (!suppressProductAddedToast) {
        showScanToast('success', 'Producto agregado', item?.nombre || 'Producto agregado', { timeout: 2400 });
      }
      queueAutoSave('producto agregado');
      return;
    }

    clearSearchUI();
    const existingChanged = await handleExistingRowAction(existingRow);
    if (existingChanged) queueAutoSave('producto existente actualizado');
  }

  function collectPayload(options = {}) {
    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    const meta = buildChecklistMeta();

    if (isBranchOperator()) {
      const now = new Date().toISOString();
      const status = options.requestStatus || requestFlowState?.status || 'draft';
      meta.request_status = status;
      meta.solicitud_status = status;
      meta.request_id = options.requestId || requestFlowState?.requestId || getCurrentRequestIdForToday();
      meta.request_created_at = options.requestCreatedAt || requestFlowState?.createdAt || now;
      meta.request_submitted_at = options.requestSubmittedAt || requestFlowState?.submittedAt || null;
      meta.request_item_count = items.length;
    }

    return {
      meta,
      items
    };
  }

  // === MOVER ÍTEM ENTRE LISTAS (persistiendo origen y destino) ===
  async function moveRowToAnotherList(tr) {
    try {
      if (isEditingLocked()) {
        await showEditingLockedAlert('mover productos');
        return;
      }

      if (!(await enforceCurrentStoreAccess('mover productos'))) return;

      const storeKey = storeSelect.value;
      const fromKey = versionSelect.value;
      const destinationKeys = getDestinationVersionKeys(storeKey, fromKey);

      if (!destinationKeys.length) {
        await Swal.fire(
          'Configuración incompleta',
          'No hay otra lista disponible como destino para esta tienda.',
          'error'
        );
        return;
      }

      const destinationOptions = Object.fromEntries(
        destinationKeys.map(versionKey => [versionKey, getVersionLabel(versionKey)])
      );

      const selection = await Swal.fire({
        title: 'Mover producto',
        input: 'select',
        inputOptions: destinationOptions,
        inputPlaceholder: 'Selecciona la lista destino',
        showCancelButton: true,
        confirmButtonText: 'Mover',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) return 'Debes seleccionar una lista destino.';
          if (value === fromKey) return 'Debes seleccionar una lista distinta.';
          return undefined;
        }
      });

      if (!selection.isConfirmed) return;

      const toKey = selection.value;
      const hasProtectedDestinationAccess = await ensureProtectedDestinationAccess(
        toKey,
        'mover este producto'
      );

      if (!hasProtectedDestinationAccess) {
        return;
      }

      const fromDoc = getBinId(storeKey, fromKey);
      const toDoc = getBinId(storeKey, toKey);

      if (!fromDoc || !toDoc) {
        await Swal.fire(
          'Configuración incompleta',
          'No se encontró el identificador de la lista origen o destino para esta tienda.',
          'error'
        );
        return;
      }

      const tiendaName = storeSelect.options[storeSelect.selectedIndex].text;
      const item = buildChecklistItemFromRow(tr);

      const day = getTargetChecklistDate();
      let destRec = await loadChecklistFromFirestore(toDoc, day);
      if (!destRec || !Array.isArray(destRec.items)) {
        destRec = {
          meta: buildChecklistMeta({
            storeKey,
            storeName: tiendaName,
            versionKey: toKey,
            requisitionDone: false,
            requisitionDoneAt: null,
            updatedAt: null
          }),
          items: []
        };
      }

      if (findMatchingItemInArray(destRec.items, item)) {
        await Swal.fire(
          'Sin cambios',
          'Ese producto ya existe en la lista destino. No se movió para evitar duplicados.',
          'info'
        );
        return;
      }

      destRec.items.push(item);
      destRec.meta = buildChecklistMeta({
        storeKey,
        storeName: tiendaName,
        versionKey: toKey,
        requisitionDone: !!destRec.meta?.requisition_done,
        requisitionDoneAt: destRec.meta?.requisition_done_at || null
      });

      await saveChecklistToFirestore(toDoc, destRec, day);

      tr.remove();
      renumber();

      const payloadFrom = collectPayload();
      await saveChecklistToFirestore(fromDoc, payloadFrom, day);

      lastUpdateISO = payloadFrom.meta.updatedAt;
      lastSaved.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
        'Última actualización: ' +
        formatSV(lastUpdateISO);

      await refreshHistoryPicker();

      await Swal.fire(
        'Movimiento realizado',
        'El producto se movió a la lista ' + getVersionLabel(toKey) + ' de esta tienda.',
        'success'
      );
    } catch (err) {
      console.error(err);
      await Swal.fire('Error', 'No se pudo mover el producto entre listas. Intenta de nuevo.', 'error');
    }
  }

  function addRowFromData(item, options = {}) {
    const tr = document.createElement('tr');
    ensureRowDomId(tr);
    const qtyValue = htmlAttrEscape(item.cantidad ?? '');
    tr.innerHTML = `
      <td class="text-center sticky-col-select row-bulk-select-cell">
        <input
          type="checkbox"
          class="form-check-input row-bulk-select-checkbox"
          aria-label="Seleccionar fila"
        >
      </td>
      <td></td>
      <td>${item.codigo_barras || ''}</td>
      <td>${item.nombre || ''}</td>
      <td>${item.codigo_inventario || 'N/A'}</td>
      <td>${item.bodega || ''}</td>
      <td>
        <input type="text" class="form-control form-control-sm qty" value="${qtyValue}" placeholder="0">
      </td>
      <td class="text-center">
        <div class="row-actions-grid" role="group" aria-label="Acciones de fila">
          <button class="btn btn-sm btn-outline-primary btn-toggle btn-toggle-review ${item.revisado ? 'on' : 'off'}" title="Encontrado en bodega" aria-label="Marcar encontrado en bodega">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-success btn-toggle btn-toggle-dispatch ${item.despachado ? 'on' : 'off'}" title="Despachado" aria-label="Marcar despachado">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary btn-delete-row" title="Eliminar fila" aria-label="Eliminar fila">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    body.insertBefore(tr, body.firstChild);
    applyResponsiveRowLabels(tr);
    renumber();

    const btnRev = getReviewButton(tr);
    const btnDes = getDispatchButton(tr);
    const btnMove = getMoveButton(tr);
    const btnDel = getDeleteButton(tr);
    const bulkSelect = tr.querySelector('.row-bulk-select-checkbox');

    if (btnRev) {
      btnRev.addEventListener('click', () => {
        toggleBtn(btnRev);
        refreshMobileChecklistCards();
        queueAutoSave('marcar revisado');
      });
    }

    if (btnDes) {
      btnDes.addEventListener('click', () => {
        toggleBtn(btnDes);
        refreshMobileChecklistCards();
        queueAutoSave('marcar despachado');
        updateActiveRequestDispatchVisualStatus();
      });
    }

    if (bulkSelect) {
      bulkSelect.addEventListener('change', () => {
        updateBulkSelectionUI();
      });
    }

    if (btnMove) {
      btnMove.addEventListener('click', async () => {
        await moveRowToAnotherList(tr);
      });
    }

    if (btnDel) {
      btnDel.addEventListener('click', async () => {
        if (!canDeleteRows()) {
          await showRoleDeniedAlert('quitar productos', 'usuarios autorizados');
          return;
        }

        Swal.fire({
          title: '¿Eliminar ítem?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Eliminar'
        }).then(res => {
          if (res.isConfirmed) {
            tr.remove();
            renumber();
            updateBulkSelectionUI();
            updateHistoricalSelectionUI();
            applyListSearchFilter();
            refreshMobileChecklistCards();
            queueAutoSave('eliminar producto');
          }
        });
      });
    }

    applyRolePermissionsToRow(tr, isEditingLocked());
    if (!isBulkRenderingRows) {
      updateHistoricalSelectionUI();
      updateBulkSelectionUI();
    }

    const qtyInput = tr.querySelector('.qty');
    if (qtyInput) {
      bindQtyPreview(qtyInput);
      if (options.focusQuantity && !isCompactScreen()) {
        qtyInput.focus();
      }
      qtyInput.addEventListener('input', () => {
        refreshMobileChecklistCards();
        updateListSearchMeta();
        queueAutoSave('cantidad');
      });
      qtyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !isCompactScreen()) {
          ev.preventDefault();
          focusSearchInput({ center: false, select: true });
        }
      });
    }

    if (!isBulkRenderingRows) {
      applyListSearchFilter();
    }
  }

  function renderChecklistItems(items = []) {
    const list = Array.isArray(items) ? items : [];
    isBulkRenderingRows = true;
    try {
      list.forEach(item => addRowFromData(item, { focusQuantity: false }));
    } finally {
      isBulkRenderingRows = false;
    }
    renumber();
    updateHistoricalSelectionUI();
    updateBulkSelectionUI();
    applyListSearchFilter();
    refreshMobileChecklistCards();
  }


  // --- Autocomplete search ---
  let currentFocus = -1;
  let rowDomIdCounter = 0;

  if (btnSearchModeToggle) {
    btnSearchModeToggle.addEventListener('click', () => {
      primarySearchMode = primarySearchMode === 'catalog' ? 'list' : 'catalog';
      updatePrimarySearchModeUI();

      if (primarySearchMode === 'list') {
        syncPrimarySearchToListSearch();
        if (!isCompactScreen()) {
          focusSearchInput({ center: false, select: true });
        }
        return;
      }

      suggestions.innerHTML = '';
      currentFocus = -1;
      applyListSearchFilter();
      focusSearchInput({ center: true, select: true });
    });
  }
  searchInput.addEventListener('input', () => {
    const rawValue = (searchInput.value || '').replace(/\r|\n/g, '');
    const q = rawValue.trim();
    clearCatalogSearchTimer();
    suggestions.innerHTML = '';
    currentFocus = -1;

    if (primarySearchMode === 'list') {
      syncPrimarySearchToListSearch();
      return;
    }

    if (!q) {
      lastCatalogQuery = '';
      return;
    }

    lastCatalogQuery = q;
    catalogSearchRenderTimer = window.setTimeout(async () => {
      const rows = await loadProductsFromGoogleSheets();
      if (lastCatalogQuery !== q || primarySearchMode !== 'catalog') return;
      renderCatalogSuggestions(rows, q);
    }, 90);
  });



  async function handlePrimarySearchSubmit() {
    if (primarySearchMode === 'list') {
      syncPrimarySearchToListSearch();

      const firstMatch = getTableRows().find(tr => rowMatchesCurrentListSearch(tr));
      if (firstMatch) {
        flashAndFocusRow(firstMatch, 'qty');
      }
      return;
    }

    const q = (searchInput?.value || '').replace(/\r|\n/g, '').trim();
    if (!q) return;

    const existingRow = findExistingRowByCode(q);
    if (existingRow) {
      clearSearchUI();
      await handleExistingRowAction(existingRow);
      return;
    }

    const rows = (window.CATALOGO_CACHE && window.CATALOGO_CACHE.length)
      ? window.CATALOGO_CACHE
      : await loadProductsFromGoogleSheets();
    let match = null;
    for (const r of rows) {
      const bar = r[3] ? String(r[3]).trim() : '';
      const cod = r[1] ? String(r[1]).trim() : '';
      if (bar === q || cod === q) {
        match = r;
        break;
      }
    }

    if (match) {
      await handleProductSelection(buildItemFromCatalogRow(match, q));
    }
  }

  searchInput.addEventListener('keydown', async (e) => {
    if (primarySearchMode === 'list') {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handlePrimarySearchSubmit();
      }
      return;
    }

    const items = suggestions.getElementsByTagName('li');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      addActive(items);
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      addActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1 && items[currentFocus]) {
        items[currentFocus].click();
      } else {
        await handlePrimarySearchSubmit();
      }
    }
  });

  function addActive(items) {
    if (!items || !items.length) return;
    [...items].forEach(x => x.classList.remove('active'));
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('active');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
  }

  // --- Cerrar sugerencias al hacer click fuera del buscador y de la lista ---
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target === searchInput || suggestions.contains(target)) return;
    suggestions.innerHTML = '';
    currentFocus = -1;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      suggestions.innerHTML = '';
      currentFocus = -1;
    }
  });

  // Group by bodega
  function groupByBodega() {
    const groups = {};
    [...body.getElementsByTagName('tr')].forEach(tr => {
      const bod = tr.cells[COL_INDEX.warehouse].innerText.trim() || 'SIN_BODEGA';
      if (!groups[bod]) groups[bod] = [];
      groups[bod].push(tr);
    });
    return groups;
  }

  function getWarehouseNames() {
    return Object.keys(groupByBodega()).sort((a, b) => a.localeCompare(b, 'es'));
  }

  function sanitizeFilePart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'archivo';
  }

  async function promptExportFormat() {
    let selectedFormat = '';

    await Swal.fire({
      title: 'Exportar checklist',
      html: `
        <div class="d-grid gap-2 export-format-actions">
          <button type="button" class="btn btn-danger" data-export-format="pdf">
            <i class="fa-solid fa-file-pdf me-1"></i>
            PDF
          </button>
          <button type="button" class="btn btn-success" data-export-format="excel">
            <i class="fa-solid fa-file-excel me-1"></i>
            Excel
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        popup.querySelectorAll('[data-export-format]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedFormat = String(btn.getAttribute('data-export-format') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedFormat || null;
  }

  async function promptPdfVariant() {
    let selectedVariant = '';

    await Swal.fire({
      title: 'Tipo de PDF',
      html: `
        <div class="d-grid gap-2 export-scope-actions">
          <button type="button" class="btn btn-danger" data-pdf-variant="fleteros">
            <i class="fa-solid fa-truck-ramp-box me-1"></i>
            PDF fleteros
          </button>
          <button type="button" class="btn btn-outline-danger" data-pdf-variant="reporte">
            <i class="fa-solid fa-file-lines me-1"></i>
            PDF reporte
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        popup.querySelectorAll('[data-pdf-variant]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedVariant = String(btn.getAttribute('data-pdf-variant') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedVariant || null;
  }

  async function promptExportMode(formatLabel) {
    let selectedMode = '';

    await Swal.fire({
      title: 'Exportar ' + formatLabel,
      html: `
        <div class="d-grid gap-2 export-scope-actions">
          <button type="button" class="btn btn-primary" data-export-scope="general">
            <i class="fa-solid fa-file-lines me-1"></i>
            Un solo archivo
          </button>
          <button type="button" class="btn btn-outline-primary" data-export-scope="warehouses">
            <i class="fa-solid fa-warehouse me-1"></i>
            Separado por bodega
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        popup.querySelectorAll('[data-export-scope]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedMode = String(btn.getAttribute('data-export-scope') || '').trim();
            Swal.close();
          });
        });
      }
    });

    return selectedMode || null;
  }

  async function promptWarehouseSelection(formatLabel) {
    const warehouseNames = getWarehouseNames();

    if (!warehouseNames.length) {
      await Swal.fire('Sin bodegas', 'No se encontraron bodegas disponibles para exportar.', 'info');
      return null;
    }

    const optionsHtml = warehouseNames.map((name) => `
      <label class="warehouse-export-option">
        <input type="checkbox" class="form-check-input warehouse-export-checkbox" value="${htmlAttrEscape(name)}">
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    const result = await Swal.fire({
      title: 'Bodegas para ' + formatLabel,
      html: `
        <div class="text-start">
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-primary" id="btnWarehouseSelectAll">Todas las bodegas</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnWarehouseClearAll">Limpiar</button>
          </div>
          <div class="small text-muted mb-2">Esta opción genera archivos separados por bodega.</div>
          <div class="warehouse-export-list">
            ${optionsHtml}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;
        const checkboxes = [...popup.querySelectorAll('.warehouse-export-checkbox')];
        popup.querySelector('#btnWarehouseSelectAll')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = true; });
        });
        popup.querySelector('#btnWarehouseClearAll')?.addEventListener('click', () => {
          checkboxes.forEach(cb => { cb.checked = false; });
        });
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const checkboxes = popup ? [...popup.querySelectorAll('.warehouse-export-checkbox:checked')] : [];
        const selected = checkboxes.map(cb => String(cb.value || '').trim()).filter(Boolean);

        if (!selected.length) {
          Swal.showValidationMessage('Selecciona al menos una bodega.');
          return false;
        }

        return selected;
      }
    });

    return result.isConfirmed ? (result.value || []) : null;
  }

  function buildPdfRows(rowsTr, variant = 'fleteros') {
    return rowsTr.map((tr, i) => {
      const codBar = tr.cells[COL_INDEX.barcode].innerText.trim();
      const nombre = tr.cells[COL_INDEX.name].innerText.trim();
      const codInv = tr.cells[COL_INDEX.inventoryCode].innerText.trim();
      const bodega = tr.cells[COL_INDEX.warehouse].innerText.trim();
      const cantidadTxt = tr.querySelector('.qty')?.value.trim() || '';
      const revisado = getReviewButton(tr)?.classList.contains('on') ? 'Sí' : 'No';
      const despachado = getDispatchButton(tr)?.classList.contains('on') ? 'Sí' : 'No';

      if (variant === 'reporte') {
        return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, revisado, despachado];
      }

      return [i + 1, codBar, nombre, codInv, bodega, cantidadTxt, '', ''];
    });
  }

  function getPdfHeadRow(variant = 'fleteros') {
    if (variant === 'reporte') {
      return ['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Revisado', 'Despachado'];
    }
    return ['#', 'Código de barras', 'Nombre', 'Código inventario', 'Bodega', 'Cantidad', 'Ajuste envío', 'Rev. Sí / No'];
  }

  function getPdfVariantMeta(variant = 'fleteros') {
    if (variant === 'reporte') {
      return {
        label: 'reporte',
        subtitle: 'Reporte',
        successGeneral: 'Se generó el PDF reporte general.',
        successWarehouse: 'Se generó el PDF reporte de la bodega seleccionada.',
        successZip: 'Se generó un ZIP con los PDFs reporte de las bodegas seleccionadas.',
        fileSuffixGeneral: 'Checklist_REPORTE_GENERAL',
        fileSuffixWarehouse: 'Checklist_REPORTE'
      };
    }

    return {
      label: 'fleteros',
      subtitle: 'Fleteros',
      successGeneral: 'Se generó el PDF para fleteros.',
      successWarehouse: 'Se generó el PDF para fleteros de la bodega seleccionada.',
      successZip: 'Se generó un ZIP con los PDFs para fleteros de las bodegas seleccionadas.',
      fileSuffixGeneral: 'Checklist_FLETEROS_GENERAL',
      fileSuffixWarehouse: 'Checklist_FLETEROS'
    };
  }

  function saveBlobFile(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  async function writePdfHeader(doc, tienda, fechaActual, subtitle, extraLine = '') {
    const startX = 12;
    const topY = 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TRLista · ' + subtitle, startX, topY + 4);

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    const infoLine = [tienda, fechaActual].filter(Boolean).join(' · ');
    doc.text(infoLine, startX, topY + 9);

    if (extraLine) {
      const trimmed = String(extraLine || '').trim();
      if (trimmed) {
        doc.text(trimmed, startX, topY + 14);
        return 27;
      }
    }

    return 22;
  }

  function getPdfTableConfig(variant = 'fleteros') {
    const pdfBlue = [63, 133, 214];
    const isReporte = variant === 'reporte';
    return {
      headStyles: {
        fontStyle: 'bold',
        fillColor: pdfBlue,
        textColor: [255, 255, 255]
      },
      columnStyles: isReporte
        ? {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 30 },
            2: { cellWidth: 78 },
            3: { cellWidth: 24 },
            4: { cellWidth: 44 },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' }
          }
        : {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 28 },
            2: { cellWidth: 70 },
            3: { cellWidth: 24 },
            4: { cellWidth: 40 },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 22, halign: 'center' },
            7: { cellWidth: 24, halign: 'center' }
          }
    };
  }

  async function exportPDFGeneral(variant = 'fleteros') {

    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const meta = getPdfVariantMeta(variant);

    const rows = buildPdfRows([...body.getElementsByTagName('tr')], variant);
    const startY = await writePdfHeader(doc, tienda, fechaActual, meta.subtitle);

    const pdfTableConfig = getPdfTableConfig(variant);
    doc.autoTable({
      startY,
      head: [getPdfHeadRow(variant)],
      body: rows,
      pageBreak: 'auto',
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
      headStyles: pdfTableConfig.headStyles,
      columnStyles: pdfTableConfig.columnStyles
    });

    const fileName = `${sanitizeFilePart(tienda)}_${fechaActual}_${meta.fileSuffixGeneral}.pdf`;
    doc.save(fileName);
    Swal.fire('Éxito', meta.successGeneral, 'success');
  }

  async function exportPDFPorBodega(selectedWarehouses, variant = 'fleteros') {
    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await Swal.fire('Sin datos', 'No hay productos para las bodegas seleccionadas.', 'info');
      return;
    }

    const { jsPDF } = window.jspdf;
    const meta = getPdfVariantMeta(variant);

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = await writePdfHeader(doc, tienda, fechaActual, meta.subtitle, `Bodega: ${bodega}`);
      const pdfTableConfig = getPdfTableConfig(variant);
      doc.autoTable({
        startY,
        head: [getPdfHeadRow(variant)],
        body: buildPdfRows(rowsTr, variant),
        pageBreak: 'auto',
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: pdfTableConfig.headStyles,
        columnStyles: pdfTableConfig.columnStyles
      });
      doc.save(`${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_${meta.fileSuffixWarehouse}.pdf`);
      await Swal.fire('Éxito', meta.successWarehouse, 'success');
      return;
    }

    const zip = new JSZip();
    for (const [bodega, rowsTr] of selectedGroups) {
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = await writePdfHeader(doc, tienda, fechaActual, meta.subtitle, `Bodega: ${bodega}`);
      const pdfTableConfig = getPdfTableConfig(variant);
      doc.autoTable({
        startY,
        head: [getPdfHeadRow(variant)],
        body: buildPdfRows(rowsTr, variant),
        pageBreak: 'auto',
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: pdfTableConfig.headStyles,
        columnStyles: pdfTableConfig.columnStyles
      });
      zip.file(
        `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_${meta.fileSuffixWarehouse}.pdf`,
        doc.output('arraybuffer')
      );
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlobFile(content, `${sanitizeFilePart(tienda)}_PDF_${meta.label.toUpperCase()}_BODEGAS_${fechaActual}.zip`);
    await Swal.fire('Éxito', meta.successZip, 'success');
  }

  function buildExcelRows(rowsTr) {
    return rowsTr.map(tr => {
      const codigo = tr.cells[COL_INDEX.inventoryCode].innerText.trim();
      const descripcion = tr.cells[COL_INDEX.name].innerText.trim();
      const cantidadInput = tr.querySelector('.qty')?.value.trim() || '0';
      const cantidad = (cantidadInput.match(/\d+/g)) ? parseInt(cantidadInput.match(/\d+/g).join('')) : 0;
      const lote = '';
      const fechaVence = new Date(1900, 0, 1);
      return [codigo, descripcion, cantidad, lote, fechaVence];
    });
  }

  function buildExcelWorkbook(rowsTr) {
    const finalData = [['Codigo', 'Descripcion', 'Cantidad', 'Lote', 'FechaVence'], ...buildExcelRows(rowsTr)];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C <= range.e.c; ++C) {
      for (let R = 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) continue;
        if (C === 0 || C === 1 || C === 3) ws[cellRef].t = 's';
        else if (C === 2) ws[cellRef].t = 'n';
        else if (C === 4) {
          ws[cellRef].t = 'd';
          ws[cellRef].z = 'm/d/yyyy';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pedido');
    return wb;
  }

  async function exportExcelPorBodega(selectedWarehouses) {
    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const groups = groupByBodega();
    const selectedGroups = selectedWarehouses
      .filter(name => groups[name]?.length)
      .map(name => [name, groups[name]]);

    if (!selectedGroups.length) {
      await Swal.fire('Sin datos', 'No hay productos para las bodegas seleccionadas.', 'info');
      return;
    }

    if (selectedGroups.length === 1) {
      const [bodega, rowsTr] = selectedGroups[0];
      const wb = buildExcelWorkbook(rowsTr);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.xlsx`);
      await Swal.fire('Éxito', 'Se generó el Excel de la bodega seleccionada.', 'success');
      return;
    }

    const zip = new JSZip();
    selectedGroups.forEach(([bodega, rowsTr]) => {
      const wb = buildExcelWorkbook(rowsTr);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(
        `${sanitizeFilePart(tienda)}_${sanitizeFilePart(bodega)}_${fechaActual}_Checklist.xlsx`,
        wbout
      );
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlobFile(content, `${sanitizeFilePart(tienda)}_EXCEL_BODEGAS_${fechaActual}.zip`);
    await Swal.fire('Éxito', 'Se generó un ZIP con los Excel de las bodegas seleccionadas.', 'success');
  }

  function exportExcelGeneral() {
    const fechaActual = (typeof getTodayString === 'function' ? getTodayString() : '');
    const tienda = storeSelect.options[storeSelect.selectedIndex].text.trim() || 'Tienda';
    const wb = buildExcelWorkbook([...body.getElementsByTagName('tr')]);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveBlobFile(blob, `${sanitizeFilePart(tienda)}_${fechaActual}_Checklist_GENERAL.xlsx`);
    Swal.fire('Éxito', 'Se generó el Excel general.', 'success');
  }

  async function handleExportRequest(preferredFormat = '') {
    if (body.rows.length === 0) {
      await Swal.fire('Error', 'No hay productos en la lista para exportar.', 'error');
      return;
    }

    let format = preferredFormat;
    let pdfVariant = 'fleteros';

    if (!format) {
      format = await promptExportFormat();
      if (!format) return;
    }

    if (format === 'pdf') {
      pdfVariant = await promptPdfVariant();
      if (!pdfVariant) return;
    }

    const mode = await promptExportMode(format === 'pdf' ? ('PDF ' + pdfVariant) : 'Excel');
    if (!mode) return;

    if (mode === 'general') {
      if (format === 'pdf') {
        await withLoading('Generando PDF...', async () => {
          await exportPDFGeneral(pdfVariant);
        });
      } else {
        await withLoading('Generando Excel...', async () => {
          exportExcelGeneral();
        });
      }
      return;
    }

    const warehouses = await promptWarehouseSelection(format === 'pdf' ? ('PDF ' + pdfVariant) : 'Excel');
    if (!warehouses) return;

    if (format === 'pdf') {
      await withLoading('Generando PDF por bodega...', async () => {
        await exportPDFPorBodega(warehouses, pdfVariant);
      });
    } else {
      await withLoading('Generando Excel por bodega...', async () => {
        await exportExcelPorBodega(warehouses);
      });
    }
  }

  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      closeMoreActionsMenu();
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('exportar checklist', 'bodega o administradores');
        return;
      }
      if (!canWarehouseEditActiveRequest()) {
        await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de exportar.', 'info');
        return;
      }
      await handleExportRequest();
    });
  }

  if (mobileFabToggle) {
    mobileFabToggle.addEventListener('click', () => {
      const expanded = mobileFabToggle.getAttribute('aria-expanded') === 'true';
      setMobileFabOpen(!expanded);
    });
  }

  if (mobileFabBackdrop) {
    mobileFabBackdrop.addEventListener('click', closeMobileFab);
  }

  if (btnFabSearchList) {
    btnFabSearchList.addEventListener('click', async () => {
      await openInsertedRowsSearch();
    });
  }

  if (btnFabSortWarehouse) {
    btnFabSortWarehouse.addEventListener('click', () => {
      closeMobileFab();
      sortByBodega({ preserveSelection: true });
    });
  }

  if (btnFabSave) {
    btnFabSave.addEventListener('click', async () => {
      closeMobileFab();
      await persistCurrentChecklist({
        successTitle: 'Guardado',
        successMessage: 'Checklist guardado correctamente.'
      });
    });
  }

  if (btnFabExport) {
    btnFabExport.addEventListener('click', async () => {
      closeMobileFab();
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('exportar checklist', 'bodega o administradores');
        return;
      }
      if (!canWarehouseEditActiveRequest()) {
        await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de exportar.', 'info');
        return;
      }
      await handleExportRequest();
    });
  }

  if (btnFabScrollTop) {
    btnFabScrollTop.addEventListener('click', () => {
      closeMobileFab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMobileFab();
    }
  });

  window.addEventListener('resize', () => {
    if (!isCompactScreen()) {
      closeMobileFab();
    }
  });


  // Sort by Bodega via header only
  function sortByBodega(options = {}) {
    const { preserveSelection = true } = options || {};
    const rows = Array.from(body.querySelectorAll('tr'));
    if (!rows.length) return { count: 0, direction: sortAsc ? 'asc' : 'desc' };

    const selectedRowIds = preserveSelection
      ? new Set(
          rows
            .filter(row => row.querySelector('.row-select-checkbox')?.checked)
            .map(row => String(row.dataset.rowId || ''))
            .filter(Boolean)
        )
      : new Set();

    rows.sort((a, b) => {
      const A = (a.cells[COL_INDEX.warehouse]?.innerText || '').trim().toLowerCase();
      const B = (b.cells[COL_INDEX.warehouse]?.innerText || '').trim().toLowerCase();
      return (sortAsc ? A.localeCompare(B) : B.localeCompare(A));
    });

    sortAsc = !sortAsc;
    body.innerHTML = '';
    rows.forEach(r => body.appendChild(r));

    if (selectedRowIds.size) {
      rows.forEach(row => {
        const checkbox = row.querySelector('.row-select-checkbox');
        if (!checkbox) return;
        checkbox.checked = selectedRowIds.has(String(row.dataset.rowId || ''));
      });
    }

    renumber();
    updateBulkSelectionUI();
    applyListSearchFilter();

    return {
      count: rows.length,
      direction: sortAsc ? 'desc' : 'asc'
    };
  }
  thBodega.addEventListener('click', () => sortByBodega({ preserveSelection: true }));

  // Clear & persist empty (solo hoy)
  btnClear.addEventListener('click', async () => {
    if (isEditingLocked()) {
      await showEditingLockedAlert('limpiar la lista');
      return;
    }

    if (body.rows.length === 0) return;

    const targetDay = getTargetChecklistDate();

    Swal.fire({
      title: '¿Limpiar checklist?',
      text: 'Se eliminarán todos los items en pantalla y se guardará la fecha seleccionada vacía.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Limpiar'
    }).then(async res => {
      if (res.isConfirmed) {
        await withLoading('Limpiando checklist...', async () => {
          body.innerHTML = '';
          renumber();
          updateBulkSelectionUI();
          applyListSearchFilter();

          const docId = getDocIdForCurrentList();
          const payload = collectPayload();

          await saveChecklistToFirestore(docId, payload, targetDay);
          rememberHistoryDate(docId, targetDay);
          if (activeWarehouseRequest) await syncActiveWarehouseRequest();
          lastUpdateISO = payload.meta.updatedAt;
          lastSaved.innerHTML =
            '<i class="fa-solid fa-clock-rotate-left me-1"></i>' +
            'Última actualización: ' +
            formatSV(lastUpdateISO);

          await refreshHistoryPicker();
        });

        Swal.fire('Listo', 'Checklist guardado vacío correctamente.', 'success');
      }
    });
  });

  btnSave.addEventListener('click', async () => {
    closeMoreActionsMenu();
    try {
      await persistCurrentChecklist();
    } catch (e) {
      Swal.fire('Error', String(e), 'error');
    }
  });

  if (btnToggleRequisition) {
    btnToggleRequisition.addEventListener('click', async () => {
      closeMoreActionsMenu();
      if (!canUseWarehouseTools()) {
        await showRoleDeniedAlert('marcar requisición', 'bodega o administradores');
        return;
      }
      if (isEditingLocked()) {
        await showEditingLockedAlert('marcar la requisición');
        return;
      }

      const prevDone = requisitionDone;
      const prevDoneAt = requisitionDoneAt;
      const nextDone = !requisitionDone;

      requisitionDone = nextDone;
      requisitionDoneAt = nextDone ? new Date().toISOString() : null;
      updateRequisitionUI();

      try {
        await persistCurrentChecklist({
          successTitle: nextDone ? 'Requisición marcada' : 'Requisición pendiente',
          successMessage: nextDone
            ? 'La lista quedó marcada como requisición hecha.'
            : 'La lista quedó marcada como requisición pendiente.'
        });
      } catch (e) {
        requisitionDone = prevDone;
        requisitionDoneAt = prevDoneAt;
        updateRequisitionUI();
        await Swal.fire('Error', String(e), 'error');
      }
    });
  }

  // ===== Histórico =====

  function formatDateISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateISO(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
    const [year, month, day] = String(iso).split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  function sameDay(a, b) {
    return !!(a && b && formatDateISO(a) === formatDateISO(b));
  }

  function getCalendarMonthLabel(date) {
    try {
      return new Intl.DateTimeFormat('es-SV', {
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  function getHistoryCacheKey(docId) {
    return `trlista:history-dates:${docId || 'default'}`;
  }

  function readHistoryDatesCache(docId) {
    if (!docId || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getHistoryCacheKey(docId));
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(v => /^\d{4}-\d{2}-\d{2}$/.test(String(v)));
    } catch (_) {
      return [];
    }
  }

  function writeHistoryDatesCache(docId, values) {
    if (!docId || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        getHistoryCacheKey(docId),
        JSON.stringify(Array.from(new Set((values || []).filter(Boolean))).sort())
      );
    } catch (_) {}
  }

  function rememberHistoryDate(docId, isoDate) {
    if (!docId || !isoDate) return;
    const cached = new Set(readHistoryDatesCache(docId));
    cached.add(isoDate);
    writeHistoryDatesCache(docId, Array.from(cached));
    histDatesWithData = cached;
    if (histPicker && typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }
  }

  function createHistoryPicker() {
    if (!histDateInput || !histCalendarPanel) return null;

    const wrapper = histDateInput.closest('.history-search-shell') || histDateInput.closest('.hist-date-wrapper') || histDateInput.parentElement;
    const shell = histDateInput.closest('.control-shell-history') || histDateInput.closest('.control-shell') || wrapper;
    const weekdayLabels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

    const todayForPicker = (typeof getTodayString === 'function') ? parseDateISO(getTodayString()) : new Date();
    const state = {
      // Internamente currentViewDate=null sigue significando "hoy editable", pero visualmente mostramos hoy.
      selectedDate: currentViewDate ? parseDateISO(currentViewDate) : todayForPicker,
      visibleMonth: startOfMonth(currentViewDate ? parseDateISO(currentViewDate) || todayForPicker : todayForPicker),
      isOpen: false
    };

    function syncInput() {
      histDateInput.value = state.selectedDate ? formatDateISO(state.selectedDate) : '';
      histDateInput.setAttribute('aria-expanded', String(state.isOpen));
      if (shell) {
        shell.classList.toggle('is-open', state.isOpen);
      }
      if (btnHistCalendar) {
        btnHistCalendar.innerHTML = state.isOpen
          ? '<i class="fa-solid fa-chevron-up"></i>'
          : '<i class="fa-solid fa-chevron-down"></i>';
        btnHistCalendar.setAttribute('aria-expanded', String(state.isOpen));
      }
    }

    function close() {
      state.isOpen = false;
      histCalendarPanel.classList.add('d-none');
      histCalendarPanel.setAttribute('aria-hidden', 'true');
      syncInput();
    }

    function open() {
      state.isOpen = true;
      histCalendarPanel.classList.remove('d-none');
      histCalendarPanel.setAttribute('aria-hidden', 'false');
      render();
      syncInput();
    }

    function toggle() {
      state.isOpen ? close() : open();
    }

    function setSelectedDate(isoDate, triggerChange = false) {
      const parsed = isoDate ? parseDateISO(isoDate) : null;
      state.selectedDate = parsed;
      if (parsed) {
        state.visibleMonth = startOfMonth(parsed);
      }
      syncInput();
      render();

      if (parsed && triggerChange) {
        loadHistoryForDate(formatDateISO(parsed));
      }
    }

    function clear() {
      const today = (typeof getTodayString === 'function') ? parseDateISO(getTodayString()) : new Date();
      state.selectedDate = today;
      state.visibleMonth = startOfMonth(today || new Date());
      close();
      syncInput();
      render();
    }

    function destroy() {
      close();
      histCalendarPanel.innerHTML = '';
    }

    function changeMonth(offset) {
      state.visibleMonth = new Date(
        state.visibleMonth.getFullYear(),
        state.visibleMonth.getMonth() + offset,
        1,
        12, 0, 0, 0
      );
      render();
    }

    function render() {
      if (!histCalendarPanel) return;

      const today = parseDateISO(getTodayString()) || new Date();
      const firstDay = startOfMonth(state.visibleMonth);
      const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay(), 12, 0, 0, 0);

      let html = `
        <div class="history-calendar-header">
          <button type="button" class="history-calendar-nav" data-cal-nav="-1" aria-label="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="history-calendar-title">${getCalendarMonthLabel(firstDay)}</div>
          <button type="button" class="history-calendar-nav" data-cal-nav="1" aria-label="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="history-calendar-weekdays">
          ${weekdayLabels.map(label => `<div class="history-calendar-weekday">${label}</div>`).join('')}
        </div>
        <div class="history-calendar-grid">
      `;

      for (let i = 0; i < 42; i++) {
        const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 12, 0, 0, 0);
        const iso = formatDateISO(date);
        const classes = ['history-calendar-day'];

        if (date.getMonth() !== firstDay.getMonth()) classes.push('is-outside');
        if (sameDay(date, today)) classes.push('is-today');
        if (state.selectedDate && sameDay(date, state.selectedDate)) classes.push('is-selected');
        if (histDatesWithData && histDatesWithData.has(iso)) classes.push('has-history');

        html += `
          <button type="button"
            class="${classes.join(' ')}"
            data-cal-date="${iso}"
            aria-label="Seleccionar ${iso}">
            ${date.getDate()}
          </button>
        `;
      }

      html += '</div>';

      if (!histDatesWithData || histDatesWithData.size === 0) {
        html += '<div class="history-calendar-empty">Aún no hay fechas marcadas para esta lista.</div>';
      }

      histCalendarPanel.innerHTML = html;

      histCalendarPanel.querySelectorAll('[data-cal-nav]').forEach(btn => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const offset = Number(btn.getAttribute('data-cal-nav') || 0);
          changeMonth(offset);
        });
      });

      histCalendarPanel.querySelectorAll('[data-cal-date]').forEach(btn => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const iso = btn.getAttribute('data-cal-date');
          setSelectedDate(iso, true);
          close();
        });
      });
    }

    histDateInput.addEventListener('click', (event) => {
      event.stopPropagation();
      toggle();
    });

    histDateInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        close();
      }
    });

    if (shell) {
      shell.addEventListener('click', (event) => {
        if (event.target === histDateInput || event.target.closest('#btnHistToday')) {
          return;
        }

        event.preventDefault();
        toggle();
        histDateInput.focus({ preventScroll: true });
      });
    }

    if (btnHistCalendar) {
      btnHistCalendar.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      });
    }

    document.addEventListener('click', (event) => {
      if (!wrapper || !wrapper.contains(event.target)) {
        close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    syncInput();
    render();

    return {
      clear,
      close,
      destroy,
      open,
      redraw: render,
      setDate: setSelectedDate
    };
  }

  function ensureWarehouseFilterOption() {
    if (!requiresWarehouseRequestContext() || !storeSelect) return;
    if (!Array.from(storeSelect.options).some(option => option.value === '__all__')) {
      const opt = document.createElement('option');
      opt.value = '__all__';
      opt.textContent = 'Todas las sucursales';
      storeSelect.insertBefore(opt, storeSelect.firstChild);
      storeSelect.value = '__all__';
    }
  }

  function ensureWarehouseVersionFilterOption() {
    if (!requiresWarehouseRequestContext() || !versionSelect) return;
    if (!Array.from(versionSelect.options).some(option => option.value === '__all__')) {
      const opt = document.createElement('option');
      opt.value = '__all__';
      opt.textContent = 'Todos los tipos';
      versionSelect.insertBefore(opt, versionSelect.firstChild);
    }
    if (!activeWarehouseRequest?.requestId && !versionSelect.value) {
      versionSelect.value = '__all__';
    }
  }

  function setWarehouseFilterLabels() {
    const storeLabel = document.querySelector('label[for="storeSelect"]');
    const versionLabel = document.querySelector('label[for="versionSelect"]');
    const dateLabel = document.querySelector('label[for="histDateInput"]');
    const warehouseMode = requiresWarehouseRequestContext();
    if (storeLabel) storeLabel.textContent = warehouseMode ? 'Filtro de sucursal' : 'Tienda';
    if (versionLabel) versionLabel.textContent = warehouseMode ? 'Filtro de tipo' : 'Versión de lista';
    if (dateLabel) dateLabel.textContent = warehouseMode ? 'Filtro por fecha' : 'Recepciones por fecha';
  }

  function prepareWarehouseWorkspace() {
    if (!requiresWarehouseRequestContext()) return;
    cancelPendingAutoSave();
    ensureWarehouseFilterOption();
    ensureWarehouseVersionFilterOption();
    if (!histPicker && typeof createHistoryPicker === 'function') {
      histPicker = createHistoryPicker();
    }
    const histModeText = document.getElementById('histViewModeText');
    if (histModeText) {
      histModeText.textContent = currentViewDate
        ? ('Filtro de solicitudes: ' + currentViewDate)
        : 'Modo bodega: abre una solicitud desde la bandeja para revisar.';
      histModeText.classList.remove('text-primary', 'text-success');
      histModeText.classList.add('text-muted');
    }
    activeWarehouseRequest = null;
    activeWarehouseRequestSnapshot = '';
    if (versionSelect && Array.from(versionSelect.options).some(option => option.value === '__all__')) versionSelect.value = '__all__';
    requestFlowState = { status: REQUEST_STATUSES.NONE, requestId: null, submittedAt: null, createdAt: null, itemCount: 0, record: null };
    currentViewDate = null;
    resetHistoricalUnlock();
    clearHistoricalSelection();
    clearBulkSelection();
    resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
    body.innerHTML = '';
    renumber();
    updateLastSavedText(null, 'Abre una solicitud para comenzar.');
    resetAutoSaveBaseline();
    setHistoricalViewMode(false);
    updateBulkSelectionUI();
    updateRequestFlowUI();
  }

  async function closeWarehouseRequest(options = {}) {
    if (!requiresWarehouseRequestContext()) return;
    if (activeWarehouseRequest?.requestId && options.confirm !== false) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cerrar esta solicitud');
      if (!canLeave) return;
    }
    prepareWarehouseWorkspace();
  }

  async function refreshHistoryPicker() {
    if (!histDateInput) return;

    const isWarehouseMode = requiresWarehouseRequestContext();
    const selectedStoreFilter = String(storeSelect?.value || '').trim();
    const selectedVersionFilter = String(versionSelect?.value || '').trim();
    const cacheKey = isWarehouseMode
      ? ['warehouse-requests', selectedStoreFilter || 'all', selectedVersionFilter || 'all'].join(':')
      : getDocIdForCurrentList();

    const cachedDates = readHistoryDatesCache(cacheKey);
    histDatesWithData = new Set(cachedDates);

    if (!histPicker) {
      histPicker = createHistoryPicker();
    } else if (typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }

    try {
      let fechas = [];

      if (isWarehouseMode) {
        if (typeof listRequestDatesForCurrentAccess === 'function') {
          fechas = await listRequestDatesForCurrentAccess({
            storeKey: selectedStoreFilter && selectedStoreFilter !== '__all__' ? selectedStoreFilter : '',
            versionKey: selectedVersionFilter && selectedVersionFilter !== '__all__' ? selectedVersionFilter : '',
            limit: 500
          });
        }
      } else {
        const docId = getDocIdForCurrentList();
        const historialDates = (typeof getHistoryDates === 'function') ? await getHistoryDates(docId) : [];
        let requestDates = [];
        if (typeof listRequestDatesForCurrentAccess === 'function') {
          requestDates = await listRequestDatesForCurrentAccess({
            storeKey: storeSelect?.value || '',
            versionKey: versionSelect?.value || 'base',
            limit: 500
          });
        }
        fechas = [...(historialDates || []), ...(requestDates || [])];
      }

      const fechasUnicas = Array.from(new Set((fechas || []).filter(Boolean))).sort();
      histDatesWithData = new Set(fechasUnicas);
      writeHistoryDatesCache(cacheKey, fechasUnicas);
    } catch (e) {
      console.error('Error al obtener fechas marcadas del calendario:', e);
    }

    if (histPicker && typeof histPicker.redraw === 'function') {
      histPicker.redraw();
    }
  }

  async function loadHistoryForDate(dateStr) {
    if (!dateStr) return;

    if (requiresWarehouseRequestContext()) {
      if (activeWarehouseRequest?.requestId) {
        const result = await Swal.fire({
          title: 'Solicitud activa',
          text: 'Cierra la solicitud activa antes de cambiar el filtro de fecha.',
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
        return result;
      }
      currentViewDate = dateStr;
      const histModeText = document.getElementById('histViewModeText');
      if (histModeText) histModeText.textContent = 'Filtro de solicitudes: ' + dateStr;
      updateRequestFlowUI();
      await openRequestsList({ title: 'Solicitudes de bodega' });
      return;
    }

    if (!(await enforceCurrentStoreAccess('consultar históricos'))) return;

    activeWarehouseRequest = null;
    return withLoading('Cargando historial...', async () => {
      try {
        const today = (typeof getTodayString === 'function') ? getTodayString() : null;

        if (today && dateStr === today) {
          currentViewDate = null;
          resetHistoricalUnlock();
          clearHistoricalSelection();

          if (histPicker) {
            histPicker.clear();
          } else if (histDateInput) {
            histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';
          }

          await loadStoreStateForToday();
          setHistoricalViewMode(false);
          return;
        }

        currentViewDate = dateStr;
        if (mediaStream) {
          await stopScanner();
        }
        resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
        resetHistoricalUnlock();
        clearHistoricalSelection();

        body.innerHTML = '';
        renumber();
        updateBulkSelectionUI();

        const docId = getDocIdForCurrentList();
        const record = await loadChecklistFromFirestore(docId, dateStr);
        applyChecklistMeta(record?.meta || {});

        if (record && Array.isArray(record.items) && record.items.length) {
          renderChecklistItems(record.items);
          lastUpdateISO = record.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
        } else {
          lastUpdateISO = record?.meta?.updatedAt || null;
          lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + 'Sin guardado para esa fecha.';
          Swal.fire('Sin datos', 'No hay checklist guardado para esa fecha.', 'info');
        }

        const isHistorical = (today ? (dateStr !== today) : true);
        setHistoricalViewMode(isHistorical);
        applyListSearchFilter();
      } catch (e) {
        console.error('Error al cargar histórico:', e);
        Swal.fire('Error', 'No se pudo cargar el histórico para esa fecha.', 'error');
      }
    });
  }

  if (btnHistToday) {
    btnHistToday.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await withLoading('Volviendo a hoy...', async () => {
        if (histPicker) {
          histPicker.clear();
        } else if (histDateInput) {
          histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';
        }

        currentViewDate = null;
        resetHistoricalUnlock();
        clearHistoricalSelection();
        if (requiresWarehouseRequestContext()) {
          prepareWarehouseWorkspace();
        } else {
          await loadStoreStateForToday(); // vuelve a hoy
          setHistoricalViewMode(false);
        }
      });

    });
  }

  if (btnMergeSelectedToToday) {
    btnMergeSelectedToToday.addEventListener('click', async () => {
      await mergeSelectedHistoricalRowsToToday();
    });
  }

  if (btnToggleHistLock) {
    btnToggleHistLock.addEventListener('click', async () => {
      closeMoreActionsMenu();
      const canUnlockHistorical = isPastHistoricalDateSelected();
      const canUnlockProtected = isProtectedVersionSelected();
      const canUnlockAny = canUnlockHistorical || canUnlockProtected;

      if (!canUnlockAny) {
        await Swal.fire(
          'No aplica',
          'Este botón solo se usa cuando estás viendo una fecha anterior o una lista protegida.',
          'info'
        );
        return;
      }

      const deniedHistorical = canUnlockHistorical && !canUnlockHistoricalViews();
      const deniedProtected = canUnlockProtected && !canUseProtectedLists();
      if (deniedHistorical || deniedProtected) {
        await showRoleDeniedAlert('desbloquear esta vista', 'supervisores o administradores');
        return;
      }

      const hasActiveUnlock =
        (canUnlockHistorical && historicalUnlockEnabled) ||
        (canUnlockProtected && protectedVersionUnlockEnabled);

      if (hasActiveUnlock) {
        historicalUnlockEnabled = false;
        protectedVersionUnlockEnabled = false;
        setHistoricalViewMode(isHistoricalDateSelected());

        await Swal.fire(
          'Bloqueado',
          'Los controles protegidos fueron bloqueados nuevamente.',
          'success'
        );
        return;
      }

      const contexts = [];
      if (canUnlockHistorical) contexts.push('la vista histórica');
      if (canUnlockProtected) contexts.push('la lista ' + getVersionLabel(versionSelect.value));

      const unlocked = await requestUnlockPassword({
        title: 'Desbloquear edición',
        text: 'Ingresa la contraseña para habilitar edición en ' + contexts.join(' y ') + '.',
        confirmButtonText: 'Desbloquear'
      });

      if (unlocked) {
        historicalUnlockEnabled = canUnlockHistorical;
        protectedVersionUnlockEnabled = canUnlockProtected;
        setHistoricalViewMode(isHistoricalDateSelected());

        await Swal.fire(
          'Desbloqueado',
          'Ya puedes editar esta vista hasta que vuelvas a bloquearla.',
          'success'
        );
      }
    });
  }

  // ====== Barcode Scanner ======
  function setScanButtonState(isActive) {
    if (!btnScan) return;

    btnScan.classList.remove('btn-outline-primary', 'btn-outline-danger');

    if (isActive) {
      btnScan.classList.add('btn-outline-danger');
      btnScan.title = 'Detener cámara';
      btnScan.setAttribute('aria-label', 'Detener cámara');
      btnScan.innerHTML = '<i class="fa-solid fa-stop me-1"></i><span>Detener</span>';
    } else {
      btnScan.classList.add('btn-outline-primary');
      btnScan.title = 'Escanear código de barras';
      btnScan.setAttribute('aria-label', 'Escanear código de barras');
      btnScan.innerHTML = '<i class="fa-solid fa-barcode"></i>';
    }
  }

  function canUseHtml5QrCode() {
    return typeof window !== 'undefined' && typeof window.Html5Qrcode === 'function';
  }

  function shouldUseHtml5QrScanner() {
    return canUseHtml5QrCode();
  }

  function setScannerViewMode(mode = 'native') {
    if (!scanWrap) return;
    const nativeScanner = scanWrap.querySelector('.scanner-native-view') || scanWrap.querySelector('.scanner');
    if (nativeScanner) nativeScanner.classList.toggle('d-none', mode === 'html5');
    if (html5QrReader) html5QrReader.classList.toggle('d-none', mode !== 'html5');
  }

  function getHtml5QrFormats() {
    const formats = window.Html5QrcodeSupportedFormats || null;
    if (!formats) return undefined;
    return [
      formats.EAN_13,
      formats.EAN_8,
      formats.UPC_A,
      formats.UPC_E,
      formats.CODE_128,
      formats.CODE_39,
      formats.ITF,
      formats.QR_CODE
    ].filter(Boolean);
  }

  async function askForManualBarcodeEntry(message = 'Puedes escribirlo manualmente si la cámara no logra leerlo.') {
    const result = await Swal.fire({
      title: 'Ingresar código',
      text: message,
      input: 'text',
      inputLabel: 'Código de barras',
      inputPlaceholder: 'Escribe o pega el código',
      showCancelButton: true,
      confirmButtonText: 'Buscar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!String(value || '').trim()) {
          return 'Ingresa un código.';
        }
        return undefined;
      }
    });

    if (!result.isConfirmed) return false;
    const code = String(result.value || '').trim();
    if (!code) return false;
    await handleScannedOrImportedCode(code);
    return true;
  }

  async function startHtml5QrScanner() {
    if (!html5QrReader || !canUseHtml5QrCode()) {
      await askForManualBarcodeEntry('El escáner alternativo no cargó. Ingresa el código manualmente.');
      return;
    }

    if (html5QrScannerActive) return;

    try {
      setScannerViewMode('html5');
      scanWrap?.classList.add('active');
      setScanButtonState(true);

      html5QrScanner = html5QrScanner || new window.Html5Qrcode('html5QrReader', {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      });

      const formatsToSupport = getHtml5QrFormats();
      const config = {
        fps: 10,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.7777778,
        disableFlip: false
      };
      if (formatsToSupport) config.formatsToSupport = formatsToSupport;

      html5QrScannerActive = true;
      await html5QrScanner.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          const raw = String(decodedText || '').trim();
          if (!raw) return;
          await onBarcodeFound(raw);
        },
        () => {}
      );

      showScanToast('info', 'Escáner activo', 'Apunta la cámara al código de barras.', { timeout: 2400 });
    } catch (err) {
      console.error('html5-qrcode scanner error:', err);
      await stopScanner();
      Swal.fire('Cámara no disponible', 'No se pudo iniciar el escáner en este dispositivo. Puedes ingresar el código manualmente.', 'info')
        .then(() => askForManualBarcodeEntry());
    }
  }

  async function stopHtml5QrScanner() {
    if (!html5QrScanner) {
      html5QrScannerActive = false;
      return;
    }

    try {
      if (html5QrScannerActive && typeof html5QrScanner.stop === 'function') {
        await html5QrScanner.stop();
      }
    } catch (_err) {}

    try {
      if (typeof html5QrScanner.clear === 'function') {
        html5QrScanner.clear();
      }
    } catch (_err) {}

    html5QrScannerActive = false;
  }

  async function startScanner() {
    if (mediaStream || html5QrScannerActive) return;

    if (!shouldUseHtml5QrScanner()) {
      await askForManualBarcodeEntry('El escáner de cámara no cargó correctamente. Ingresa o pega el código manualmente.');
      return;
    }

    await startHtml5QrScanner();
  }

  async function stopScanner() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }

    await stopHtml5QrScanner();

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }

    if (scanVideo) {
      try { scanVideo.pause(); } catch (_e) { }
      scanVideo.srcObject = null;
    }

    scanWrap?.classList.remove('active');
    setScannerViewMode('native');
    setScanButtonState(false);
  }

  async function onBarcodeFound(code) {
    await stopScanner();
    await handleScannedOrImportedCode(code);
  }

  if (fileScan) {
    try {
      fileScan.removeAttribute('capture');
      fileScan.setAttribute('accept', '');
      fileScan.classList.add('d-none');
    } catch (_err) {}
  }

  if (btnScan) {
    btnScan.addEventListener('click', async () => {
      if (mediaStream || html5QrScannerActive) {
        await stopScanner();
      } else {
        await startScanner();
      }
    });
  }

  setScanButtonState(false);


  async function cleanUnreviewedRows() {
    if (!canUseWarehouseTools()) {
      await showRoleDeniedAlert('eliminar no revisados', 'bodega o administradores');
      return;
    }
    if (!canWarehouseEditActiveRequest()) {
      await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de limpiar no revisados.', 'info');
      return;
    }
    if (isEditingLocked()) {
      await showEditingLockedAlert('eliminar no revisados');
      return;
    }
    const rows = [...body.getElementsByTagName('tr')];
    const toRemove = rows.filter(tr => !getReviewButton(tr)?.classList.contains('on'));
    if (!toRemove.length) {
      await Swal.fire('Lista limpia', 'No hay productos sin revisar para eliminar.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: '¿Eliminar no revisados?',
      html: '<div class="text-start small">Se eliminarán <strong>' + toRemove.length + '</strong> producto(s) que no están marcados como revisados. Esto deja la lista depurada para exportar o subir al sistema principal.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar no revisados',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    toRemove.forEach(tr => tr.remove());
    renumber();
    clearBulkSelection();
    updateBulkSelectionUI();
    applyListSearchFilter();
    await persistCurrentChecklist({
      successTitle: 'Lista depurada',
      successMessage: 'Se eliminaron los productos no revisados y se guardó la lista limpia.'
    });
  }

  async function markActiveRequestDispatched() {
    if (!canUseWarehouseTools()) return;
    if (!activeWarehouseRequest?.requestId) {
      await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de marcarla como despachada.', 'info');
      return;
    }
    const rows = [...body.getElementsByTagName('tr')];
    const notDispatched = rows.filter(tr => !getDispatchButton(tr)?.classList.contains('on')).length;
    const result = await Swal.fire({
      title: '¿Marcar solicitud como despachada?',
      html: '<div class="text-start small">La solicitud quedará en estado <strong>Despachada</strong>.' + (notDispatched ? '<br><br>Hay <strong>' + notDispatched + '</strong> producto(s) que no están marcados como despachados.' : '') + '</div>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Marcar despachada',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    await persistCurrentChecklist({ showSuccess: false });
    const dispatchedAt = new Date().toISOString();
    const dispatchedByEmail = window.TRAuth?.getCurrentUser?.()?.email || null;
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      dispatchedAt,
      dispatchedByEmail
    };
    await updateRequestStatus(activeWarehouseRequest.requestId, REQUEST_STATUSES.DISPATCHED, {
      dispatchedAt,
      dispatchedByEmail
    });
    await syncActiveWarehouseRequest(REQUEST_STATUSES.DISPATCHED);
    updateRequestFlowUI();
    await Swal.fire('Solicitud despachada', 'La solicitud quedó marcada como despachada.', 'success');
  }


  async function cancelActiveWarehouseRequest() {
    if (!canUseWarehouseTools()) return;
    if (!activeWarehouseRequest?.requestId) {
      await Swal.fire('Sin solicitud abierta', 'Abre una solicitud desde la bandeja antes de cancelarla.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: '¿Cancelar solicitud?',
      html: '<div class="text-start small">La solicitud quedará en estado <strong>Cancelada</strong>. No se eliminará; seguirá disponible en el historial.</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar solicitud',
      cancelButtonText: 'Volver'
    });
    if (!result.isConfirmed) return;
    const cancelledAt = new Date().toISOString();
    const cancelledByEmail = window.TRAuth?.getCurrentUser?.()?.email || null;
    activeWarehouseRequest.original = {
      ...(activeWarehouseRequest.original || {}),
      cancelledAt,
      cancelledByEmail
    };
    await updateRequestStatus(activeWarehouseRequest.requestId, REQUEST_STATUSES.CANCELLED, {
      cancelledAt,
      cancelledByEmail
    });
    await syncActiveWarehouseRequest(REQUEST_STATUSES.CANCELLED);
    updateRequestFlowUI();
    await Swal.fire('Solicitud cancelada', 'La solicitud quedó cancelada y conservada en el historial.', 'success');
  }



  function getMergeItemKey(item) {
    const barcode = normalizeMatchValue(item?.codigo_barras || item?.barcode || item?.codigoBarras || '');
    const inventory = normalizeMatchValue(item?.codigo_inventario || item?.codigoInv || item?.inventoryCode || '');
    const name = normalizeMatchValue(item?.nombre || item?.name || '');
    if (hasUsefulCode(barcode)) return 'barcode:' + barcode;
    if (hasUsefulCode(inventory)) return 'inventory:' + inventory;
    return 'name:' + name;
  }

  function parseMergeQuantity(value) {
    const normalized = String(value ?? '').replace(',', '.').trim();
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function formatMergeQuantity(value) {
    if (!Number.isFinite(value)) return '';
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  function mergeChecklistItems(destinationItems = [], sourceItems = []) {
    const merged = Array.isArray(destinationItems) ? destinationItems.map(item => ({ ...(item || {}) })) : [];
    const index = new Map();
    merged.forEach((item, idx) => {
      const key = getMergeItemKey(item);
      if (key && key !== 'name:') index.set(key, idx);
    });

    let added = 0;
    let summed = 0;

    (Array.isArray(sourceItems) ? sourceItems : []).forEach(source => {
      const sourceItem = { ...(source || {}) };
      const key = getMergeItemKey(sourceItem);
      const existingIndex = index.get(key);
      if (existingIndex >= 0) {
        const existing = merged[existingIndex];
        const existingQty = parseMergeQuantity(existing.cantidad ?? existing.quantity);
        const sourceQty = parseMergeQuantity(sourceItem.cantidad ?? sourceItem.quantity);
        if (existingQty !== null && sourceQty !== null) {
          existing.cantidad = formatMergeQuantity(existingQty + sourceQty);
        } else if (!String(existing.cantidad ?? '').trim()) {
          existing.cantidad = String(sourceItem.cantidad ?? sourceItem.quantity ?? '').trim();
        }
        existing.revisado = Boolean(existing.revisado || sourceItem.revisado);
        existing.despachado = Boolean(existing.despachado || sourceItem.despachado);
        summed += 1;
      } else {
        merged.push(sourceItem);
        if (key && key !== 'name:') index.set(key, merged.length - 1);
        added += 1;
      }
    });

    return { items: merged, added, summed };
  }

  function isRequestTerminalForMerge(status) {
    const normalized = normalizeRequestStatus(status || REQUEST_STATUSES.SENT);
    return [
      REQUEST_STATUSES.DISPATCHED,
      REQUEST_STATUSES.RECEIVED,
      REQUEST_STATUSES.CANCELLED,
      REQUEST_STATUSES.MERGED
    ].includes(normalized);
  }

  function requestHasMergeableItems(req) {
    const items = Array.isArray(req?.items) ? req.items : [];
    return items.length > 0 || Number(req?.itemCount || 0) > 0;
  }

  function isMergeEligibleSource(req) {
    if (!req || !(req.id || req.requestId)) return false;
    if (isRequestTerminalForMerge(req.status)) return false;
    return requestHasMergeableItems(req);
  }

  function isMergeEligibleDestination(req) {
    if (!req || !(req.id || req.requestId)) return false;
    return !isRequestTerminalForMerge(req.status);
  }

  function buildMergeDialogHtml(requests = [], destinationId = '') {
    const destinations = requests.filter(isMergeEligibleDestination);
    const sources = requests.filter(isMergeEligibleSource);
    const today = (typeof getTodayString === 'function') ? getTodayString() : '';

    if (!destinations.length || sources.length < 2) {
      return '<div class="text-start small text-muted">No hay suficientes solicitudes abiertas para fusionar. Necesitas al menos una solicitud destino y una solicitud origen pendientes o en revisión.</div>';
    }

    const destinationOptions = destinations.map(req => {
      const id = req.id || req.requestId || '';
      const date = getRequestDateKey(req) || 'sin fecha';
      const selected = id === destinationId ? ' selected' : '';
      const label = getFriendlyRequestCode(req) + ' · ' + (req.storeName || getStoreLabel(req.storeKey)) + ' · ' + getRequestTypeLabel(req) + ' · ' + date + (date === today ? ' · hoy' : '');
      return '<option value="' + htmlAttrEscape(id) + '"' + selected + '>' + escapeHtml(label) + '</option>';
    }).join('');

    const sourceRows = sources.map(req => {
      const id = req.id || req.requestId || '';
      const count = Number(req.itemCount || (Array.isArray(req.items) ? req.items.length : 0));
      const date = getRequestDateKey(req) || 'sin fecha';
      return `
        <label class="request-list-row merge-source-row" data-store-key="${htmlAttrEscape(req.storeKey || '')}" data-request-id="${htmlAttrEscape(id)}">
          <span class="merge-source-main">
            <span class="merge-source-check">
              <input class="form-check-input" type="checkbox" name="mergeSources" value="${htmlAttrEscape(id)}" aria-label="Fusionar solicitud ${htmlAttrEscape(getFriendlyRequestCode(req))}">
            </span>
            <span class="merge-source-content">
              <strong>${escapeHtml(getFriendlyRequestCode(req))}</strong>
              <small>${escapeHtml(req.storeName || getStoreLabel(req.storeKey))} · ${escapeHtml(getRequestTypeLabel(req))} · ${escapeHtml(date)} · ${count} item(s)</small>
            </span>
          </span>
          <span class="request-list-side"><span class="badge rounded-pill ${getRequestStatusBadgeClass(req.status)}">${escapeHtml(getRequestStatusLabel(req.status))}</span></span>
        </label>
      `;
    }).join('');

    return `
      <div class="text-start small mb-3">
        Selecciona una solicitud destino y marca una o varias solicitudes origen. Si un producto ya existe en destino, se suman las cantidades.
      </div>
      <div class="mb-3 text-start">
        <label class="form-label small fw-semibold" for="mergeDestinationRequest">Solicitud destino</label>
        <select id="mergeDestinationRequest" class="form-select form-select-sm">${destinationOptions}</select>
        <div class="form-text">Recomendado: usar la solicitud de hoy de la misma sucursal.</div>
      </div>
      <div class="text-start mb-2 d-flex justify-content-between align-items-center">
        <strong class="small">Solicitudes a fusionar</strong>
        <span id="mergeSourceHint" class="small text-muted"></span>
      </div>
      <div class="request-list-modal merge-source-list text-start">${sourceRows}</div>
    `;
  }

  async function mergeRequestsIntoDestination(destinationId, sourceIds, allRequests = []) {
    const destination = await loadRequestFromFirestore(destinationId);
    if (!destination) throw new Error('No se encontró la solicitud destino.');
    if (!isMergeEligibleDestination(destination)) throw new Error('La solicitud destino no está abierta para fusión.');

    const loadedSources = [];
    for (const sourceId of sourceIds) {
      if (!sourceId || sourceId === destinationId) continue;
      const source = allRequests.find(req => String(req.id || req.requestId || '') === String(sourceId)) || await loadRequestFromFirestore(sourceId);
      if (!source) throw new Error('No se encontró la solicitud origen: ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId }));
      if (!isMergeEligibleSource(source)) throw new Error('La solicitud ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId }) + ' no está abierta para fusión.');
      if (String(source.storeKey || '') !== String(destination.storeKey || '')) {
        throw new Error('Solo se pueden fusionar solicitudes de la misma sucursal. Revisa ' + getFriendlyRequestCode({ requestId: sourceId, id: sourceId, storeKey: source.storeKey, versionKey: source.versionKey, requestDate: getRequestDateKey(source) }) + '.');
      }
      loadedSources.push(source);
    }

    if (!loadedSources.length) throw new Error('Selecciona al menos una solicitud origen diferente al destino.');

    const now = new Date().toISOString();
    const userEmail = window.TRAuth?.getCurrentUser?.()?.email || null;
    let mergedItems = Array.isArray(destination.items) ? destination.items : [];
    let addedTotal = 0;
    let summedTotal = 0;

    loadedSources.forEach(source => {
      const result = mergeChecklistItems(mergedItems, Array.isArray(source.items) ? source.items : []);
      mergedItems = result.items;
      addedTotal += result.added;
      summedTotal += result.summed;
    });

    const sourceRefs = loadedSources.map(source => ({
      requestId: source.id || source.requestId,
      storeKey: source.storeKey || destination.storeKey || '',
      requestDate: getRequestDateKey(source),
      itemCount: Number(source.itemCount || (Array.isArray(source.items) ? source.items.length : 0))
    }));

    const existingMergedFrom = Array.isArray(destination.mergedFrom) ? destination.mergedFrom : [];
    await saveRequestToFirestore(destinationId, {
      ...destination,
      requestId: destination.requestId || destination.id || destinationId,
      items: mergedItems,
      itemCount: mergedItems.length,
      mergedFrom: [...existingMergedFrom, ...sourceRefs],
      lastMergeAt: now,
      lastMergeByEmail: userEmail,
      lastWarehouseUpdateAt: now,
      lastWarehouseUpdateByEmail: userEmail
    });

    for (const source of loadedSources) {
      const sourceId = source.id || source.requestId;
      await updateRequestStatus(sourceId, REQUEST_STATUSES.MERGED, {
        mergedAt: now,
        mergedByEmail: userEmail,
        mergedIntoRequestId: destinationId
      });
      await saveRequestToFirestore(sourceId, {
        ...source,
        requestId: source.requestId || source.id || sourceId,
        status: REQUEST_STATUSES.MERGED,
        mergedAt: now,
        mergedByEmail: userEmail,
        mergedIntoRequestId: destinationId
      });
    }

    return {
      destinationId,
      sourceCount: loadedSources.length,
      itemCount: mergedItems.length,
      addedTotal,
      summedTotal
    };
  }

  async function openMergeRequestsDialog() {
    if (!canUseWarehouseTools()) return;
    if (activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('fusionar solicitudes');
      if (!canLeave) return;
    }

    // La fusión debe buscar solicitudes abiertas de todas las sucursales permitidas,
    // sin depender del filtro visible de la bandeja. Luego la modal restringe
    // automáticamente los orígenes a la misma sucursal de la solicitud destino.
    let requests = await listRequestsForCurrentAccess({ limit: 500 });
    requests = requests.filter(req => req && (req.id || req.requestId));

    const today = (typeof getTodayString === 'function') ? getTodayString() : '';
    const suggestedDestination = activeWarehouseRequest?.requestId
      || (requests.find(req => getRequestDateKey(req) === today && isMergeEligibleDestination(req))?.id)
      || (requests.find(isMergeEligibleDestination)?.id)
      || '';

    const result = await Swal.fire({
      title: 'Fusionar solicitudes',
      width: 980,
      html: buildMergeDialogHtml(requests, suggestedDestination),
      customClass: { popup: 'tr-modal tr-merge-modal' },
      showCancelButton: true,
      confirmButtonText: 'Fusionar seleccionadas',
      cancelButtonText: 'Cancelar',
      didOpen: (popup) => {
        const destinationSelect = popup.querySelector('#mergeDestinationRequest');
        const hint = popup.querySelector('#mergeSourceHint');
        const refreshRows = () => {
          const destId = String(destinationSelect?.value || '');
          const dest = requests.find(req => String(req.id || req.requestId || '') === destId);
          const destStore = String(dest?.storeKey || '');
          let visibleCount = 0;
          popup.querySelectorAll('.merge-source-row').forEach(row => {
            const rowId = String(row.getAttribute('data-request-id') || '');
            const rowStore = String(row.getAttribute('data-store-key') || '');
            const visible = rowId !== destId && (!destStore || rowStore === destStore);
            row.classList.toggle('d-none', !visible);
            const input = row.querySelector('input[name="mergeSources"]');
            if (input) {
              input.disabled = !visible;
              if (!visible) input.checked = false;
            }
            if (visible) visibleCount += 1;
          });
          if (hint) hint.textContent = visibleCount + ' disponible(s) para la misma sucursal';
        };
        destinationSelect?.addEventListener('change', refreshRows);
        refreshRows();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const destinationId = String(popup?.querySelector('#mergeDestinationRequest')?.value || '').trim();
        const sourceIds = Array.from(popup?.querySelectorAll('input[name="mergeSources"]:checked') || []).map(input => String(input.value || '').trim()).filter(Boolean);
        if (!destinationId) {
          Swal.showValidationMessage('Selecciona una solicitud destino.');
          return false;
        }
        if (!sourceIds.length) {
          Swal.showValidationMessage('Selecciona al menos una solicitud origen.');
          return false;
        }
        return { destinationId, sourceIds };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    await withLoading('Fusionando solicitudes...', async () => {
      const mergeResult = await mergeRequestsIntoDestination(result.value.destinationId, result.value.sourceIds, requests);
      await refreshHistoryPicker();
      updateRequestFlowUI();
      showScanToast('success', 'Solicitudes fusionadas', mergeResult.sourceCount + ' solicitud(es) incorporada(s). Items destino: ' + mergeResult.itemCount + '.', { timeout: 4500 });
      const friendlyDestination = getFriendlyRequestCode({ requestId: mergeResult.destinationId, id: mergeResult.destinationId });
      await Swal.fire('Solicitudes fusionadas', 'Se fusionaron ' + mergeResult.sourceCount + ' solicitud(es) con ' + friendlyDestination + '.', 'success');
    });
  }

  if (btnCleanUnreviewed) {
    btnCleanUnreviewed.addEventListener('click', async () => {
      try { await cleanUnreviewedRows(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }



  async function startBranchList() {
    if (!isBranchOperator()) return;
    if (!(await enforceCurrentStoreAccess('iniciar lista'))) return;

    const status = normalizeRequestStatus(requestFlowState?.status || REQUEST_STATUSES.NONE);
    if (isRequestSentStatus(status)) {
      await Swal.fire('Solicitud ya enviada', 'Esta sucursal ya envió una solicitud hoy. Mañana podrás iniciar una nueva.', 'info');
      return;
    }
    if (isRequestDraftStatus(status)) return;

    const requestId = getCurrentRequestIdForToday();
    const now = new Date().toISOString();
    requestFlowState = {
      status: REQUEST_STATUSES.DRAFT,
      requestId,
      createdAt: now,
      submittedAt: null,
      itemCount: 0,
      record: { items: [] }
    };

    await persistCurrentChecklist({
      successTitle: 'Lista iniciada',
      successMessage: 'Ya puedes agregar productos. Puedes guardar durante el proceso.',
      showSuccess: true
    });
    updateRequestFlowUI();
  }


  async function confirmBranchRequestReceived(requestLike = null, options = {}) {
    if (!isBranchOperator()) return;
    const status = normalizeRequestStatus(requestLike?.status || requestFlowState?.status || REQUEST_STATUSES.NONE);
    const requestId = requestLike?.requestId || requestLike?.id || requestFlowState?.requestId;
    if (status !== REQUEST_STATUSES.DISPATCHED || !requestId) {
      await Swal.fire('No disponible', 'Solo puedes confirmar recibido cuando bodega ya marcó la solicitud como despachada.', 'info');
      return;
    }
    if (!options?.skipPrompt) {
      const result = await Swal.fire({
        title: '¿Confirmar recibido?',
        html: '<div class="text-start small">La solicitud quedará marcada como <strong>Recibida</strong> por la sucursal.</div>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar recibido',
        cancelButtonText: 'Cancelar'
      });
      if (!result.isConfirmed) return;
    }
    const receivedAt = new Date().toISOString();
    const user = window.TRAuth?.getCurrentUser?.() || null;
    await updateRequestStatus(requestId, REQUEST_STATUSES.RECEIVED, {
      receivedAt,
      receivedByUid: user?.uid || null,
      receivedByEmail: user?.email || null
    });
    if (!requestFlowState?.requestId || requestFlowState.requestId === requestId) {
      requestFlowState = {
        ...(requestFlowState || {}),
        requestId,
        status: REQUEST_STATUSES.RECEIVED,
        receivedAt,
        receivedByUid: user?.uid || null,
        receivedByEmail: user?.email || null
      };
      updateRequestFlowUI();
    }
    showScanToast('success', 'Recibido confirmado', 'La solicitud quedó marcada como recibida.', { timeout: 3500 });
  }

  async function createWarehouseRequest() {
    if (!canUseWarehouseTools()) return;
    if (activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('crear una solicitud de bodega');
      if (!canLeave) return;
    }

    const defaultStore = (storeSelect?.value && storeSelect.value !== '__all__') ? storeSelect.value : '';
    const defaultVersion = 'traslado';
    const result = await Swal.fire({
      title: 'Crear solicitud de bodega',
      width: 620,
      html: `
        <div class="text-start small">
          <p class="text-muted mb-3">Usa esto para registrar despachos esporádicos que bodega prepara para una sucursal.</p>
          <label class="form-label fw-semibold" for="warehouseRequestStore">Sucursal destino</label>
          <select id="warehouseRequestStore" class="form-select mb-3">
            <option value="">Selecciona una sucursal</option>
            ${buildStoreOptionsHtml(defaultStore)}
          </select>
          <label class="form-label fw-semibold" for="warehouseRequestVersion">Lista</label>
          <select id="warehouseRequestVersion" class="form-select" disabled>
            ${buildVersionOptionsHtml(defaultVersion, { includeProtected: true, onlyProtected: true })}
          </select>
          <div class="form-text">Las solicitudes creadas por bodega se registran como <strong>Traslado</strong> y comienzan vacías.</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Crear y abrir',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const popup = Swal.getPopup();
        const selectedStore = String(popup?.querySelector('#warehouseRequestStore')?.value || '').trim();
        const selectedVersion = 'traslado';
        if (!selectedStore) {
          Swal.showValidationMessage('Selecciona la sucursal destino.');
          return false;
        }
        return { storeKey: selectedStore, versionKey: 'traslado' };
      }
    });
    if (!result.isConfirmed || !result.value) return;

    await withLoading('Creando solicitud de bodega...', async () => {
      const now = new Date().toISOString();
      const day = getTodayString();
      const { storeKey, versionKey } = result.value;
      const previousStore = storeSelect?.value || '';
      const previousVersion = versionSelect?.value || '';
      if (storeSelect) storeSelect.value = storeKey;
      if (versionSelect) versionSelect.value = versionKey;
      const requestId = buildWarehouseCreatedRequestId(storeKey, versionKey, day);
      const payload = {
        requestId,
        storeKey,
        storeName: storeSelect?.options?.[storeSelect.selectedIndex]?.text || getStoreLabel(storeKey),
        destinationStoreKey: storeKey,
        destinationStoreName: storeSelect?.options?.[storeSelect.selectedIndex]?.text || getStoreLabel(storeKey),
        versionKey,
        versionLabel: getVersionLabel(versionKey),
        requestDate: day,
        status: REQUEST_STATUSES.REVIEW,
        origin: 'warehouse',
        createdAt: now,
        submittedAt: now,
        reviewStartedAt: now,
        reviewStartedByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
        itemCount: 0,
        items: [],
        createdByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
        createdByEmail: window.TRAuth?.getCurrentUser?.()?.email || null,
        createdByRole: currentUserRole
      };
      await saveRequestToFirestore(requestId, payload);
      await openWarehouseRequest({ id: requestId, ...payload });
      // openWarehouseRequest deja seleccionada la sucursal destino. No restaurar filtros aquí.
      if (!activeWarehouseRequest?.requestId) {
        if (storeSelect) storeSelect.value = previousStore;
        if (versionSelect) versionSelect.value = previousVersion;
      }
    });
    showScanToast('success', 'Solicitud de bodega creada', 'Agrega productos y luego marca la solicitud como despachada.', { timeout: 4500 });
  }

  async function sendWarehousePushNotification(requestPayload) {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch('/api/send-warehouse-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({
          requestId: requestPayload.requestId,
          requestCode: getFriendlyRequestCode(requestPayload),
          storeKey: requestPayload.storeKey,
          storeName: requestPayload.storeName,
          itemCount: requestPayload.itemCount,
          status: requestPayload.status || REQUEST_STATUSES.SENT
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Push bodega no enviado:', data.error || response.statusText);
      }
    } catch (err) {
      console.warn('No se pudo disparar push a bodega:', err);
    }
  }

  async function submitBranchRequest() {
    if (!isBranchOperator()) return;
    if (!(await enforceCurrentStoreAccess('enviar solicitud'))) return;

    if (!isRequestDraftStatus(requestFlowState?.status)) {
      await Swal.fire('Lista no disponible', 'Primero debes iniciar una lista para poder enviarla.', 'info');
      return;
    }

    const items = [...body.getElementsByTagName('tr')].map(buildChecklistItemFromRow);
    if (!items.length) {
      await Swal.fire('Lista vacía', 'Agrega al menos un producto antes de finalizar y enviar.', 'info');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Finalizar y enviar?',
      html: '<div class="text-start small">Se enviará esta lista a bodega y la sucursal ya no podrá editarla hoy.<br><br><strong>Items:</strong> ' + items.length + '</div>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar a bodega',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;
    cancelPendingAutoSave();

    await withLoading('Enviando solicitud a bodega...', async () => {
      const now = new Date().toISOString();
      const targetDay = getTargetChecklistDate();
      const requestId = requestFlowState?.requestId || getCurrentRequestIdForToday();
      const docId = getDocIdForCurrentList();
      const payload = collectPayload({
        requestStatus: 'enviado',
        requestId,
        requestCreatedAt: requestFlowState?.createdAt || now,
        requestSubmittedAt: now
      });

      const requestPayload = {
        requestId,
        storeKey: storeSelect.value,
        storeName: storeSelect.options[storeSelect.selectedIndex]?.text || getStoreLabel(storeSelect.value),
        versionKey: versionSelect.value,
        versionLabel: getVersionLabel(versionSelect.value),
        requestDate: targetDay,
        status: 'enviado',
        createdAt: requestFlowState?.createdAt || now,
        submittedAt: now,
        itemCount: items.length,
        items,
        sourceDocId: docId,
        createdByUid: window.TRAuth?.getCurrentUser?.()?.uid || null,
        createdByEmail: window.TRAuth?.getCurrentUser?.()?.email || null
      };

      await saveRequestToFirestore(requestId, requestPayload);
      await sendWarehousePushNotification(requestPayload);
      await saveChecklistToFirestore(docId, payload, targetDay);
      rememberHistoryDate(docId, targetDay);
      requestFlowState = buildRequestSummaryFromRecord(payload);
      updateLastSavedText(payload.meta?.updatedAt || null);
      await refreshHistoryPicker();
      setHistoricalViewMode(false);
      updateRequestFlowUI();
    });

    await Swal.fire('Solicitud enviada', 'La lista quedó enviada a bodega y bloqueada para la sucursal.', 'success');
  }

  if (btnStartList) {
    btnStartList.addEventListener('click', async () => {
      try { await startBranchList(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnSubmitRequest) {
    btnSubmitRequest.addEventListener('click', async () => {
      try { await submitBranchRequest(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnConfirmRequestReceived) {
    btnConfirmRequestReceived.addEventListener('click', async () => {
      try { await confirmBranchRequestReceived(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnViewCurrentRequest) {
    btnViewCurrentRequest.addEventListener('click', async () => {
      await showRequestDetail(requestFlowState);
    });
  }

  if (btnViewRequestHistory) {
    btnViewRequestHistory.addEventListener('click', async () => {
      try { await openRequestsList({ title: 'Mis solicitudes' }); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnWarehouseNotifications) {
    btnWarehouseNotifications.addEventListener('click', async () => {
      try { await requestWarehouseBrowserNotifications(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnCreateWarehouseRequest) {
    btnCreateWarehouseRequest.addEventListener('click', async () => {
      try { await createWarehouseRequest(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnWarehouseInbox) {
    btnWarehouseInbox.addEventListener('click', async () => {
      try { await openRequestsList({ title: 'Solicitudes recibidas' }); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnCloseWarehouseRequest) {
    btnCloseWarehouseRequest.addEventListener('click', async () => {
      try { await closeWarehouseRequest(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnMarkRequestDispatched) {
    btnMarkRequestDispatched.addEventListener('click', async () => {
      try { await markActiveRequestDispatched(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }


  if (btnCancelWarehouseRequest) {
    btnCancelWarehouseRequest.addEventListener('click', async () => {
      try { await cancelActiveWarehouseRequest(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  if (btnMergeWarehouseRequests) {
    btnMergeWarehouseRequests.addEventListener('click', async () => {
      try { await openMergeRequestsDialog(); } catch (err) { await Swal.fire('Error', String(err?.message || err), 'error'); }
    });
  }

  // ===== Carga inicial (hoy) =====
  async function loadStoreStateForToday(options = {}) {
    const { withLoader = false } = options || {};

    const run = async () => {
      if (requiresWarehouseRequestContext() && !options.allowWarehouseLegacyLoad) {
        prepareWarehouseWorkspace();
        return;
      }

      if (!(await enforceCurrentStoreAccess('cargar información'))) return;

      if (mediaStream) {
        await stopScanner();
      }
      resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
      clearHistoricalSelection();
      clearBulkSelection();
      body.innerHTML = '';

      activeWarehouseRequest = null;
      const docId = getDocIdForCurrentList();
      const record = await loadChecklistFromFirestore(docId); // hoy
      applyChecklistMeta(record?.meta || {});
      requestFlowState = buildRequestSummaryFromRecord(record || {});

      if (isBranchOperator() && !isRequestDraftStatus(requestFlowState.status)) {
        try {
          const todayRequestId = requestFlowState?.requestId || getCurrentRequestIdForToday();
          const todayRequest = todayRequestId ? await loadRequestFromFirestore(todayRequestId) : null;
          if (todayRequest) {
            requestFlowState = {
              status: todayRequest.status || requestFlowState.status || 'enviado',
              requestId: todayRequest.id || todayRequest.requestId || todayRequestId,
              createdAt: todayRequest.createdAt || requestFlowState.createdAt || null,
              submittedAt: todayRequest.submittedAt || requestFlowState.submittedAt || null,
              dispatchedAt: todayRequest.dispatchedAt || null,
              receivedAt: todayRequest.receivedAt || null,
              cancelledAt: todayRequest.cancelledAt || null,
              mergedAt: todayRequest.mergedAt || null,
              mergedIntoRequestId: todayRequest.mergedIntoRequestId || null,
              itemCount: Number(todayRequest.itemCount || requestFlowState.itemCount || (Array.isArray(todayRequest.items) ? todayRequest.items.length : 0)),
              record: { items: Array.isArray(todayRequest.items) ? todayRequest.items : [] }
            };
          }
        } catch (requestLoadError) {
          console.warn('No se pudo validar solicitud del día:', requestLoadError);
        }
      }

      if (record && Array.isArray(record.items)) {
        renderChecklistItems(record.items);
        lastUpdateISO = record.meta?.updatedAt || null;
      } else {
        lastUpdateISO = null;
      }

      lastSaved.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-1"></i>' + (lastUpdateISO ? ('Última actualización: ' + formatSV(lastUpdateISO)) : 'Aún no guardado.');
      updateBulkSelectionUI();
      updateRequisitionUI();
      updateRequestFlowUI();
    };

    if (withLoader) {
      return withLoading('Cargando checklist actual...', run);
    }

    return run();
  }

  async function openWarehouseRequestFromUrlParam() {
    if (!canUseWarehouseTools()) return;
    try {
      const params = new URLSearchParams(window.location.search || '');
      const requestId = String(params.get('requestId') || '').trim();
      if (!requestId) return;
      const req = await loadRequestFromFirestore(requestId);
      if (req) await openWarehouseRequest(req);
      params.delete('requestId');
      const nextQuery = params.toString();
      const nextUrl = window.location.pathname + (nextQuery ? '?' + nextQuery : '') + (window.location.hash || '');
      window.history.replaceState({}, document.title, nextUrl);
    } catch (err) {
      console.warn('No se pudo abrir solicitud desde URL:', err);
    }
  }

  await withLoading('Cargando checklist...', async () => {
    const initialCatalogRows = await preloadCatalog();
    ensureCatalogSearchIndex(initialCatalogRows);

    resetSearchState({ mode: 'catalog', clearInput: true, applyFilter: false });
    ensureWarehouseFilterOption();
    if (requiresWarehouseRequestContext()) {
      prepareWarehouseWorkspace();
      await refreshHistoryPicker();
    } else {
      await loadStoreStateForToday();
      setHistoricalViewMode(false);
      await refreshHistoryPicker();
    }
    applyRolePermissions();
    updateWarehouseNotificationButton();
    startWarehouseInboxNotifications();
    if (canUseWarehouseTools() && getBrowserNotificationPermission() === 'granted') {
      registerWarehouseFcmToken({ silent: true }).catch(err => console.warn('No se pudo registrar FCM automáticamente:', err));
    }
    await openWarehouseRequestFromUrlParam();
  });

  // Store/version change: vuelve a hoy y refresca calendario para el docId nuevo
  storeSelect.addEventListener('change', async () => {
    closeMoreActionsMenu();
    closeMobileFab();
    const requestedStoreValue = storeSelect.value;
    const previousStoreValue = activeWarehouseRequest?.storeKey || '';

    if (!(await enforceCurrentStoreAccess('cambiar de sucursal'))) {
      return;
    }

    if (requiresWarehouseRequestContext() && activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cambiar el filtro de tienda');
      if (!canLeave) {
        if (previousStoreValue && Array.from(storeSelect.options).some(option => option.value === previousStoreValue)) {
          storeSelect.value = previousStoreValue;
        }
        return;
      }
      storeSelect.value = requestedStoreValue;
    }

    await withLoading('Cambiando tienda...', async () => {
      if (mediaStream) {
        await stopScanner();
      }
      updateStoreUI();
      currentViewDate = null;
      resetHistoricalUnlock();
      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';

      if (requiresWarehouseRequestContext()) {
        prepareWarehouseWorkspace();
        await refreshHistoryPicker();
      } else {
        await loadStoreStateForToday();
        setHistoricalViewMode(false);
        await refreshHistoryPicker();
      }
      lastCommittedVersionValue = versionSelect.value;
    });
  });

  versionSelect.addEventListener('change', async () => {
    closeMoreActionsMenu();
    closeMobileFab();
    const requestedVersion = versionSelect.value;
    const previousVersion = lastCommittedVersionValue || 'base';
    const isProtectedRequest = (typeof isProtectedVersionKey === 'function')
      ? isProtectedVersionKey(requestedVersion)
      : (requestedVersion === 'traslado');

    if (isProtectedRequest && requestedVersion !== previousVersion && !(requiresWarehouseRequestContext() && !activeWarehouseRequest?.requestId)) {
      if (!canUseProtectedLists()) {
        await showRoleDeniedAlert('abrir la lista protegida', 'bodega o administradores');
        versionSelect.value = previousVersion;
        return;
      }

      const hasProtectedAccess = await ensureProtectedDestinationAccess(
        requestedVersion,
        'abrir esta lista protegida'
      );

      if (!hasProtectedAccess) {
        versionSelect.value = previousVersion;
        return;
      }
    }

    if (requiresWarehouseRequestContext() && activeWarehouseRequest?.requestId) {
      const canLeave = await confirmLeaveActiveWarehouseRequest('cambiar de lista');
      if (!canLeave) {
        versionSelect.value = previousVersion;
        return;
      }
    }

    await withLoading(requiresWarehouseRequestContext() ? 'Aplicando filtro...' : 'Cargando lista...', async () => {
      if (mediaStream) {
        await stopScanner();
      }
      currentViewDate = null;
      historicalUnlockEnabled = false;
      protectedVersionUnlockEnabled = !!isProtectedRequest;

      if (histPicker) { try { histPicker.clear(); } catch (_) {} }
      if (histDateInput) histDateInput.value = (typeof getTodayString === 'function') ? getTodayString() : '';

      if (requiresWarehouseRequestContext()) {
        prepareWarehouseWorkspace();
        await refreshHistoryPicker();
      } else {
        await loadStoreStateForToday();
        setHistoricalViewMode(false);
        await refreshHistoryPicker();
      }
      lastCommittedVersionValue = versionSelect.value;
    });
  });
});
