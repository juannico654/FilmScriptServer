// src/routes/planRoutes.js
const express = require('express');
const router = express.Router();

const { getPlans } = require('../controllers/planController');

// GET /api/plans — público (sin autenticación), usado por la página de Precios
// y por el formulario de pago.
router.get('/', getPlans);

module.exports = router;