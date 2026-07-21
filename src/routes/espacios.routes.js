const express = require('express');
const router = express.Router();
const espaciosController = require('../controllers/espacios.controller');
const { verifyAuth, authorize } = require('../middlewares/auth.middleware');

router.get('/', espaciosController.getEspacios);
router.post('/', verifyAuth, authorize(['admin']), espaciosController.createEspacio);
router.put('/:id', verifyAuth, authorize(['admin']), espaciosController.updateEspacio);
router.delete('/:id', verifyAuth, authorize(['admin']), espaciosController.deleteEspacio); 

module.exports = router;