const express = require('express');
const router = express.Router();
const espaciosController = require('../controllers/espacios.controller');

router.get('/', espaciosController.getEspacios);
router.post('/', espaciosController.createEspacio);

module.exports = router;