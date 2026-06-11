// src/controllers/planController.js
const Plan = require('../models/Plan');

// GET /api/plans  — público, cualquiera puede consultar los precios vigentes
const getPlans = async (req, res) => {
  try {
    const plan = await Plan.getSingleton();
    res.json({ mes: plan.mes, anio: plan.anio, updatedAt: plan.updatedAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los planes' });
  }
};

// PUT /api/admin/plans  — solo administrador
const updatePlans = async (req, res) => {
  try {
    const { mes, anio } = req.body;

    const mesNum  = Number(mes);
    const anioNum = Number(anio);

    if (!Number.isFinite(mesNum) || !Number.isFinite(anioNum) || mesNum <= 0 || anioNum <= 0) {
      return res.status(400).json({ message: 'Los precios deben ser números positivos' });
    }

    const plan = await Plan.getSingleton();
    plan.mes  = mesNum;
    plan.anio = anioNum;
    plan.updatedAt = new Date();
    await plan.save();

    res.json({ message: 'Precios actualizados correctamente', mes: plan.mes, anio: plan.anio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar los planes' });
  }
};

module.exports = { getPlans, updatePlans };