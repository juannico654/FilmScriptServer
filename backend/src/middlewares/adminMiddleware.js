// src/middlewares/adminMiddleware.js
// Middleware simple: valida un token de admin por variable de entorno
// Se usa hasta que el backend tenga auth completo con JWT para el admin.

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@filmscript.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin2024!";

// Para las rutas de admin, aceptamos un header especial X-Admin-Key
// cuyo valor es base64(email:password), o el token JWT de un usuario admin.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    // Opción 1: Header X-Admin-Key: base64("admin@filmscript.com:Admin2024!")
    const adminKey = req.headers['x-admin-key'];
    if (adminKey) {
      const decoded = Buffer.from(adminKey, 'base64').toString('utf8');
      const [email, ...pwParts] = decoded.split(':');
      const password = pwParts.join(':');
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.isAdmin = true;
        return next();
      }
      return res.status(401).json({ message: 'Credenciales de administrador inválidas' });
    }

    // Opción 2: Bearer JWT de un usuario con rol=admin
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user    = await User.findById(decoded.id);
      if (user && user.rol === 'admin') {
        req.user    = user;
        req.isAdmin = true;
        return next();
      }
    }

    return res.status(403).json({ message: 'Acceso de administrador requerido' });
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = { verifyAdmin };