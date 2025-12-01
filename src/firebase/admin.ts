import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin SDK
// En producción, usa variables de entorno para las credenciales
const serviceAccount: ServiceAccount = {
  projectId: import.meta.env.FIREBASE_PROJECT_ID || "gmexpress-estesi",
  clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL || "",
  // La private key viene con \n escapados, hay que convertirlos
  privateKey: (import.meta.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
};

// Solo inicializar si no hay apps existentes
function getAdminApp() {
  if (getApps().length === 0) {
    // Si no hay credenciales completas, intentar inicializar sin ellas (para desarrollo local)
    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.warn('Firebase Admin: No se encontraron credenciales completas. Usando inicialización por defecto.');
      return initializeApp({
        projectId: serviceAccount.projectId,
      });
    }
    
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }
  return getApps()[0];
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
