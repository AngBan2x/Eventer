const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');

// Orden crítico: rutas estáticas antes que dinámicas
router.get('/resumen', eventosController.getResumen);
router.get('/', eventosController.getEventos);
router.post('/', eventosController.createEvento);
router.put('/:id', eventosController.updateEvento); // Para editar y cambiar estados

module.exports = router;