const express = require('express');
const eventosRoutes = require('./routes/eventos.routes');
const espaciosRoutes = require('./routes/espacios.routes');

const app = express();
const path = require('path');

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Rutas
app.use('/api/eventos', eventosRoutes);
app.use('/api/espacios', espaciosRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: "Bienvenido a la API de Gestión de Eventos FaCyT" });
});

module.exports = app;