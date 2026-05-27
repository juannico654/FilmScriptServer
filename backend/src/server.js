// src/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const User = require('./models/User');

// Importar rutas (solo si existen)
let authRoutes;
let licenseRoutes;
try {
  authRoutes = require('./routes/authRoutes');
} catch (err) {
  console.log("⚠️  Archivo authRoutes.js aún no existe. Se creará después.");
}
try {
  licenseRoutes = require('./routes/licenseRoutes');
} catch (err) {
  console.log("⚠️  Archivo licenseRoutes.js aún no existe. Se creará después.");
}

// Rutas
if (authRoutes) {
  app.use('/api/auth', authRoutes);
}
if (licenseRoutes) {
  app.use('/api/licenses', licenseRoutes);
}

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend de FilmScript funcionando correctamente 🎥',
    database: 'FilmScript',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('¡Bienvenido al Backend de FilmScript! 🎬');
});

// Conexión a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB - Base de datos: FilmScript');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

// Iniciar servidor
const PORT = process.env.PORT || 5000;

const seedInstructor = async () => {
  if (process.env.NODE_ENV === 'production') return;

  const email = process.env.SEED_INSTRUCTOR_EMAIL || 'instructor@filmscript.test';
  const password = process.env.SEED_INSTRUCTOR_PASSWORD || 'Instr1234!';

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.rol !== 'instructor') {
      existing.rol = 'instructor';
      await existing.save();
      console.log(`🔧 Usuario existente actualizado a instructor: ${email}`);
    } else {
      console.log(`✅ Instructor ya existe: ${email}`);
    }
    return;
  }

  const user = new User({
    name: 'Instructor Demo',
    email,
    password,
    rol: 'instructor'
  });
  await user.save();
  console.log(`✅ Cuenta de instructor creada: ${email} / ${password}`);
};

const startServer = async () => {
  await connectDB();
  await seedInstructor();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor FilmScript corriendo en http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    
    if (authRoutes) {
      console.log(`🔐 Rutas de auth disponibles:`);
      console.log(`   POST /api/auth/register`);
      console.log(`   POST /api/auth/login`);
    }
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  console.log('❌ Error no manejado:', err.message);
  process.exit(1);
});
