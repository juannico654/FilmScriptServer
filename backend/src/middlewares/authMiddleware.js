// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verificar JWT y obtener usuario
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Verificar que sea instructor o admin
const verificarInstructor = (req, res, next) => {
  if (req.user.rol !== 'instructor' && req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Solo instructores y admins pueden acceder' });
  }
  next();
};

// Verificar que tenga licencia activa (para estudiantes)
const verificarLicencia = (req, res, next) => {
  const { rol, licencia } = req.user;
  
  // Instructores y admins siempre tienen acceso
  if (rol === 'instructor' || rol === 'admin') {
    return next();
  }
  
  // Estudiantes necesitan licencia activa
  if (!licencia || licencia.estado !== 'activa' || new Date() > licencia.fechaExpiracion) {
    return res.status(403).json({ 
      message: 'Licencia inactiva, vencida o no asignada',
      licencia: licencia || null
    });
  }
  
  next();
};

module.exports = {
  verifyToken,
  verificarInstructor,
  verificarLicencia
};
