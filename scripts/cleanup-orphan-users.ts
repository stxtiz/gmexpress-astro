/**
 * Script para limpiar usuarios huérfanos de Firebase Authentication
 * 
 * Este script compara los usuarios en Firebase Auth con los documentos en Firestore
 * y elimina de Auth aquellos que no tienen documento correspondiente en Firestore.
 * 
 * EJECUCIÓN:
 * 1. Asegúrate de tener las variables de entorno configuradas en .env
 * 2. Ejecuta: npx tsx scripts/cleanup-orphan-users.ts
 * 
 * NOTA: Este script es destructivo. Úsalo con precaución.
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configurar credenciales
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "gmexpress-estesi",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
};

if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Error: Faltan las variables de entorno FIREBASE_CLIENT_EMAIL y/o FIREBASE_PRIVATE_KEY');
  console.log('Asegúrate de tener un archivo .env con las credenciales de Firebase Admin SDK');
  process.exit(1);
}

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.projectId,
});

const auth = getAuth(app);
const db = getFirestore(app);

interface OrphanUser {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
}

async function getOrphanUsers(): Promise<OrphanUser[]> {
  console.log('🔍 Buscando usuarios huérfanos...\n');
  
  const orphanUsers: OrphanUser[] = [];
  let nextPageToken: string | undefined;
  
  do {
    // Obtener usuarios de Firebase Auth (en lotes de 1000)
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    
    for (const userRecord of listUsersResult.users) {
      // Verificar si existe documento en Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      
      if (!userDoc.exists) {
        orphanUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        });
      }
    }
    
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  return orphanUsers;
}

async function deleteOrphanUsers(orphanUsers: OrphanUser[]): Promise<void> {
  console.log(`\n🗑️  Eliminando ${orphanUsers.length} usuarios huérfanos...\n`);
  
  let deleted = 0;
  let errors = 0;
  
  for (const user of orphanUsers) {
    try {
      await auth.deleteUser(user.uid);
      console.log(`  ✅ Eliminado: ${user.email || user.uid}`);
      deleted++;
    } catch (error) {
      console.error(`  ❌ Error eliminando ${user.email || user.uid}:`, error);
      errors++;
    }
  }
  
  console.log(`\n📊 Resultado: ${deleted} eliminados, ${errors} errores`);
}

async function main(): Promise<void> {
  console.log('================================================');
  console.log('  LIMPIEZA DE USUARIOS HUÉRFANOS');
  console.log('  Firebase Auth sin documento en Firestore');
  console.log('================================================\n');
  
  try {
    // Buscar usuarios huérfanos
    const orphanUsers = await getOrphanUsers();
    
    if (orphanUsers.length === 0) {
      console.log('✅ No se encontraron usuarios huérfanos. Todo está sincronizado.');
      process.exit(0);
    }
    
    // Mostrar usuarios huérfanos encontrados
    console.log(`\n⚠️  Se encontraron ${orphanUsers.length} usuarios huérfanos:\n`);
    orphanUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email || 'Sin email'} (${user.displayName || 'Sin nombre'}) - UID: ${user.uid}`);
    });
    
    // Pedir confirmación
    console.log('\n⚠️  ADVERTENCIA: Esta acción es irreversible.');
    console.log('Los usuarios serán eliminados permanentemente de Firebase Authentication.\n');
    
    // En modo automático, eliminar directamente
    // Para modo interactivo, descomentar el readline
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('¿Deseas eliminar estos usuarios? (s/n): ', async (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
        await deleteOrphanUsers(orphanUsers);
      } else {
        console.log('\n❌ Operación cancelada.');
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
