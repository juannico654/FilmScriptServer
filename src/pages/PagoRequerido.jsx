import { useState } from "react";
import Precios from "./Precios";
import "../styles/PagoRequerido.css";
import API_BASE from "../utils/api";

export default function PagoRequerido({
  usuario,
  onLicenciaActivada,
  onLogout,
  onBackToLogin,
}) {
  const [comprando, setComprando] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const comprar = async (planKey) => {
    setError("");
    setOk("");
    setComprando(planKey);
    try {
      const res = await fetch(`${API_BASE}/api/payments/comprar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "No se pudo procesar el pago");

      // Actualizar usuario en localStorage con la nueva licencia activa
      localStorage.setItem("usuario", JSON.stringify(data.user));
      setOk("✓ ¡Pago realizado! Activando tu cuenta…");
      setTimeout(
        () => onLicenciaActivada && onLicenciaActivada(data.user),
        800,
      );
    } catch (e) {
      setError(e.message || "Error al procesar el pago. Intenta nuevamente.");
    } finally {
      setComprando(null);
    }
  };

  return (
    <div className="pay-page">
      <div className="pay-shell">
        <section className="pay-intro pay-card">
          <div className="pay-brand">
            <div className="pay-brand-icon">✦</div>
            <span>FILMSCRIPT</span>
          </div>

          <div className="pay-alert">
            <div className="pay-alert-title">
              🔒 Tu cuenta no tiene una licencia activa
            </div>
            <div className="pay-alert-text">
              Hola
              {usuario?.name || usuario?.nombre
                ? `, ${usuario.name || usuario.nombre}`
                : ""}
              . Necesitas un plan para entrar al editor y usar la plataforma
              completa.
            </div>
          </div>

          <div className="pay-summary">
            <div>
              <span>Estado</span>
              <strong>Sin licencia</strong>
            </div>
            <div>
              <span>Acceso</span>
              <strong>Limitado</strong>
            </div>
            <div>
              <span>Acción</span>
              <strong>Elegir plan</strong>
            </div>
          </div>

          <div className="pay-actions">
            <button
              type="button"
              className="pay-back"
              onClick={onBackToLogin || onLogout}
            >
              Volver al login
            </button>
            <button type="button" className="pay-logout" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>

          <div className="pay-note">
            Si ya pagaste y sigues viendo esta pantalla, cierra sesión e inicia
            de nuevo para refrescar tu acceso.
          </div>
        </section>

        <section className="pay-plans pay-card">
          <Precios onComprar={comprar} comprando={comprando} modoCompra />

          {error && <div className="pay-message error">⚠ {error}</div>}
          {ok && <div className="pay-message success">{ok}</div>}
        </section>
      </div>
    </div>
  );
}
