const Project = require("../models/Project");
const {
  isEmailConfigured,
  getMissingEmailEnvVars,
  verifyEmailTransport,
  sendCollaboratorInviteEmail,
  sendInviteSetupTestEmail,
} = require("../services/emailService");

const formatProjectMeta = (project) => {
  const blocks = project?.script?.blocks || [];
  const sceneCount = blocks.filter((block) => block.type === "scene").length;
  const blockCount = blocks.length;
  return `${sceneCount} escena${sceneCount === 1 ? "" : "s"} · ${blockCount} bloque${blockCount === 1 ? "" : "s"}`;
};

const formatProjectDate = (value) =>
  new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const normalizeEmail = (value = "") => value.toString().trim().toLowerCase();

const uniqueEmails = (emails = []) => [
  ...new Set(emails.map(normalizeEmail).filter(Boolean)),
];

const canEditProject = (project, user) => {
  const email = normalizeEmail(user?.email);
  const ownerMatches = project.ownerId?.toString() === user?._id?.toString();
  const collaboratorMatches = project.collaboratorEmails.includes(email);
  return ownerMatches || collaboratorMatches;
};

const serializeProject = (project, user) => ({
  id: project._id.toString(),
  name: project.name,
  meta: formatProjectMeta(project),
  updatedAt: formatProjectDate(project.updatedAt),
  status: project.status || "draft",
  template: project.template || null,
  ownerId: project.ownerId?.toString() || null,
  ownerEmail: project.ownerEmail || "",
  ownerName: project.ownerName || "",
  collaboratorEmails: project.collaboratorEmails || [],
  ficha: project.ficha || "",
  instructorId: project.instructorId?.toString() || null,
  canEdit: canEditProject(project, user),
  script: {
    blocks: project.script?.blocks || [],
    credits: project.script?.credits || {},
    inlineComments: project.script?.inlineComments || [],
    aiInsights: project.script?.aiInsights || {
      summary: { logline: "", shortSynopsis: "", sceneSummary: [] },
      feedback: { overall: "", strengths: [], improvements: [], nextSteps: [] },
      generatedAt: "",
      model: "",
    },
  },
});

const getVisibilityQuery = (user) => {
  const email = normalizeEmail(user?.email);

  if (user?.rol === "admin") {
    return {};
  }

  if (user?.rol === "instructor") {
    return {
      $or: [
        { ownerId: user._id },
        { collaboratorEmails: email },
        { instructorId: user._id },
      ],
    };
  }

  return {
    $or: [{ ownerId: user._id }, { collaboratorEmails: email }],
  };
};

const buildProjectPayload = (body, user, existingProject = null) => {
  const collaboratorEmails = uniqueEmails(
    body.collaboratorEmails || existingProject?.collaboratorEmails || [],
  );
  const ownerEmail = normalizeEmail(existingProject?.ownerEmail || user.email);
  const ownerName = (
    existingProject?.ownerName ||
    user.name ||
    user.nombre ||
    ""
  ).trim();
  const ficha =
    existingProject?.ficha || user?.perfilSena?.ficha || body?.ficha || "";
  const instructorId =
    existingProject?.instructorId ||
    (user?.rol === "instructor"
      ? user._id
      : user?.licencia?.asignadoPor || null);

  return {
    name: String(body.name || "").trim() || "Sin título",
    status: body.status || existingProject?.status || "draft",
    template: body.template || existingProject?.template || null,
    ownerId: existingProject?.ownerId || user._id,
    ownerEmail,
    ownerName,
    collaboratorEmails,
    ficha: String(ficha || "").trim(),
    instructorId,
    script: {
      blocks:
        body?.script?.blocks ||
        body.blocks ||
        existingProject?.script?.blocks ||
        [],
      credits:
        body?.script?.credits ||
        body.credits ||
        existingProject?.script?.credits ||
        {},
      inlineComments:
        body?.script?.inlineComments ||
        body.inlineComments ||
        existingProject?.script?.inlineComments ||
        [],
      aiInsights:
        body?.script?.aiInsights ||
        body.aiInsights ||
        existingProject?.script?.aiInsights ||
        {
          summary: { logline: "", shortSynopsis: "", sceneSummary: [] },
          feedback: { overall: "", strengths: [], improvements: [], nextSteps: [] },
          generatedAt: "",
          model: "",
        },
    },
  };
};

const listProjects = async (req, res) => {
  try {
    const projects = await Project.find(getVisibilityQuery(req.user)).sort({
      updatedAt: -1,
    });
    res.json({
      total: projects.length,
      projects: projects.map((project) => serializeProject(project, req.user)),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener proyectos", error: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    const payload = buildProjectPayload(req.body, req.user);
    const project = new Project(payload);
    await project.save();

    res.status(201).json({
      message: "Proyecto guardado correctamente",
      project: serializeProject(project, req.user),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al crear proyecto", error: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (!canEditProject(project, req.user)) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este proyecto" });
    }

    Object.assign(project, buildProjectPayload(req.body, req.user, project));
    await project.save();

    res.json({
      message: "Proyecto actualizado correctamente",
      project: serializeProject(project, req.user),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al actualizar proyecto", error: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (project.ownerId?.toString() !== req.user._id?.toString()) {
      return res
        .status(403)
        .json({ message: "Solo el propietario puede eliminar este proyecto" });
    }

    await Project.findByIdAndDelete(project._id);
    res.json({
      message: "Proyecto eliminado correctamente",
      projectId: req.params.projectId,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al eliminar proyecto", error: error.message });
  }
};

const shareProjectsWithCollaborator = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res
        .status(400)
        .json({ message: "Correo de colaborador requerido" });
    }

    const currentUserEmail = normalizeEmail(req.user?.email);
    if (email === currentUserEmail) {
      return res.status(400).json({
        message:
          "No necesitas invitarte a ti mismo. Tu cuenta ya tiene acceso a tus propios proyectos.",
      });
    }

    const ownedProjectsCount = await Project.countDocuments({
      ownerId: req.user._id,
    });

    if (ownedProjectsCount === 0) {
      return res.status(400).json({
        message:
          "Primero debes crear al menos un proyecto para poder compartirlo con un colaborador.",
      });
    }

    await Project.updateMany(
      { ownerId: req.user._id },
      { $addToSet: { collaboratorEmails: email } },
    );

    let emailDelivery = {
      delivered: false,
      reason: "email-not-configured",
      missingEnvVars: getMissingEmailEnvVars(),
    };

    try {
      emailDelivery = await sendCollaboratorInviteEmail({
        ownerName: req.user?.name || req.user?.nombre || "",
        ownerEmail: req.user?.email || "",
        collaboratorEmail: email,
        appUrl: process.env.APP_URL,
      });
    } catch (emailError) {
      console.error("Invite email failed:", emailError.message);
      emailDelivery = {
        delivered: false,
        reason: "email-send-failed",
      };
    }

    const message = emailDelivery.delivered
      ? "Colaborador agregado a tus proyectos y correo de invitacion enviado correctamente."
      : isEmailConfigured()
        ? "Colaborador agregado a tus proyectos, pero el correo no pudo enviarse."
        : "Colaborador agregado a tus proyectos. El envio de correo esta deshabilitado hasta configurar SMTP.";

    res.json({
      message,
      email,
      emailDelivery,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al compartir proyectos", error: error.message });
  }
};

const sendInviteEmailTest = async (req, res) => {
  try {
    const currentUserEmail = normalizeEmail(req.user?.email || "");
    if (!currentUserEmail) {
      return res.status(400).json({
        message: "No se pudo detectar el correo del usuario autenticado.",
      });
    }

    if (!isEmailConfigured()) {
      return res.status(400).json({
        message:
          "SMTP no configurado. Completa las variables de entorno requeridas.",
        missingEnvVars: getMissingEmailEnvVars(),
      });
    }

    const verification = await verifyEmailTransport();
    if (!verification.ok) {
      return res.status(400).json({
        message: "No se pudo validar la conexion SMTP.",
        verification,
      });
    }

    const result = await sendInviteSetupTestEmail({
      to: currentUserEmail,
      requestedByEmail: currentUserEmail,
    });

    return res.json({
      message: "Correo de prueba enviado. Revisa entrada, spam y promociones.",
      result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al enviar el correo de prueba",
      error: error.message,
    });
  }
};

const unshareProjectsWithCollaborator = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res
        .status(400)
        .json({ message: "Correo de colaborador requerido" });
    }

    const currentUserEmail = normalizeEmail(req.user?.email);
    if (email === currentUserEmail) {
      return res.status(400).json({
        message: "Tu propia cuenta no puede quitarse de tus proyectos.",
      });
    }

    await Project.updateMany(
      { ownerId: req.user._id },
      { $pull: { collaboratorEmails: email } },
    );

    res.json({ message: "Colaborador retirado de tus proyectos", email });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al retirar colaborador", error: error.message });
  }
};

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  shareProjectsWithCollaborator,
  sendInviteEmailTest,
  unshareProjectsWithCollaborator,
};
