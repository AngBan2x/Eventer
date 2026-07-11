const express = require('express');
const eventosRoutes = require('./routes/eventos.routes');

const app = express();

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/eventos', eventosRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: "Bienvenido a la API de Gestión de Eventos FaCyT" });
});

module.exports = app;