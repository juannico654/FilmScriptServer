// src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();

const { listUsers, deleteUser, getStats } = require('../controllers/adminController');
const { verifyAdmin } = require('../middlewares/adminMiddleware');

// Todas las rutas de admin requieren autenticación de admin
router.use(verifyAdmin);

router.get('/users',        listUsers);
router.delete('/users/:id', deleteUser);
router.get('/stats',        getStats);

module.exports = router;