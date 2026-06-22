// src/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("node:path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (origin = "") => origin.replace(/\/+$/, "");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isOriginAllowed = (requestOrigin = "") => {
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  if (!normalizedRequestOrigin) return true;
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes("*")) return true;

  return allowedOrigins.some((originRule) => {
    const rule = normalizeOrigin(originRule);
    if (!rule) return false;

    if (rule.includes("*")) {
      const pattern = `^${rule.split("*").map(escapeRegex).join(".*")}$`;
      return new RegExp(pattern, "i").test(normalizedRequestOrigin);
    }

    return rule.toLowerCase() === normalizedRequestOrigin.toLowerCase();
  });
};

// Middlewares
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origen no permitido por CORS"));
    },
  }),
);
app.use(express.json());

const User = require("./models/User");

// Importar rutas
let authRoutes,
  licenseRoutes,
  adminRoutes,
  planRoutes,
  paymentRoutes,
  importRoutes,
  projectRoutes,
  aiRoutes;
try {
  authRoutes = require("./routes/authRoutes");
} catch {
  console.log("⚠️  authRoutes.js no encontrado.");
}
try {
  licenseRoutes = require("./routes/licenseRoutes");
} catch {
  console.log("⚠️  licenseRoutes.js no encontrado.");
}
try {
  adminRoutes = require("./routes/adminRoutes");
} catch (e) {
  console.log("⚠️  adminRoutes.js no encontrado.", e.message);
}
try {
  planRoutes = require("./routes/planRoutes");
} catch (e) {
  console.log("⚠️  planRoutes.js no encontrado.", e.message);
}
try {
  paymentRoutes = require("./routes/paymentRoutes");
} catch (e) {
  console.log("⚠️  paymentRoutes.js no encontrado.", e.message);
}
try {
  importRoutes = require("./routes/importRoutes");
} catch (e) {
  console.log("⚠️  importRoutes.js no encontrado.", e.message);
}
try {
  projectRoutes = require("./routes/projectRoutes");
} catch (e) {
  console.log("⚠️  projectRoutes.js no encontrado.", e.message);
}
try {
  aiRoutes = require("./routes/aiRoutes");
} catch (e) {
  console.log("⚠️  aiRoutes.js no encontrado.", e.message);
}

// Registrar rutas
if (authRoutes) app.use("/api/auth", authRoutes);
if (licenseRoutes) app.use("/api/licenses", licenseRoutes);
if (adminRoutes) app.use("/api/admin", adminRoutes);
if (planRoutes) app.use("/api/plans", planRoutes);
if (paymentRoutes) app.use("/api/payments", paymentRoutes);
if (importRoutes) app.use("/api/imports", importRoutes);
if (projectRoutes) app.use("/api/projects", projectRoutes);
if (aiRoutes) app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend de FilmScript funcionando correctamente 🎥",
    database: "FilmScript",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) =>
  res.send("¡Bienvenido al Backend de FilmScript! 🎬"),
);

// Error handler global: asegura respuestas JSON (incluyendo errores de subida de archivos)
app.use((err, req, res, next) => {
  if (!err) return next();

  const isMulterError = err.name === "MulterError";

  if (isMulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "El archivo supera el limite de 25 MB permitido.",
        code: err.code,
      });
    }

    return res.status(400).json({
      message: err.message || "Error al procesar el archivo cargado.",
      code: err.code || "MULTER_ERROR",
    });
  }

  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({
      message: "Origen no permitido por CORS.",
    });
  }

  console.error("❌ Error de servidor:", err.message);
  return res.status(500).json({
    message: "Error interno del servidor",
  });
});

// Conexión a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB - Base de datos: FilmScript");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
};

// Seed instructor
const seedInstructor = async () => {
  if (process.env.NODE_ENV === "production") return;
  const email =
    process.env.SEED_INSTRUCTOR_EMAIL || "instructor@filmscript.test";
  const password = process.env.SEED_INSTRUCTOR_PASSWORD || "Instr1234!";
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.rol !== "instructor") {
      existing.rol = "instructor";
      await existing.save();
      console.log(`🔧 Usuario actualizado a instructor: ${email}`);
    } else console.log(`✅ Instructor ya existe: ${email}`);
    return;
  }
  const user = new User({
    name: "Instructor Demo",
    email,
    password,
    rol: "instructor",
  });
  await user.save();
  console.log(`✅ Instructor creado: ${email} / ${password}`);
};

// Seed administrador
const seedAdmin = async () => {
  if (process.env.NODE_ENV === "production") return;
  const email = process.env.ADMIN_EMAIL || "admin@filmscript.com";
  const password = process.env.ADMIN_PASSWORD || "Admin2024!";
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.rol !== "admin") {
      existing.rol = "admin";
      await existing.save();
      console.log(`🔧 Usuario actualizado a admin: ${email}`);
    } else console.log(`✅ Admin ya existe: ${email}`);
    return;
  }
  const user = new User({
    name: "Administrador",
    email,
    password,
    rol: "admin",
  });
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
    if (authRoutes) {
      console.log(`🔐 Auth: POST /api/auth/register | POST /api/auth/login`);
    }
    if (adminRoutes) {
      console.log(
        `👑 Admin: GET /api/admin/users | DELETE /api/admin/users/:id`,
      );
    }
    if (importRoutes) {
      console.log(`📄 Import: POST /api/imports/parse`);
    }
    if (projectRoutes) {
      console.log(`🗂 Projects: GET|POST /api/projects`);
    }
  });
};

startServer();

process.on("unhandledRejection", (err) => {
  console.log("❌ Error no manejado:", err.message);
  process.exit(1);
});
