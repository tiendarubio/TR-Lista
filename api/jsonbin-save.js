// /api/jsonbin-save.js
// Ya no se utiliza: TRLista ahora guarda en Firestore directamente desde el frontend.
// Se deja para compatibilidad en caso de que tengas llamadas antiguas.
export default async function handler(req, res) {
  res.status(410).json({ error: 'JSONBin ya no se usa; ahora se guarda en Firestore (colección tr_lista2).' });
}
