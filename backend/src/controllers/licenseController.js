// src/controllers/licenseController.js
const User = require("../models/User");
const Licencia = require("../models/Licencia");

const normalizeKey = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");

const matchesHeader = (value, candidates) =>
  candidates.some((candidate) => value.includes(candidate));

const findRawValue = (row, candidates) => {
  const keys = Object.keys(row || {});
  const found = keys.find((key) =>
    matchesHeader(normalizeKey(key), candidates),
  );
  return found ? String(row[found] || "").trim() : "";
};

const extractPerfilSena = (estudiante = {}) => {
  const raw =
    estudiante.raw && typeof estudiante.raw === "object"
      ? estudiante.raw
      : estudiante;

  return {
    tipoDocumento: findRawValue(raw, ["tipo de documento", "tipo documento"]),
    numeroDocumento: findRawValue(raw, [
      "numero de documento",
      "numero documento",
      "identificacion",
      "documento",
    ]),
    primerApellido: findRawValue(raw, ["primer apellido"]),
    segundoApellido: findRawValue(raw, ["segundo apellido"]),
    primerNombre: findRawValue(raw, ["primer nombre", "nombre"]),
    otrosNombres: findRawValue(raw, ["otros nombres", "segundo nombre"]),
    correoElectronico: findRawValue(raw, [
      "correo electronico",
      "correo electrónico",
      "correo",
      "email",
      "mail",
    ]),
    telefono: findRawValue(raw, [
      "telefono",
      "teléfono",
      "celular",
      "telefono celular",
    ]),
    ficha: findRawValue(raw, ["ficha"]),
    programaFormacion: findRawValue(raw, [
      "programa de formacion",
      "programa de formación",
      "programa",
    ]),
  };
};

const buildNombreDesdePerfil = (perfilSena = {}, fallback = "") => {
  const fullName = [
    perfilSena.primerNombre,
    perfilSena.otrosNombres,
    perfilSena.primerApellido,
    perfilSena.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || String(fallback || "").trim();
};

const buildCorreoDesdePerfil = (perfilSena = {}, fallback = "") =>
  String(perfilSena.correoElectronico || fallback || "")
    .trim()
    .toLowerCase();

const mergePerfilSena = (currentPerfil = {}, nextPerfil = {}) => {
  const merged = { ...currentPerfil };
  Object.entries(nextPerfil).forEach(([key, value]) => {
    if (value) merged[key] = value;
  });
  return merged;
};

// GET: Obtener lista de estudiantes del instructor
const obtenerEstudiantes = async (req, res) => {
  try {
    // Obtener todos los usuarios que son estudiantes
    const estudiantes = await User.find({ rol: "aprendiz" })
      .select("_id name email perfilSena licencia createdAt")
      .lean();

    // Enriquecer con información de licencias
    const estudiantesConLicencias = await Promise.all(
      estudiantes.map(async (est) => {
        const licencias = await Licencia.findOne({ usuarioId: est._id })
          .select("tipo estado fechaExpiracion instructorAsigno")
          .lean();
        return {
          ...est,
          licencia: licencias || null,
        };
      }),
    );

    res.json({
      message: "Estudiantes obtenidos correctamente",
      total: estudiantesConLicencias.length,
      estudiantes: estudiantesConLicencias,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener estudiantes", error: error.message });
  }
};

// POST: Asignar licencia a un estudiante
const asignarLicencia = async (req, res) => {
  try {
    const { estudianteId, tipo, duracionMeses } = req.body;
    const instructorId = req.user._id;

    // Validar datos
    if (!estudianteId || !tipo) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!["mensual", "vitalicia"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo de licencia inválido" });
    }

    // Verificar que el estudiante existe
    const estudiante = await User.findById(estudianteId);
    if (!estudiante) {
      return res.status(404).json({ message: "Estudiante no encontrado" });
    }

    if (estudiante.rol !== "aprendiz") {
      return res
        .status(400)
        .json({ message: "El usuario no es un estudiante" });
    }

    // Calcular fecha de expiración
    const fechaExpiracion = new Date();
    if (tipo === "mensual") {
      fechaExpiracion.setMonth(
        fechaExpiracion.getMonth() + (duracionMeses || 1),
      );
    } else if (tipo === "vitalicia") {
      fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 100); // 100 años
    }

    // Verificar si ya tiene licencia activa
    let licencia = await Licencia.findOne({ usuarioId: estudianteId });

    if (licencia) {
      // Actualizar licencia existente
      licencia.tipo = tipo;
      licencia.estado = "activa";
      licencia.fechaExpiracion = fechaExpiracion;
      licencia.instructorAsigno = instructorId;
      await licencia.save();
    } else {
      // Crear nueva licencia
      licencia = new Licencia({
        usuarioId: estudianteId,
        tipo,
        fechaExpiracion,
        estado: "activa",
        instructorAsigno: instructorId,
      });
      await licencia.save();
    }

    // Actualizar usuario con información de licencia
    estudiante.licencia = {
      estado: "activa",
      fechaExpiracion,
      tipo,
      asignadoPor: instructorId,
    };
    await estudiante.save();

    res.status(201).json({
      message: "Licencia asignada correctamente",
      licencia: {
        id: licencia._id,
        estudiante: {
          id: estudiante._id,
          name: estudiante.name,
          email: estudiante.email,
        },
        tipo,
        estado: "activa",
        fechaExpiracion,
        asignadaPor: req.user.name,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al asignar licencia", error: error.message });
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
      return res.status(404).json({ message: "Licencia no encontrada" });
    }

    // Calcular nueva fecha de expiración
    const nuevaExpiracion = new Date();
    if (licencia.tipo === "mensual") {
      nuevaExpiracion.setMonth(
        nuevaExpiracion.getMonth() + (duracionMeses || 1),
      );
    } else {
      nuevaExpiracion.setFullYear(nuevaExpiracion.getFullYear() + 100);
    }

    licencia.fechaExpiracion = nuevaExpiracion;
    licencia.estado = "activa";
    licencia.instructorAsigno = instructorId;
    await licencia.save();

    // Actualizar usuario
    await User.findByIdAndUpdate(licencia.usuarioId, {
      "licencia.estado": "activa",
      "licencia.fechaExpiracion": nuevaExpiracion,
      "licencia.asignadoPor": instructorId,
    });

    res.json({
      message: "Licencia renovada correctamente",
      licencia: {
        id: licencia._id,
        tipo: licencia.tipo,
        estado: "activa",
        fechaExpiracion: nuevaExpiracion,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al renovar licencia", error: error.message });
  }
};

// DELETE: Revocar licencia de un estudiante
const revocarLicencia = async (req, res) => {
  try {
    const { licenciaId } = req.params;

    const licencia = await Licencia.findById(licenciaId);
    if (!licencia) {
      return res.status(404).json({ message: "Licencia no encontrada" });
    }

    const usuarioId = licencia.usuarioId;

    // Eliminar licencia
    await Licencia.findByIdAndDelete(licenciaId);

    // Actualizar usuario
    await User.findByIdAndUpdate(usuarioId, {
      "licencia.estado": "inactiva",
    });

    res.json({
      message: "Licencia revocada correctamente",
      licenciaId,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al revocar licencia", error: error.message });
  }
};

// POST: Cargue masivo de estudiantes y licencias
const cargaMasiva = async (req, res) => {
  try {
    const { estudiantes } = req.body;
    const instructorId = req.user._id;

    // Validar datos
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return res
        .status(400)
        .json({ message: "Se requiere un array de estudiantes" });
    }

    // Límite de 500 estudiantes por carga
    if (estudiantes.length > 500) {
      return res
        .status(400)
        .json({ message: "Máximo 500 estudiantes por carga" });
    }

    const resultados = {
      exitosos: [],
      errores: [],
      total: estudiantes.length,
    };

    // Procesar cada estudiante
    for (let i = 0; i < estudiantes.length; i++) {
      try {
        const perfilSena = extractPerfilSena(estudiantes[i]);
        const nombre = buildNombreDesdePerfil(
          perfilSena,
          estudiantes[i].nombre,
        );
        const correo = buildCorreoDesdePerfil(
          perfilSena,
          estudiantes[i].correo,
        );

        // Validar campos
        if (!nombre?.trim() || !correo?.trim()) {
          resultados.errores.push({
            fila: i + 1,
            correo: correo || "sin correo",
            error: "Faltan campos requeridos",
          });
          continue;
        }

        // Validar formato de correo
        if (!/\S+@\S+\.\S+/.test(correo)) {
          resultados.errores.push({
            fila: i + 1,
            correo,
            error: "Formato de correo inválido",
          });
          continue;
        }

        // Verificar si el usuario ya existe
        let usuario = await User.findOne({ email: correo.toLowerCase() });

        if (usuario) {
          // Si existe y ya es estudiante con licencia activa
          if (
            usuario.rol === "aprendiz" &&
            usuario.licencia?.estado === "activa"
          ) {
            resultados.errores.push({
              fila: i + 1,
              correo,
              error: "Usuario ya existe con licencia activa",
            });
            continue;
          }

          // Si existe pero es otro rol, no se puede cambiar
          if (usuario.rol !== "aprendiz") {
            resultados.errores.push({
              fila: i + 1,
              correo,
              error: `Usuario existe como ${usuario.rol}, no se puede cambiar rol`,
            });
            continue;
          }
        } else {
          // Crear nuevo usuario estudiante
          usuario = new User({
            name: nombre.trim(),
            email: correo.toLowerCase().trim(),
            password: Math.random().toString(36).slice(-12), // Contraseña temporal aleatoria
            rol: "aprendiz",
            perfilSena,
          });
          await usuario.save();
        }

        if (usuario.rol === "aprendiz") {
          usuario.name = nombre.trim();
          usuario.email = correo.toLowerCase().trim();
          usuario.perfilSena = mergePerfilSena(
            usuario.perfilSena?.toObject?.() || usuario.perfilSena || {},
            perfilSena,
          );
        }

        // Crear licencia mensual de 1 mes por defecto
        const fechaExpiracion = new Date();
        fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 1);

        let licencia = await Licencia.findOne({ usuarioId: usuario._id });

        if (licencia) {
          licencia.tipo = "mensual";
          licencia.estado = "activa";
          licencia.fechaExpiracion = fechaExpiracion;
          licencia.instructorAsigno = instructorId;
          await licencia.save();
        } else {
          licencia = new Licencia({
            usuarioId: usuario._id,
            tipo: "mensual",
            fechaExpiracion,
            estado: "activa",
            instructorAsigno: instructorId,
          });
          await licencia.save();
        }

        // Actualizar usuario con información de licencia
        usuario.licencia = {
          estado: "activa",
          fechaExpiracion,
          tipo: "mensual",
          asignadoPor: instructorId,
        };
        await usuario.save();

        resultados.exitosos.push({
          fila: i + 1,
          nombre: usuario.name,
          correo: usuario.email,
          perfilSena: usuario.perfilSena,
          licenciaExpira: fechaExpiracion,
        });
      } catch (error) {
        resultados.errores.push({
          fila: i + 1,
          correo: estudiantes[i].correo,
          error: error.message,
        });
      }
    }

    // Resumen final
    res.status(201).json({
      message: `Cargue completado: ${resultados.exitosos.length} exitosos, ${resultados.errores.length} errores`,
      resumen: {
        total: resultados.total,
        exitosos: resultados.exitosos.length,
        errores: resultados.errores.length,
        porcentajeExito: Math.round(
          (resultados.exitosos.length / resultados.total) * 100,
        ),
      },
      detalles: resultados,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error en cargue masivo", error: error.message });
  }
};

module.exports = {
  obtenerEstudiantes,
  asignarLicencia,
  renovarLicencia,
  revocarLicencia,
  cargaMasiva,
};
