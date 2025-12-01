const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const db = require('./db');
const { getHippieProducts, getColoridoProducts, getGoticoProducts, getMinimalistaProducts, findUserByUsername, createUser, updateProductQuantity, getProductStock } = require('./firebase');

// Configurar middleware para procesar datos del formulario
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configurar sesiones
const sessionConfig = {
  secret: 'tity-creations-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    httpOnly: true
  }
};

// Si hay MongoDB URI (producción), usar MongoStore
if (process.env.MONGODB_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // actualizar solo una vez cada 24h
  });
  console.log('Usando MongoDB para sesiones');
} else {
  console.log('Usando MemoryStore (solo para desarrollo)');
}

app.use(session(sessionConfig));

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'views'))); // Para acceder a styles.css

// Init DB
db.init();

// Middleware de autenticación
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Rutas públicas (solo login y register)
const routes = {
  '/login': (req, res) => {
    if (req.session.user) {
      return res.redirect('/');
    }
    res.render('login');
  },
  '/register': (req, res) => {
    if (req.session.user) {
      return res.redirect('/');
    }
    res.render('register');
  }
};

// Rutas protegidas (requieren autenticación)
const protectedRoutes = {
  '/': (req, res) => res.render('index', { user: req.session.user }),
  '/nosotros': (req, res) => res.render('nosotros', { user: req.session.user }),
  '/contacto': (req, res) => res.render('contacto', { user: req.session.user }),
  '/carrito': (req, res) => {
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const message = req.session.cartMessage;
    if (req.session.cartMessage) delete req.session.cartMessage;
    res.render('carrito', { carrito, total, user: req.session.user, message });
  },
  '/colorido': async (req, res) => {
    try {
      let products = await getColoridoProducts();
      if (!Array.isArray(products) || products.length === 0) {
        products = await db.findProductsByStyle('colorido').catch(() => []);
      }
      res.render('colorido', { products, user: req.session.user });
    } catch (e) {
      console.error('Firestore colorido error:', e);
      res.render('colorido', { products: [], user: req.session.user });
    }
  },
  '/gotico': async (req, res) => {
    try {
      let products = await getGoticoProducts();
      if (!Array.isArray(products) || products.length === 0) {
        products = await db.findProductsByStyle('gotico').catch(() => []);
      }
      res.render('gotico', { products, user: req.session.user });
    } catch (e) {
      console.error('Firestore gotico error:', e);
      res.render('gotico', { products: [], user: req.session.user });
    }
  },
  '/hippie': async (req, res) => {
    try {
      let products = await getHippieProducts();
      if (!Array.isArray(products) || products.length === 0) {
        products = await db.findProductsByStyle('hippie').catch(() => []);
      }
      res.render('hippie', { products, user: req.session.user });
    } catch (e) {
      console.error('Firestore hippie error:', e);
      res.render('hippie', { products: [], user: req.session.user });
    }
  },
  '/minimalista': async (req, res) => {
    try {
      let products = await getMinimalistaProducts();
      if (!Array.isArray(products) || products.length === 0) {
        products = await db.findProductsByStyle('minimalista').catch(() => []);
      }
      res.render('minimalista', { products, user: req.session.user });
    } catch (e) {
      console.error('Firestore minimalista error:', e);
      res.render('minimalista', { products: [], user: req.session.user });
    }
  }
};

// Registrar rutas públicas
Object.entries(routes).forEach(([path, handler]) => {
  app.get(path, handler);
});

// Registrar rutas protegidas con middleware de autenticación
Object.entries(protectedRoutes).forEach(([path, handler]) => {
  app.get(path, requireAuth, handler);
});

// Actualizar cantidad de un producto en el carrito
app.post('/carrito/actualizar', requireAuth, async (req, res) => {
  const { producto, cantidad } = req.body;
  const cantidadSolicitada = Math.max(1, parseInt(cantidad, 10) || 1);
  if (!req.session.carrito) req.session.carrito = [];
  const item = req.session.carrito.find(i => i.producto === producto);
  if (item) {
    // Validar contra stock disponible en Firestore
    try {
      const stockDisponible = await getProductStock(item.estilo, item.producto);
      console.log(`Validando stock para ${producto}: solicitado=${cantidadSolicitada}, disponible=${stockDisponible}`);
      if (stockDisponible <= 0) {
        // Sin stock: eliminar del carrito
        req.session.carrito = req.session.carrito.filter(i => i.producto !== producto);
        console.log(`Sin stock, eliminado del carrito: ${producto}`);
        req.session.cartMessage = { type: 'error', text: `"${producto}" no tiene stock y se eliminó del carrito.` };
      } else {
        if (cantidadSolicitada > stockDisponible) {
          item.cantidad = stockDisponible;
          console.log(`Cantidad limitada por stock: ${producto} -> ${stockDisponible} (solicitado: ${cantidadSolicitada})`);
          req.session.cartMessage = { type: 'warning', text: `Ajustamos "${producto}" a ${stockDisponible} unidades por límite de stock (solicitaste ${cantidadSolicitada}).` };
        } else {
          item.cantidad = cantidadSolicitada;
          console.log(`Cantidad actualizada: ${producto} -> ${cantidadSolicitada}`);
          req.session.cartMessage = { type: 'success', text: `Cantidad de "${producto}" actualizada a ${cantidadSolicitada}.` };
        }
      }
    } catch (e) {
      // En caso de error de stock, conservar actualización básica
      item.cantidad = cantidadSolicitada;
      console.warn('Error validando stock en /carrito/actualizar:', e.message || e);
      req.session.cartMessage = { type: 'info', text: `Actualizamos la cantidad de "${producto}".` };
    }
  }
  res.redirect('/carrito');
});

// Eliminar un producto del carrito
app.post('/carrito/eliminar', requireAuth, (req, res) => {
  const { producto } = req.body;
  if (!req.session.carrito) req.session.carrito = [];
  req.session.carrito = req.session.carrito.filter(i => i.producto !== producto);
  console.log(`Producto eliminado del carrito: ${producto}`);
  req.session.cartMessage = { type: 'info', text: `"${producto}" fue eliminado del carrito.` };
  res.redirect('/carrito');
});

// Ruta para manejar el envío del formulario de login
app.post('/login', async (req, res) => {
  const { usuario, contra } = req.body;
  try {
    const user = await findUserByUsername(usuario);
    if (!user || user.contra !== contra) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }
    // Crear sesión
    req.session.user = {
      id: user.id,
      usuario: user.usuario
    };
    console.log(`Usuario autenticado: ${usuario}`);
    res.redirect('/');
  } catch (err) {
    console.error('Error en login:', err);
    res.render('login', { error: 'Error del servidor' });
  }
});

app.post('/register', async (req, res) => {
  const { usuario, contra } = req.body;
  try {
    // Verificar si el usuario ya existe
    const existing = await findUserByUsername(usuario);
    if (existing) {
      return res.render('register', { error: 'El usuario ya existe' });
    }
    
    // Crear nuevo usuario
    await createUser(usuario, contra);
    console.log(`Nuevo usuario registrado: ${usuario}`);
    res.redirect('/login');
  } catch (err) {
    console.error('Error en registro:', err);
    res.render('register', { error: 'Error al registrar usuario' });
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  const usuario = req.session.user?.usuario;
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    } else {
      console.log(`Usuario cerró sesión: ${usuario}`);
    }
    res.redirect('/login');
  });
});

// Ruta para agregar al carrito
app.post('/agregar-carrito', requireAuth, (req, res) => {
  const { producto, precio, imagen, estilo } = req.body;
  
  // Inicializar carrito si no existe
  if (!req.session.carrito) {
    req.session.carrito = [];
  }
  
  // Buscar si el producto ya está en el carrito
  const existente = req.session.carrito.find(item => item.producto === producto);
  
  if (existente) {
    existente.cantidad += 1;
  } else {
    req.session.carrito.push({
      producto,
      precio: parseFloat(precio),
      imagen,
      estilo,
      cantidad: 1
    });
  }
  
  console.log(`Producto agregado al carrito: ${producto}`);
  res.redirect(`/${estilo}`);
});

// Ruta para comprar directo (un solo producto)
app.post('/comprar-directo', requireAuth, (req, res) => {
  const { producto, precio, imagen, estilo } = req.body;
  
  // Crear carrito temporal con un solo producto
  req.session.carritoTemporal = [{
    producto,
    precio: parseFloat(precio),
    imagen,
    estilo,
    cantidad: 1
  }];
  
  res.redirect('/comprar');
});

// Ruta para ver página de compra
app.get('/comprar', requireAuth, (req, res) => {
  const carrito = req.session.carritoTemporal || req.session.carrito || [];
  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  res.render('comprar', { carrito, total, user: req.session.user });
});

// Ruta para confirmar compra y generar comprobante
app.post('/confirmar-compra', requireAuth, async (req, res) => {
  const carrito = req.session.carritoTemporal || req.session.carrito || [];
  
    // Validar stock disponible antes de procesar la compra
    for (const item of carrito) {
      if (item.estilo) {
        const stockDisponible = await getProductStock(item.estilo, item.producto);
        if (stockDisponible < item.cantidad) {
          // Stock insuficiente: ajustar carrito y redirigir con mensaje visible
          if (stockDisponible <= 0) {
            if (req.session.carritoTemporal) {
              req.session.carritoTemporal = req.session.carritoTemporal.filter(i => i.producto !== item.producto);
            }
            if (req.session.carrito) {
              req.session.carrito = req.session.carrito.filter(i => i.producto !== item.producto);
            }
            req.session.cartMessage = { type: 'error', text: `"${item.producto}" no tiene stock y se eliminó del carrito.` };
          } else {
            if (req.session.carritoTemporal) {
              const it = req.session.carritoTemporal.find(i => i.producto === item.producto);
              if (it) it.cantidad = stockDisponible;
            }
            if (req.session.carrito) {
              const it2 = req.session.carrito.find(i => i.producto === item.producto);
              if (it2) it2.cantidad = stockDisponible;
            }
            req.session.cartMessage = { type: 'warning', text: `Ajustamos "${item.producto}" a ${stockDisponible} por límite de stock.` };
          }
          if (req.session.carritoTemporal) {
            // Mostrar el carrito temporal en /carrito
            req.session.carrito = req.session.carritoTemporal;
            delete req.session.carritoTemporal;
          }
          return res.redirect('/carrito');
        }
      }
    }
  
  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const usuario = req.session.user.usuario;
  const fecha = new Date().toLocaleString('es-MX');
  
  // Actualizar cantidades en Firestore
  for (const item of carrito) {
    if (item.estilo) {
      console.log(`Procesando compra: ${item.producto}, cantidad en carrito: ${item.cantidad}, estilo: ${item.estilo}`);
      await updateProductQuantity(item.estilo, item.producto, item.cantidad);
    }
  }
  
  // Generar contenido del comprobante
  let comprobante = `========================================\n`;
  comprobante += `         TITY CREATIONS\n`;
  comprobante += `========================================\n`;
  comprobante += `Fecha: ${fecha}\n`;
  comprobante += `Cliente: ${usuario}\n`;
  comprobante += `========================================\n\n`;
  comprobante += `PRODUCTOS:\n\n`;
  
  carrito.forEach((item, index) => {
    comprobante += `${index + 1}. ${item.producto}\n`;
    comprobante += `   Precio unitario: $${item.precio.toFixed(2)}\n`;
    comprobante += `   Cantidad: ${item.cantidad}\n`;
    comprobante += `   Subtotal: $${(item.precio * item.cantidad).toFixed(2)}\n\n`;
  });
  
  comprobante += `========================================\n`;
  comprobante += `TOTAL: $${total.toFixed(2)}\n`;
  comprobante += `========================================\n\n`;
  comprobante += `¡Gracias por su compra!\n`;
  
  // Limpiar carrito
  if (req.session.carritoTemporal) {
    delete req.session.carritoTemporal;
  } else {
    req.session.carrito = [];
  }
  
  // Enviar archivo como descarga
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="comprobante_${Date.now()}.txt"`);
  res.send(comprobante);
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


