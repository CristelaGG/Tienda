const express = require('express');
const path = require('path');
const app = express();

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'img_colorido')));
app.use(express.static(path.join(__dirname, 'img_gotico')));
app.use(express.static(path.join(__dirname, 'img_hippie')));
app.use(express.static(path.join(__dirname, 'img_minimalista')));
app.use(express.static(path.join(__dirname, 'views'))); // Para acceder a styles.css

// Ruta principal
app.get('/', (req, res) => {
    res.render('index');
});

// Rutas para las diferentes categorías
app.get('/colorido', (req, res) => {
    res.render('colorido');
});

app.get('/gotico', (req, res) => {
    res.render('gotico');
});

app.get('/hippie', (req, res) => {
    res.render('hippie');
});

app.get('/minimalista', (req, res) => {
    res.render('minimalista');
});

app.get('/nosotros', (req, res) => {
    res.render('nosotros');
});

app.get('/contacto', (req, res) => {
    res.render('contacto');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

powershell -Command "Start-Service ssh-agent"
ssh-add %USERPROFILE%\.ssh\id_ed25519
ssh-add -l
git push -u origin main