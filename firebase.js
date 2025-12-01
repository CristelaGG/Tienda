// Inicializa Firebase Admin SDK con archivo de credenciales
const admin = require('firebase-admin');
const path = require('path');

let _db;
function initFirebase() {
  if (!_db) {
    try {
      let serviceAccount;
      
      // En producción (Render), usar variable de entorno
      if (process.env.FIREBASE_CONFIG) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
        console.log('Usando credenciales de Firebase desde variable de entorno');
      } else {
        // En desarrollo local, usar archivo
        serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
        console.log('Usando credenciales de Firebase desde archivo local');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "tienda-3e019",
      });
      console.log('Firebase Admin inicializado correctamente');
    } catch (error) {
      console.error('Error al cargar Firebase:', error.message);
      console.log('\nPara desarrollo local:');
      console.log('1. Ve a: https://console.firebase.google.com/project/tienda-3e019/settings/serviceaccounts/adminsdk');
      console.log('2. Haz clic en "Generar nueva clave privada"');
      console.log('3. Guarda el archivo como "serviceAccountKey.json" en la carpeta del proyecto');
      console.log('\nPara producción (Render):');
      console.log('Agrega FIREBASE_CONFIG como variable de entorno con el contenido del JSON');
      throw error;
    }
    _db = admin.firestore();
  }
  return _db;
}

async function getHippieProducts() {
  try {
    const db = initFirebase();
    const snapshot = await db.collection('hippie').get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log(`Productos cargados desde Firestore (hippie): ${products.length}`);
    return products;
  } catch (err) {
    console.error('Error obteniendo productos de Firestore (hippie):', err.message || err);
    return [];
  }
}

async function getColoridoProducts() {
  try {
    const db = initFirebase();
    const snapshot = await db.collection('colorido').get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log(`Productos cargados desde Firestore (colorido): ${products.length}`);
    return products;
  } catch (err) {
    console.error('Error obteniendo productos de Firestore (colorido):', err.message || err);
    return [];
  }
}

async function getGoticoProducts() {
  try {
    const db = initFirebase();
    const snapshot = await db.collection('gotico').get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log(`Productos cargados desde Firestore (gotico): ${products.length}`);
    return products;
  } catch (err) {
    console.error('Error obteniendo productos de Firestore (gotico):', err.message || err);
    return [];
  }
}

async function getMinimalistaProducts() {
  try {
    const db = initFirebase();
    const snapshot = await db.collection('minimalista').get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log(`Productos cargados desde Firestore (minimalista): ${products.length}`);
    return products;
  } catch (err) {
    console.error('Error obteniendo productos de Firestore (minimalista):', err.message || err);
    return [];
  }
}

async function findUserByUsername(usuario) {
  try {
    const db = initFirebase();
    const snapshot = await db.collection('usuarios')
      .where('usuario', '==', usuario)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.error('Error buscando usuario:', err.message || err);
    return null;
  }
}

async function createUser(usuario, contra) {
  try {
    const db = initFirebase();
    const docRef = await db.collection('usuarios').add({
      usuario,
      contra,
      createdAt: new Date().toISOString()
    });
    console.log(`Usuario creado: ${usuario}`);
    return { id: docRef.id, usuario, contra };
  } catch (err) {
    console.error('Error creando usuario:', err.message || err);
    throw err;
  }
}

async function updateProductQuantity(estilo, producto, cantidadComprada) {
  try {
    console.log(`updateProductQuantity llamada con: estilo=${estilo}, producto=${producto}, cantidadComprada=${cantidadComprada} (tipo: ${typeof cantidadComprada})`);
    const db = initFirebase();
    const snapshot = await db.collection(estilo)
      .where('producto', '==', producto)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log(`Producto no encontrado en ${estilo}: ${producto}`);
      return false;
    }
    
    const doc = snapshot.docs[0];
    const currentQuantity = doc.data().cantidad || 0;
    const newQuantity = Math.max(0, currentQuantity - cantidadComprada);
    
    await doc.ref.update({
      cantidad: newQuantity
    });
    
    console.log(`Actualizado ${producto} en ${estilo}: ${currentQuantity} -> ${newQuantity} (restado: ${cantidadComprada})`);
    return true;
  } catch (err) {
    console.error('Error actualizando cantidad del producto:', err.message || err);
    return false;
  }
}

async function getProductStock(estilo, producto) {
  try {
    const db = initFirebase();
    const snapshot = await db.collection(estilo)
      .where('producto', '==', producto)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const doc = snapshot.docs[0];
    return doc.data().cantidad || 0;
  } catch (err) {
    console.error('Error obteniendo stock del producto:', err.message || err);
    return 0;
  }
}

module.exports = { 
  initFirebase, 
  getHippieProducts, 
  getColoridoProducts, 
  getGoticoProducts, 
  getMinimalistaProducts,
  findUserByUsername,
  createUser,
  updateProductQuantity,
  getProductStock
};
