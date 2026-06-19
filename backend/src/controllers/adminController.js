// src/controllers/adminController.js
const User = require("../models/User");
const Licencia = require("../models/Licencia");

const ROLES_VALIDOS = ["admin", "instructor", "aprendiz", "usuario"];
const ESTADOS_LICENCIA_VALIDOS = ["activa", "inactiva", "vencida"];
const TIPOS_LICENCIA_VALIDOS = ["mensual", "anual", "vitalicia"];

const normalizeText = (value = "") => String(value || "").trim();
const normalizeEmail = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const REQUIRED_FIELDS_BY_ROLE = {
  admin: ["name", "email"],
  usuario: ["name", "email"],
  instructor: [
    "name",
    "email",
    "perfilSena.ficha",
    "perfilSena.programaFormacion",
  ],
  aprendiz: [
    "name",
    "email",
    "perfilSena.tipoDocumento",
    "perfilSena.numeroDocumento",
    "perfilSena.primerApellido",
    "perfilSena.primerNombre",
    "perfilSena.ficha",
    "perfilSena.programaFormacion",
  ],
};

const getValueByPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? "" : acc[key]), obj);

const isFilled = (value) => {
  if (value == null) return false;
  return String(value).trim().length > 0;
};

const validateRequiredByRole = (payload, rol) => {
  const required =
    REQUIRED_FIELDS_BY_ROLE[rol] || REQUIRED_FIELDS_BY_ROLE.usuario;
  const missing = required.filter(
    (path) => !isFilled(getValueByPath(payload, path)),
  );
  return {
    ok: missing.length === 0,
    missing,
  };
};

const buildPerfilSena = (input = {}) => ({
  tipoDocumento: normalizeText(input.tipoDocumento),
  numeroDocumento: normalizeText(input.numeroDocumento),
  primerApellido: normalizeText(input.primerApellido),
  segundoApellido: normalizeText(input.segundoApellido),
  primerNombre: normalizeText(input.primerNombre),
  otrosNombres: normalizeText(input.otrosNombres),
  correoElectronico: normalizeEmail(input.correoElectronico),
  telefono: normalizeText(input.telefono),
  ficha: normalizeText(input.ficha),
  programaFormacion: normalizeText(input.programaFormacion),
});

const mergePerfilSena = (currentPerfil = {}, nextPerfil = {}) => {
  const normalizedNext = buildPerfilSena(nextPerfil);
  const merged = { ...currentPerfil };
  Object.keys(normalizedNext).forEach((key) => {
    if (normalizedNext[key]) merged[key] = normalizedNext[key];
  });
  return merged;
};

const resolveLicenseUpdate = (
  { estado, tipo, fechaExpiracion, plan },
  current = {},
) => {
  const next = {
    ...current,
    estado,
  };

  if (tipo) next.tipo = tipo;
  if (plan !== undefined) next.plan = plan;

  if (fechaExpiracion) {
    next.fechaExpiracion = new Date(fechaExpiracion);
  } else if (estado === "inactiva") {
    next.fechaExpiracion = null;
  } else if (estado === "activa" && !next.fechaExpiracion) {
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
    next.fechaExpiracion = defaultExpiry;
  }

  return next;
};

// GET /api/admin/users  — listar todos los usuarios
const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });

    // Agrupar por rol para que el frontend pueda mostrarlos separados
    const agrupados = {
      admin: [],
      instructor: [],
      aprendiz: [],
      usuario: [],
    };

    users.forEach((u) => {
      const rol = ROLES_VALIDOS.includes(u.rol) ? u.rol : "usuario";
      agrupados[rol].push(u);
    });

    res.json({ total: users.length, users, agrupados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// POST /api/admin/users — crear un usuario individual con todos sus datos y rol
const createUser = async (req, res) => {
  try {
    const { name, email, password, rol, perfilSena } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nombre, correo y contraseña son obligatorios" });
    }

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}`,
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const roleToUse = rol || "usuario";
    const perfilToUse = buildPerfilSena({
      ...perfilSena,
      correoElectronico: perfilSena?.correoElectronico || normalizedEmail,
    });

    const validation = validateRequiredByRole(
      {
        name: normalizeText(name),
        email: normalizedEmail,
        perfilSena: perfilToUse,
      },
      roleToUse,
    );

    if (!validation.ok) {
      return res.status(400).json({
        message: `Faltan campos obligatorios para el rol ${roleToUse}`,
        missingFields: validation.missing,
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Este correo ya está registrado" });
    }

    const user = new User({
      name: normalizeText(name),
      email: normalizedEmail,
      password,
      rol: roleToUse,
      perfilSena: perfilToUse,
    });

    await user.save();

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0]?.message || "Datos inválidos",
      });
    }
    res.status(500).json({ message: "Error al crear el usuario" });
  }
};

// PUT /api/admin/users/:id — editar los datos de un usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, rol, password, perfilSena } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}`,
      });
    }

    if (email && normalizeEmail(email) !== user.email) {
      const existing = await User.findOne({ email: normalizeEmail(email) });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Ya existe otro usuario con ese correo" });
      }
      user.email = normalizeEmail(email);
    }

    if (name) user.name = normalizeText(name);
    if (rol) user.rol = rol;
    if (password) user.password = password; // se rehashea en el pre('save')
    if (perfilSena && typeof perfilSena === "object") {
      user.perfilSena = mergePerfilSena(user.perfilSena || {}, perfilSena);
      if (!user.perfilSena.correoElectronico) {
        user.perfilSena.correoElectronico = user.email;
      }
    }

    const validation = validateRequiredByRole(
      {
        name: user.name,
        email: user.email,
        perfilSena: user.perfilSena || {},
      },
      user.rol,
    );

    if (!validation.ok) {
      return res.status(400).json({
        message: `Faltan campos obligatorios para el rol ${user.rol}`,
        missingFields: validation.missing,
      });
    }

    await user.save();

    res.json({
      message: "Usuario actualizado correctamente",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0]?.message || "Datos inválidos",
      });
    }
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
};

// DELETE /api/admin/users/:id  — eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Protección: no se puede eliminar al propio admin
    if (user.rol === "admin") {
      return res
        .status(403)
        .json({ message: "No se puede eliminar una cuenta de administrador" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: `Usuario "${user.name}" eliminado correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el usuario" });
  }
};

// GET /api/admin/stats  — estadísticas rápidas
const getStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const admins = await User.countDocuments({ rol: "admin" });
    const instructores = await User.countDocuments({ rol: "instructor" });
    const aprendices = await User.countDocuments({ rol: "aprendiz" });
    const usuarios = await User.countDocuments({ rol: "usuario" });
    res.json({ total, admins, instructores, aprendices, usuarios });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// PATCH /api/admin/users/:id/license — activar/desactivar licencia de un usuario
const updateUserLicenseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, tipo, fechaExpiracion, plan } = req.body;

    if (!ESTADOS_LICENCIA_VALIDOS.includes(estado)) {
      return res.status(400).json({
        message: `Estado de licencia inválido. Debe ser uno de: ${ESTADOS_LICENCIA_VALIDOS.join(", ")}`,
      });
    }

    if (tipo && !TIPOS_LICENCIA_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        message: `Tipo de licencia inválido. Debe ser uno de: ${TIPOS_LICENCIA_VALIDOS.join(", ")}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const licenciaActualizada = resolveLicenseUpdate(
      { estado, tipo, fechaExpiracion, plan },
      user.licencia || {},
    );

    user.licencia = {
      ...licenciaActualizada,
      asignadoPor: req.user?._id || user.licencia?.asignadoPor || null,
    };
    await user.save();

    const licenciaDoc = await Licencia.findOne({ usuarioId: user._id });
    if (licenciaDoc) {
      licenciaDoc.estado = estado;
      if (tipo) licenciaDoc.tipo = tipo;
      if (plan !== undefined) licenciaDoc.plan = plan;
      if (licenciaActualizada.fechaExpiracion) {
        licenciaDoc.fechaExpiracion = licenciaActualizada.fechaExpiracion;
      }
      await licenciaDoc.save();
    }

    return res.json({
      message: `Licencia del usuario ${user.name} actualizada a ${estado}`,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al actualizar licencia del usuario" });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getStats,
  updateUserLicenseStatus,
};
