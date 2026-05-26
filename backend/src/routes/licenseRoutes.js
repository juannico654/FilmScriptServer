// src/routes/licenseRoutes.js
const express = require('express');
const router = express.Router();

const { verifyToken, verificarInstructor } = require('../middlewares/authMiddleware');
const {
  obtenerEstudiantes,
  asignarLicencia,
  renovarLicencia,
  revocarLicencia
} = require('../controllers/licenseController');

// Todas las rutas requieren autenticación e ser instructor
router.use(verifyToken, verificarInstructor);

// GET: Obtener lista de estudiantes
router.get('/estudiantes', obtenerEstudiantes);

// POST: Asignar licencia a un estudiante
router.post('/asignar', asignarLicencia);

// PATCH: Renovar licencia
router.patch('/:licenciaId/renovar', renovarLicencia);

// DELETE: Revocar licencia
router.delete('/:licenciaId/revocar', revocarLicencia);

module.exports = router;
