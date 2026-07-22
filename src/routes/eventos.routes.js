const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');
const { verifyAuth, authorize } = require('../middlewares/auth.middleware');

// Rutas públicas / lectura
router.get('/resumen', eventosController.getResumen);

// Se agrega verifyAuth para que el controlador conozca el rol del usuario que consulta
router.get('/', verifyAuth, eventosController.getEventos);

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