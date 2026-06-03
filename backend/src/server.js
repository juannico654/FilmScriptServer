// src/server.js
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const User = require('./models/User');

// Importar rutas
let authRoutes, licenseRoutes, adminRoutes;
try { authRoutes    = require('./routes/authRoutes');    } catch { console.log("⚠️  authRoutes.js no encontrado.");    }
try { licenseRoutes = require('./routes/licenseRoutes'); } catch { console.log("⚠️  licenseRoutes.js no encontrado."); }
try { adminRoutes   = require('./routes/adminRoutes');   } catch (e) { console.log("⚠️  adminRoutes.js no encontrado.", e.message); }

// Registrar rutas
if (authRoutes)    app.use('/api/auth',    authRoutes);
if (licenseRoutes) app.use('/api/licenses', licenseRoutes);
if (adminRoutes)   app.use('/api/admin',   adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend de FilmScript funcionando correctamente 🎥',
    database: 'FilmScript',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => res.send('¡Bienvenido al Backend de FilmScript! 🎬'));

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

// Seed instructor
const seedInstructor = async () => {
  if (process.env.NODE_ENV === 'production') return;
  const email    = process.env.SEED_INSTRUCTOR_EMAIL    || 'instructor@filmscript.test';
  const password = process.env.SEED_INSTRUCTOR_PASSWORD || 'Instr1234!';
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.rol !== 'instructor') { existing.rol = 'instructor'; await existing.save(); console.log(`🔧 Usuario actualizado a instructor: ${email}`); }
    else console.log(`✅ Instructor ya existe: ${email}`);
    return;
  }
  const user = new User({ name: 'Instructor Demo', email, password, rol: 'instructor' });
  await user.save();
  console.log(`✅ Instructor creado: ${email} / ${password}`);
};

// Seed administrador
const seedAdmin = async () => {
  if (process.env.NODE_ENV === 'production') return;
  const email    = process.env.ADMIN_EMAIL    || 'admin@filmscript.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin2024!';
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.rol !== 'admin') { existing.rol = 'admin'; await existing.save(); console.log(`🔧 Usuario actualizado a admin: ${email}`); }
    else console.log(`✅ Admin ya existe: ${email}`);
    return;
  }
  const user = new User({ name: 'Administrador', email, password, rol: 'admin' });
  await user.save();
  console.log(`✅ Admin creado: ${email} / ${password}`);
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedInstructor();
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor FilmScript corriendo en http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    if (authRoutes)  { console.log(`🔐 Auth: POST /api/auth/register | POST /api/auth/login`); }
    if (adminRoutes) { console.log(`👑 Admin: GET /api/admin/users | DELETE /api/admin/users/:id`); }
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  console.log('❌ Error no manejado:', err.message);
  process.exit(1);
});