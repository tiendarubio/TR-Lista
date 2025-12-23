// /api/catalogo.js
// Devuelve el catálogo de productos desde Google Sheets en formato JSON.
// Ajusta SHEET_ID y RANGE a tu hoja real.
import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const SHEET_ID = process.env.TR_LISTA_SHEET_ID;
    const RANGE = 'catalogo!A2:D10000';

    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return res.status(500).json({ error: 'Faltan variables de entorno para Google Sheets.' });
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE
    });

    const values = response.data.values || [];
    res.status(200).json({ values });
  } catch (error) {
    console.error('Error /api/catalogo:', error);
    res.status(500).json({ error: 'Error al leer catálogo desde Sheets.' });
  }
}
