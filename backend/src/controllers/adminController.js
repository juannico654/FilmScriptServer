// src/controllers/adminController.js
const User = require('../models/User');

const ROLES_VALIDOS = ['admin', 'instructor', 'aprendiz', 'usuario'];

// GET /api/admin/users  — listar todos los usuarios
const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });

    // Agrupar por rol para que el frontend pueda mostrarlos separados
    const agrupados = {
      admin: [],
      instructor: [],
      aprendiz: [],
      usuario: []
    };

    users.forEach((u) => {
      const rol = ROLES_VALIDOS.includes(u.rol) ? u.rol : 'usuario';
      agrupados[rol].push(u);
    });

    res.json({ total: users.length, users, agrupados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// POST /api/admin/users — crear un usuario individual con todos sus datos y rol
const createUser = async (req, res) => {
  try {
    const { name, email, password, rol } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios' });
    }

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Este correo ya está registrado' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      rol: rol || 'usuario'
    });

    await user.save();

    res.status(201).json({ message: 'Usuario creado correctamente', user: user.toSafeObject() });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Datos inválidos' });
    }
    res.status(500).json({ message: 'Error al crear el usuario' });
  }
};

// PUT /api/admin/users/:id — editar los datos de un usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, rol, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ message: 'Ya existe otro usuario con ese correo' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (rol) user.rol = rol;
    if (password) user.password = password; // se rehashea en el pre('save')

    await user.save();

    res.json({ message: 'Usuario actualizado correctamente', user: user.toSafeObject() });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Datos inválidos' });
    }
    res.status(500).json({ message: 'Error al actualizar el usuario' });
  }
};

// DELETE /api/admin/users/:id  — eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Protección: no se puede eliminar al propio admin
    if (user.rol === 'admin') {
      return res.status(403).json({ message: 'No se puede eliminar una cuenta de administrador' });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: `Usuario "${user.name}" eliminado correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
};

// GET /api/admin/stats  — estadísticas rápidas
const getStats = async (req, res) => {
  try {
    const total        = await User.countDocuments();
    const admins       = await User.countDocuments({ rol: 'admin' });
    const instructores = await User.countDocuments({ rol: 'instructor' });
    const aprendices   = await User.countDocuments({ rol: 'aprendiz' });
    const usuarios     = await User.countDocuments({ rol: 'usuario' });
    res.json({ total, admins, instructores, aprendices, usuarios });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser, getStats };