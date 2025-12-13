// app.js — Helpers para TRInventario (Vercel, llaves ocultas en backend)

// Cache de catálogo y proveedores
let CATALOGO_CACHE = null;
let PROVIDERS_CACHE = null;

// --- Catálogo de productos (Google Sheets -> /api/catalogo) ---
function preloadCatalog() {
  if (CATALOGO_CACHE) return Promise.resolve(CATALOGO_CACHE);

  return fetch('/api/catalogo')
    .then(r => {
      if (!r.ok) throw new Error('Error catálogo: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar catálogo:', err);
      CATALOGO_CACHE = [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    });
}

function loadProductsFromGoogleSheets() {
  return preloadCatalog();
}

// --- Proveedores (Google Sheets -> /api/proveedores) ---
function preloadProviders() {
  if (PROVIDERS_CACHE) return Promise.resolve(PROVIDERS_CACHE);

  return fetch('/api/proveedores')
    .then(r => {
      if (!r.ok) throw new Error('Error proveedores: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      const list = Array.isArray(data.providers) ? data.providers : [];
      PROVIDERS_CACHE = list;
      return PROVIDERS_CACHE;
    })
    .catch(err => {
      console.error('Error al cargar proveedores:', err);
      PROVIDERS_CACHE = [];
      return PROVIDERS_CACHE;
    });
}

function loadProvidersFromGoogleSheets() {
  return preloadProviders();
}


// --- Firestore helpers (histórico por día, en lugar de JSONBin) ---

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Guarda el estado del inventario en Firestore.
 * Se guarda un documento por hoja y día:
 *   tr_inventario_avm/{docId}/historial/{YYYY-MM-DD}
 * El payload representa el último guardado de ese día para esa hoja.
 */
function saveReceptionToJSONBin(docId, payload, dateStr) {
  if (!docId) {
    return Promise.reject(new Error('Documento no configurado para esta hoja.'));
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }
  const db = firebase.firestore();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  return db
    .collection('tr_inventario_avm')
    .doc(docId)
    .collection('historial')
    .doc(day)
    .set(payload || {}, { merge: true })
    .then(() => ({ ok: true, day }))
    .catch(err => {
      console.error('Error al guardar en Firestore:', err);
      throw err;
    });
}

/**
 * Carga el inventario desde Firestore para una hoja y día dados.
 * Si no se indica fecha, se carga el día actual.
 */
function loadReceptionFromJSONBin(docId, dateStr) {
  if (!docId) {
    return Promise.resolve({});
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }
  const db = firebase.firestore();
  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();

  return db
    .collection('tr_inventario_avm')
    .doc(docId)
    .collection('historial')
    .doc(day)
    .get()
    .then(doc => {
      if (!doc.exists) return {};
      return doc.data() || {};
    })
    .catch(err => {
      console.error('Error al leer Firestore:', err);
      return {};
    });
}

/**
 * Devuelve la lista de fechas (YYYY-MM-DD) que tienen historial para una hoja.
 */
function getHistoryDates(docId) {
  if (!docId) {
    return Promise.resolve([]);
  }
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return Promise.reject(new Error('Firebase/Firestore no está disponible.'));
  }
  const db = firebase.firestore();
  return db
    .collection('tr_inventario_avm')
    .doc(docId)
    .collection('historial')
    .get()
    .then(snap => snap.docs.map(d => d.id))
    .catch(err => {
      console.error('Error al listar historial en Firestore:', err);
      return [];
    });
}
