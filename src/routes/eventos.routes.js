const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');

router.get('/resumen', eventosController.getResumen);
router.get('/', eventosController.getEventos);
router.post('/', eventosController.createEvento);
router.put('/:id', eventosController.updateEvento);
router.delete('/:id', eventosController.deleteEvento);

module.exports = router;