// Misma lógica que backend/src/controllers/paymentController.js (estadoLicencia)
export function requierePago(user) {
  if (!user) return false;

  // admin, instructor y aprendiz nunca necesitan licencia
  if (user.rol && user.rol !== "usuario") return false;

  const { licencia } = user;
  const activa = !!(
    licencia &&
    licencia.estado === "activa" &&
    licencia.fechaExpiracion &&
    new Date(licencia.fechaExpiracion) > new Date()
  );

  return !activa;
}
