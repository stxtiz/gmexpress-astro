/**
 * Script para insertar las categorías por defecto en Firebase
 * Ejecutar con: npx tsx scripts/insert-default-categories.ts
 */
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

const db = getFirestore(app);

// Categorías originales que estaban hardcodeadas
const DEFAULT_CATEGORIES = [
  'Pizza',
  'Ensalada', 
  'Bebidas',
  'Desayuno',
  'Carnes'
];

async function insertDefaultCategories() {
  console.log('================================================');
  console.log('  INSERCIÓN DE CATEGORÍAS POR DEFECTO');
  console.log('================================================\n');
  console.log('🚀 Insertando categorías en Firebase...\n');
  
  const categoriesRef = db.collection('categories');
  let inserted = 0;
  let skipped = 0;
  
  for (const categoryName of DEFAULT_CATEGORIES) {
    try {
      // Verificar si ya existe una categoría con este nombre
      const existing = await categoriesRef.where('name', '==', categoryName).get();
      
      if (!existing.empty) {
        console.log(`⏭️  Categoría "${categoryName}" ya existe, saltando...`);
        skipped++;
        continue;
      }
      
      // Insertar la categoría
      await categoriesRef.add({
        name: categoryName,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: 'system-migration'  // Marcamos que fue creado por migración
      });
      
      console.log(`✅ Categoría "${categoryName}" insertada correctamente`);
      inserted++;
    } catch (error) {
      console.error(`❌ Error al insertar categoría "${categoryName}":`, error);
    }
  }
  
  console.log('\n================================================');
  console.log(`📊 Resultado: ${inserted} insertadas, ${skipped} ya existían`);
  console.log('================================================');
  console.log('\n✨ Proceso completado!');
  console.log('Las categorías ahora deberían aparecer en el filtro y selector del panel de productos.');
  console.log('Recarga la página de /admin/productos para ver los cambios.\n');
  
  process.exit(0);
}

insertDefaultCategories().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
