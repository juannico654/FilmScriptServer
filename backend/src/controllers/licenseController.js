// src/controllers/licenseController.js
const User = require('../models/User');
const Licencia = require('../models/Licencia');

// GET: Obtener lista de estudiantes del instructor
const obtenerEstudiantes = async (req, res) => {
  try {
    const instructorId = req.user._id;
    
    // Obtener todos los usuarios que son estudiantes
    const estudiantes = await User.find({ rol: 'estudiante' })
      .select('_id name email licencia createdAt')
      .lean();

    // Enriquecer con información de licencias
    const estudiantesConLicencias = await Promise.all(
      estudiantes.map(async (est) => {
        const licencias = await Licencia.findOne({ usuarioId: est._id })
          .select('tipo estado fechaExpiracion instructorAsigno')
          .lean();
        return {
          ...est,
          licencia: licencias || null
        };
      })
    );

    res.json({
      message: 'Estudiantes obtenidos correctamente',
      total: estudiantesConLicencias.length,
      estudiantes: estudiantesConLicencias
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estudiantes', error: error.message });
  }
};

// POST: Asignar licencia a un estudiante
const asignarLicencia = async (req, res) => {
  try {
    const { estudianteId, tipo, duracionMeses } = req.body;
    const instructorId = req.user._id;

    // Validar datos
    if (!estudianteId || !tipo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (!['mensual', 'vitalicia'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de licencia inválido' });
    }

    // Verificar que el estudiante existe
    const estudiante = await User.findById(estudianteId);
    if (!estudiante) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    if (estudiante.rol !== 'estudiante') {
      return res.status(400).json({ message: 'El usuario no es un estudiante' });
    }

    // Calcular fecha de expiración
    const fechaExpiracion = new Date();
    if (tipo === 'mensual') {
      fechaExpiracion.setMonth(fechaExpiracion.getMonth() + (duracionMeses || 1));
    } else if (tipo === 'vitalicia') {
      fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 100); // 100 años
    }

    // Verificar si ya tiene licencia activa
    let licencia = await Licencia.findOne({ usuarioId: estudianteId });
    
    if (licencia) {
      // Actualizar licencia existente
      licencia.tipo = tipo;
      licencia.estado = 'activa';
      licencia.fechaExpiracion = fechaExpiracion;
      licencia.instructorAsigno = instructorId;
      await licencia.save();
    } else {
      // Crear nueva licencia
      licencia = new Licencia({
        usuarioId: estudianteId,
        tipo,
        fechaExpiracion,
        estado: 'activa',
        instructorAsigno: instructorId
      });
      await licencia.save();
    }

    // Actualizar usuario con información de licencia
    estudiante.licencia = {
      estado: 'activa',
      fechaExpiracion,
      tipo,
      asignadoPor: instructorId
    };
    await estudiante.save();

    res.status(201).json({
      message: 'Licencia asignada correctamente',
      licencia: {
        id: licencia._id,
        estudiante: {
          id: estudiante._id,
          name: estudiante.name,
          email: estudiante.email
        },
        tipo,
        estado: 'activa',
        fechaExpiracion,
        asignadaPor: req.user.name
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al asignar licencia', error: error.message });
  }
};

// PATCH: Renovar licencia de un estudiante
const renovarLicencia = async (req, res) => {
  try {
    const { licenciaId } = req.params;
    const { duracionMeses } = req.body;
    const instructorId = req.user._id;

    const licencia = await Licencia.findById(licenciaId);
    if (!licencia) {
      return res.status(404).json({ message: 'Licencia no encontrada' });
    }

    // Calcular nueva fecha de expiración
    const nuevaExpiracion = new Date();
    if (licencia.tipo === 'mensual') {
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + (duracionMeses || 1));
    } else {
      nuevaExpiracion.setFullYear(nuevaExpiracion.getFullYear() + 100);
    }

    licencia.fechaExpiracion = nuevaExpiracion;
    licencia.estado = 'activa';
    licencia.instructorAsigno = instructorId;
    await licencia.save();

    // Actualizar usuario
    await User.findByIdAndUpdate(licencia.usuarioId, {
      'licencia.estado': 'activa',
      'licencia.fechaExpiracion': nuevaExpiracion,
      'licencia.asignadoPor': instructorId
    });

    res.json({
      message: 'Licencia renovada correctamente',
      licencia: {
        id: licencia._id,
        tipo: licencia.tipo,
        estado: 'activa',
        fechaExpiracion: nuevaExpiracion
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al renovar licencia', error: error.message });
  }
};

// DELETE: Revocar licencia de un estudiante
const revocarLicencia = async (req, res) => {
  try {
    const { licenciaId } = req.params;

    const licencia = await Licencia.findById(licenciaId);
    if (!licencia) {
      return res.status(404).json({ message: 'Licencia no encontrada' });
    }

    const usuarioId = licencia.usuarioId;

    // Eliminar licencia
    await Licencia.findByIdAndDelete(licenciaId);

    // Actualizar usuario
    await User.findByIdAndUpdate(usuarioId, {
      'licencia.estado': 'inactiva'
    });

    res.json({
      message: 'Licencia revocada correctamente',
      licenciaId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al revocar licencia', error: error.message });
  }
};

module.exports = {
  obtenerEstudiantes,
  asignarLicencia,
  renovarLicencia,
  revocarLicencia
};
