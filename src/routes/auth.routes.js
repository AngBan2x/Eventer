const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyAuth, authorize } = require('../middlewares/auth.middleware');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register', authController.register);

// Rutas protegidas para Administrador
router.get('/usuarios', verifyAuth, authorize(['admin']), authController.getUsuarios);
router.put('/usuarios/:id/rol', verifyAuth, authorize(['admin']), authController.cambiarRol);

module.exports = router;