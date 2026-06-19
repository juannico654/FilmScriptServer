// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verificar JWT y obtener usuario
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "JWT_SECRET no está configurado en el servidor" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verify failed:", error.name, error.message);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expirado. Vuelve a iniciar sesión." });
    }
    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: `Token inválido: ${error.message}` });
    }
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

// Verificar que sea instructor o admin
const verificarInstructor = (req, res, next) => {
  if (req.user.rol !== "instructor" && req.user.rol !== "admin") {
    return res
      .status(403)
      .json({ message: "Solo instructores y admins pueden acceder" });
  }
  next();
};

// Verificar que tenga licencia activa (solo aplica al rol "usuario")
const verificarLicencia = (req, res, next) => {
  const { rol, licencia } = req.user;

  // Administradores, instructores y aprendices siempre tienen acceso completo
  if (rol === "admin" || rol === "instructor" || rol === "aprendiz") {
    return next();
  }

  // Los usuarios (cuentas que deben pagar un plan) necesitan licencia activa
  if (
    !licencia ||
    licencia.estado !== "activa" ||
    !licencia.fechaExpiracion ||
    new Date() > licencia.fechaExpiracion
  ) {
    return res.status(403).json({
      message:
        "Licencia inactiva, vencida o no asignada. Debes adquirir un plan para usar la plataforma.",
      licencia: licencia || null,
    });
  }

  next();
};

module.exports = {
  verifyToken,
  verificarInstructor,
  verificarLicencia,
};
