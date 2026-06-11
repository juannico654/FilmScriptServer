// src/models/Plan.js
const mongoose = require('mongoose');

// Documento único (singleton) que guarda los precios vigentes de los planes.
// Ya no existe el "Plan Día": solo Plan Mes y Plan Anual.
const planSchema = new mongoose.Schema({
  mes: {
    type: Number,
    required: true,
    default: 40000,
    min: [1, 'El precio debe ser mayor a 0']
  },
  anio: {
    type: Number,
    required: true,
    default: 400000,
    min: [1, 'El precio debe ser mayor a 0']
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Devuelve (creando si no existe) el documento único de precios.
planSchema.statics.getSingleton = async function () {
  let plan = await this.findOne();
  if (!plan) {
    plan = await this.create({});
  }
  return plan;
};

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;