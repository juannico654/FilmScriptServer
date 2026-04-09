// src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Registro
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Este correo ya está registrado' });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: 'Cuenta creada correctamente',
      user: user.toSafeObject(),
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear la cuenta' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Inicio de sesión exitoso',
      user: user.toSafeObject(),
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

module.exports = {
  register,
  login
};
