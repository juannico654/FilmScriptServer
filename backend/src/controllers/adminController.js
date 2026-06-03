// src/controllers/adminController.js
const User = require('../models/User');

// GET /api/admin/users  — listar todos los usuarios
const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
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
    const total      = await User.countDocuments();
    const admins     = await User.countDocuments({ rol: 'admin' });
    const instructores = await User.countDocuments({ rol: 'instructor' });
    const estudiantes  = await User.countDocuments({ rol: 'estudiante' });
    res.json({ total, admins, instructores, estudiantes });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

module.exports = { listUsers, deleteUser, getStats };