import admin from 'firebase-admin';

function readRequiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error('Falta la variable de entorno ' + name + '.');
  return value;
}

function normalizePrivateKey(value) {
  return String(value || '')
    .replace(/^"(.*)"$/s, '$1')
    .replace(/\\n/g, '\n')
    .trim();
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = readRequiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = readRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(readRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY'));

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

export { admin };
