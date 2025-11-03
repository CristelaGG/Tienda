const express = require('express');
const path = require('path');
const app = express();

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar middleware para archivos estáticos
// Montamos cada carpeta de imágenes bajo su propio prefijo para que las rutas en las vistas coincidan.
app.use('/img', express.static(path.join(__dirname, 'img')));
// Mantener 'views' estático para acceder a styles.css con ruta /styles.css
app.use(express.static(path.join(__dirname, 'views'))); // Para acceder a styles.css

// Ruta principal
app.get('/', (req, res) => {
  res.render('index');
});

// Rutas para las diferentes categorías
app.get('/colorido', (req, res) => res.render('colorido'));
app.get('/gotico', (req, res) => res.render('gotico'));
app.get('/hippie', (req, res) => res.render('hippie'));
app.get('/minimalista', (req, res) => res.render('minimalista'));
app.get('/nosotros', (req, res) => res.render('nosotros'));
app.get('/contacto', (req, res) => res.render('contacto'));

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


