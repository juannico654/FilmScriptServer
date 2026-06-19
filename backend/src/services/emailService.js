const nodemailer = require("nodemailer");

let cachedTransporter = null;

const normalizeBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
};

const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.FROM_EMAIL,
  );

const getMissingEmailEnvVars = () => {
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "FROM_EMAIL",
  ];

  return requiredVars.filter((name) => !process.env[name]);
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: normalizeBoolean(
        process.env.SMTP_SECURE,
        Number(process.env.SMTP_PORT) === 465,
      ),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return cachedTransporter;
};

const buildBaseMailOptions = () => ({
  from: `"${process.env.FROM_NAME || "FilmScript"}" <${process.env.FROM_EMAIL}>`,
  replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL,
  headers: {
    "X-Auto-Response-Suppress": "All",
    "Auto-Submitted": "auto-generated",
  },
});

const mapDeliveryInfo = (info = {}) => ({
  messageId: info.messageId || null,
  accepted: Array.isArray(info.accepted) ? info.accepted : [],
  rejected: Array.isArray(info.rejected) ? info.rejected : [],
  response: info.response || "",
});

const verifyEmailTransport = async () => {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      configured: false,
      missingEnvVars: getMissingEmailEnvVars(),
    };
  }

  await transporter.verify();
  return {
    ok: true,
    configured: true,
    missingEnvVars: [],
  };
};

const sendCollaboratorInviteEmail = async ({
  ownerName,
  ownerEmail,
  collaboratorEmail,
  appUrl,
}) => {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      delivered: false,
      reason: "email-not-configured",
      missingEnvVars: getMissingEmailEnvVars(),
    };
  }

  const loginUrl = appUrl || process.env.APP_URL || "http://localhost:5173";
  const senderName = ownerName || ownerEmail || "Un usuario";

  const info = await transporter.sendMail({
    ...buildBaseMailOptions(),
    to: collaboratorEmail,
    subject: `${senderName} te compartio proyectos en FilmScript`,
    text: [
      `Hola,`,
      "",
      `${senderName} compartio contigo sus proyectos en FilmScript.`,
      "Ingresa o registrate con este mismo correo para verlos dentro de la plataforma.",
      "",
      `Accede aqui: ${loginUrl}`,
      "",
      `Invitacion enviada por: ${ownerEmail || "FilmScript"}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Te compartieron proyectos en FilmScript</h2>
        <p><strong>${senderName}</strong> compartio contigo sus proyectos en FilmScript.</p>
        <p>Ingresa o registrate con este mismo correo para poder verlos dentro de la plataforma.</p>
        <p>
          <a href="${loginUrl}" style="display: inline-block; padding: 10px 16px; background: #c9a84c; color: #111827; text-decoration: none; border-radius: 6px; font-weight: 700;">
            Abrir FilmScript
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">Invitacion enviada por: ${ownerEmail || "FilmScript"}</p>
      </div>
    `,
  });

  return {
    delivered: true,
    ...mapDeliveryInfo(info),
  };
};

const sendInviteSetupTestEmail = async ({ to, requestedByEmail }) => {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      delivered: false,
      reason: "email-not-configured",
      missingEnvVars: getMissingEmailEnvVars(),
    };
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const info = await transporter.sendMail({
    ...buildBaseMailOptions(),
    to,
    subject: "Prueba de correo de FilmScript",
    text: [
      "Este es un correo de prueba para validar la configuracion SMTP de FilmScript.",
      "",
      `Solicitado por: ${requestedByEmail || "usuario autenticado"}`,
      `URL de la aplicacion: ${appUrl}`,
      "",
      "Si recibiste este mensaje, el envio SMTP funciona correctamente.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Prueba de correo de FilmScript</h2>
        <p>Este es un correo de prueba para validar la configuracion SMTP.</p>
        <p><strong>Solicitado por:</strong> ${requestedByEmail || "usuario autenticado"}</p>
        <p><strong>URL de la aplicacion:</strong> ${appUrl}</p>
        <p>Si recibiste este mensaje, el envio SMTP funciona correctamente.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    ...mapDeliveryInfo(info),
  };
};

module.exports = {
  isEmailConfigured,
  getMissingEmailEnvVars,
  verifyEmailTransport,
  sendCollaboratorInviteEmail,
  sendInviteSetupTestEmail,
};
