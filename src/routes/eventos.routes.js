const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');
const { verifyAuth, optionalAuth, authorize } = require('../middlewares/auth.middleware');

// Rutas públicas / lectura
router.get('/resumen', eventosController.getResumen);

// Permite a usuarios autenticados e invitados (modo lectura) ver los eventos
router.get('/', optionalAuth, eventosController.getEventos);

router.get('/:id/asistencias', eventosController.obtenerAsistencias);

// Solicitar evento (Organizador y Admin)
router.post('/', verifyAuth, authorize(['organizador', 'admin']), eventosController.createEvento);

// Re-solicitar / Editar evento (Organizador y Admin)
router.put('/:id', verifyAuth, authorize(['organizador', 'admin']), eventosController.updateEvento);

// Aprobar o rechazar evento (Solo Admin)
router.put('/:id/estado', verifyAuth, authorize(['admin']), eventosController.updateEstado);

// Eliminar evento (Solo Admin)
router.delete('/:id', verifyAuth, authorize(['admin']), eventosController.deleteEvento);

// Marcar asistencia (Cualquier usuario autenticado)
router.post('/:id/asistir', verifyAuth, eventosController.marcarAsistencia);

module.exports = router;