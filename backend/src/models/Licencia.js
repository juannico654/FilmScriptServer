// src/models/Licencia.js
const mongoose = require('mongoose');

const licenciaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio']
  },
  tipo: {
    type: String,
    enum: ['mensual', 'vitalicia'],
    required: true
  },
  fechaCompra: {
    type: Date,
    default: Date.now
  },
  fechaExpiracion: {
    type: Date,
    required: true
  },
  estado: {
    type: String,
    enum: ['activa', 'inactiva', 'vencida'],
    default: 'activa'
  },
  instructorAsigno: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  precio: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para verificar vencimiento antes de guardar
licenciaSchema.pre('save', function (next) {
  if (this.fechaExpiracion < new Date()) {
    this.estado = 'vencida';
  }
  next();
});

const Licencia = mongoose.model('Licencia', licenciaSchema);

module.exports = Licencia;
