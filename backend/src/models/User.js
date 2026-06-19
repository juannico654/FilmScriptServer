// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"],
    trim: true,
    minlength: [2, "El nombre debe tener al menos 2 caracteres"],
  },
  email: {
    type: String,
    required: [true, "El correo es obligatorio"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Por favor ingresa un correo válido"],
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"],
    minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
  },
  rol: {
    type: String,
    enum: ["admin", "instructor", "aprendiz", "usuario"],
    default: "usuario",
  },
  perfilSena: {
    tipoDocumento: {
      type: String,
      trim: true,
      default: "",
    },
    numeroDocumento: {
      type: String,
      trim: true,
      default: "",
    },
    primerApellido: {
      type: String,
      trim: true,
      default: "",
    },
    segundoApellido: {
      type: String,
      trim: true,
      default: "",
    },
    primerNombre: {
      type: String,
      trim: true,
      default: "",
    },
    otrosNombres: {
      type: String,
      trim: true,
      default: "",
    },
    correoElectronico: {
      type: String,
      trim: true,
      default: "",
    },
    telefono: {
      type: String,
      trim: true,
      default: "",
    },
    ficha: {
      type: String,
      trim: true,
      default: "",
    },
    programaFormacion: {
      type: String,
      trim: true,
      default: "",
    },
  },
  licencia: {
    estado: {
      type: String,
      enum: ["activa", "inactiva", "vencida"],
      default: "inactiva",
    },
    fechaExpiracion: Date,
    tipo: {
      type: String,
      enum: ["vitalicia", "mensual", "anual"],
      default: "mensual",
    },
    plan: {
      type: String,
      enum: ["mes", "anio", null],
      default: null,
    },
    asignadoPor: mongoose.Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para devolver datos seguros (sin contraseña)
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    rol: this.rol,
    perfilSena: this.perfilSena,
    licencia: this.licencia,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

module.exports = User;
