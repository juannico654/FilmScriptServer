import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import process from 'process';

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hash
    });

    await user.save();

    res.json({ message: "Usuario creado" });

  } catch {
    res.status(500).json({ message: "Error del servidor" });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Usuario no existe" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch {
    res.status(500).json({ message: "Error del servidor" });
  }
};