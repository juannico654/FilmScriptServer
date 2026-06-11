// src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();

const { listUsers, createUser, updateUser, deleteUser, getStats } = require('../controllers/adminController');
const { updatePlans } = require('../controllers/planController');
const { verifyAdmin } = require('../middlewares/adminMiddleware');

// Todas las rutas de admin requieren autenticación de admin
router.use(verifyAdmin);

// Usuarios
router.get('/users',        listUsers);
router.post('/users',       createUser);
router.put('/users/:id',    updateUser);
router.delete('/users/:id', deleteUser);

// Estadísticas
router.get('/stats', getStats);

// Planes / precios
router.put('/plans', updatePlans);

module.exports = router;