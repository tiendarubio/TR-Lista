// app.js — Config & helpers (Firestore + Google Sheets catálogo)

// Mapeo de tiendas y "bin" lógico (se usa como ID de documento en Firestore)
const STORE_BINS = {
  lista_sexta_calle:      { base: 'lista_sexta_calle_base',      alterna: 'lista_sexta_calle_alterna' },
  lista_centro_comercial: { base: 'lista_centro_comercial_base', alterna: 'lista_centro_comercial_alterna' },
  lista_avenida_morazan:  { base: 'lista_avenida_morazan_base',  alterna: 'lista_avenida_morazan_alterna' }
};

function getBinId(storeKey, versionKey = 'base') {
  const rec = STORE_BINS[storeKey];
  if (!rec) return null;
  return rec[versionKey] || rec.base;
}

// Cache de catálogo
let CATALOGO_CACHE = null;

function preloadCatalog() {
  if (CATALOGO_CACHE) return Promise.resolve(CATALOGO_CACHE);

  return fetch('/api/catalogo')
    .then(r => {
      if (!r.ok) throw new Error('Error catálogo: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
      return CATALOGO_CACHE;
    })
    .catch(e => {
      console.error('Sheets catálogo error:', e);
      CATALOGO_CACHE = [];
      return CATALOGO_CACHE;
    });
}

function loadProductsFromGoogleSheets() {
  return preloadCatalog();
}

// --- Helpers de fecha ---
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Formatear fecha/hora a formato ES-SV
function formatSV(iso) {
  if (!iso) return 'Aún no guardado.';
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Aún no guardado.';
  }
}

// ================= FIRESTORE WRAPPERS =================
// Colección principal para TRLista2.0
const TRLISTA_COLLECTION = 'tr_lista2';

// Guardar estado actual + historial del día en Firestore
function saveToBin(binId, payload, options = {}) {
  if (!window.db) {
    return Promise.reject(new Error('Firestore no inicializado (db no disponible).'));
  }
  if (!binId) {
    return Promise.reject(new Error('ID de documento no configurado para esta tienda.'));
  }

  const { docId = binId, dateOverride = null } = options;
  const nowIso = new Date().toISOString();
  const finalPayload = {
    meta: {
      ...(payload.meta || {}),
      updatedAt: nowIso
    },
    items: Array.isArray(payload.items) ? payload.items : []
  };

  const mainRef = window.db.collection(TRLISTA_COLLECTION).doc(docId);

  // Historial por día
  const fecha = dateOverride || getTodayString();
  const histRef = mainRef.collection('historial').doc(fecha);

  return Promise.all([
    mainRef.set(finalPayload, { merge: true }),
    histRef.set(finalPayload, { merge: true })
  ]).then(() => finalPayload);
}

// Cargar último estado o un día específico desde Firestore
function loadFromBin(binId, options = {}) {
  if (!window.db) {
    return Promise.reject(new Error('Firestore no inicializado (db no disponible).'));
  }
  if (!binId) {
    return Promise.resolve(null);
  }

  const { docId = binId, dateSpecific = null } = options;
  const mainRef = window.db.collection(TRLISTA_COLLECTION).doc(docId);

  if (dateSpecific) {
    const histRef = mainRef.collection('historial').doc(dateSpecific);
    return histRef.get().then(snap => (snap.exists ? snap.data() : null));
  }

  return mainRef.get().then(snap => (snap.exists ? snap.data() : null));
}
