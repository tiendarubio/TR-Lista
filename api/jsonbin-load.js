// /api/jsonbin-load.js
// Ya no se utiliza: TRLista ahora carga desde Firestore directamente desde el frontend.
// Se deja para compatibilidad en caso de que tengas llamadas antiguas.
export default async function handler(req, res) {
  res.status(410).json({ error: 'JSONBin ya no se usa; ahora se carga desde Firestore (colección tr_lista2).' });
}
