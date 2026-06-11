// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const { getPlans } = require('../controllers/planController');
const { estadoLicencia, comprarPlan } = require('../controllers/paymentController');

// Todas las rutas requieren un usuario autenticado
router.use(verifyToken);

// GET /api/payments/planes — precios vigentes (igual que /api/plans, conveniencia)
router.get('/planes', getPlans);

// GET /api/payments/estado — estado de la licencia del usuario actual
router.get('/estado', estadoLicencia);

// POST /api/payments/comprar — comprar/renovar un plan
router.post('/comprar', comprarPlan);

module.exports = router;