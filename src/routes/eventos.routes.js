const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');

// Definición de endpoints
router.get('/', eventosController.getEventos);
router.post('/', eventosController.createEvento);

module.exports = router;