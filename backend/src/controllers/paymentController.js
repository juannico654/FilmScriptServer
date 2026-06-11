// src/controllers/paymentController.js
const User = require('../models/User');
const Licencia = require('../models/Licencia');
const Plan = require('../models/Plan');

// GET /api/payments/estado — estado actual de la licencia del usuario autenticado
const estadoLicencia = async (req, res) => {
  try {
    const { rol, licencia } = req.user;

    // admin, instructor y aprendiz nunca necesitan licencia
    if (rol !== 'usuario') {
      return res.json({ requiereLicencia: false, activa: true, licencia: licencia || null });
    }

    const activa = !!(
      licencia &&
      licencia.estado === 'activa' &&
      licencia.fechaExpiracion &&
      new Date(licencia.fechaExpiracion) > new Date()
    );

    res.json({ requiereLicencia: true, activa, licencia: licencia || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al consultar el estado de la licencia' });
  }
};

// POST /api/payments/comprar  { plan: 'mes' | 'anio' }
// Simula el pago y activa/renueva la licencia del usuario autenticado.
const comprarPlan = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['mes', 'anio'].includes(plan)) {
      return res.status(400).json({ message: 'Plan inválido. Debe ser "mes" o "anio"' });
    }

    const planes = await Plan.getSingleton();
    const precio = plan === 'mes' ? planes.mes : planes.anio;
    const tipo   = plan === 'mes' ? 'mensual' : 'anual';

    const usuario = await User.findById(req.user._id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Calcular fecha de expiración a partir de hoy (o de la fecha de
    // expiración actual si la licencia todavía estaba vigente).
    const base = (usuario.licencia?.estado === 'activa' && usuario.licencia?.fechaExpiracion > new Date())
      ? new Date(usuario.licencia.fechaExpiracion)
      : new Date();

    const fechaExpiracion = new Date(base);
    if (plan === 'mes')  fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 1);
    if (plan === 'anio') fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1);

    // Registrar / actualizar la licencia
    let licencia = await Licencia.findOne({ usuarioId: usuario._id });
    if (licencia) {
      licencia.tipo = tipo;
      licencia.plan = plan;
      licencia.estado = 'activa';
      licencia.fechaExpiracion = fechaExpiracion;
      licencia.precio = precio;
      await licencia.save();
    } else {
      licencia = new Licencia({
        usuarioId: usuario._id,
        tipo,
        plan,
        fechaExpiracion,
        estado: 'activa',
        precio
      });
      await licencia.save();
    }

    // Actualizar el usuario
    usuario.licencia = {
      estado: 'activa',
      fechaExpiracion,
      tipo,
      plan,
      asignadoPor: usuario._id
    };
    await usuario.save();

    res.status(201).json({
      message: 'Pago procesado correctamente. Tu licencia ha sido activada.',
      user: usuario.toSafeObject()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al procesar el pago', error: error.message });
  }
};

module.exports = { estadoLicencia, comprarPlan };