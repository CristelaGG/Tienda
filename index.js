const express = require('express');
const path = require('path');
const app = express();

// Configurar middleware para procesar datos del formulario
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'views'))); // Para acceder a styles.css

// Ruta principal
app.get('/', (req, res) => {
  res.render('index');
});

// Definición de todas las rutas
const routes = {
  // Páginas principales
  '/': (req, res) => res.render('index'),
  '/nosotros': (req, res) => res.render('nosotros'),
  '/contacto': (req, res) => res.render('contacto'),
  
  // Catálogos
  '/colorido': (req, res) => res.render('colorido'),
  '/gotico': (req, res) => res.render('gotico'),
  '/hippie': (req, res) => res.render('hippie'),
  '/minimalista': (req, res) => res.render('minimalista'),
  
  // Autenticación
  '/login': (req, res) => res.render('login', { title: 'Iniciar Sesión' }),
  '/register': (req, res) => res.render('register', { title: 'Registro' })
};

// Registrar todas las rutas GET
Object.entries(routes).forEach(([path, handler]) => {
  app.get(path, handler);
});

// Ruta para manejar el envío del formulario de login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Intento de login:', { email }); // Para debugging
  // Aquí irá la lógica de autenticación
  // Por ahora solo redirigimos a la página principal
  res.redirect('/');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


