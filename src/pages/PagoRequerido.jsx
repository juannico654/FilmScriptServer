import { useState } from "react";
import Precios from "./Precios";

export default function PagoRequerido({ usuario, onLicenciaActivada, onLogout }) {
  const [comprando, setComprando] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const comprar = async (planKey) => {
    setError(""); setOk("");
    setComprando(planKey);
    try {
      const res = await fetch(`${API}/api/payments/comprar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo procesar el pago");

      // Actualizar usuario en localStorage con la nueva licencia activa
      localStorage.setItem("usuario", JSON.stringify(data.user));
      setOk("✓ ¡Pago realizado! Activando tu cuenta…");
      setTimeout(() => onLicenciaActivada && onLicenciaActivada(data.user), 800);
    } catch (e) {
      setError(e.message || "Error al procesar el pago. Intenta nuevamente.");
    } finally {
      setComprando(null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "var(--ink, #0d0d14)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 20px", boxSizing: "border-box", overflowY: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--gold,#c9a84c)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>✦</div>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "var(--text,#e0e0e0)" }}>FILMSCRIPT</span>
      </div>

      <div style={{
        maxWidth: 520, textAlign: "center", margin: "18px 0 36px",
        padding: "16px 24px", borderRadius: 12,
        background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.25)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0", marginBottom: 6 }}>
          🔒 Tu cuenta no tiene una licencia activa
        </div>
        <div style={{ fontSize: 13, color: "var(--muted,#888)", lineHeight: 1.5 }}>
          Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}. Para usar FilmScript necesitas adquirir uno de
          los siguientes planes. Una vez completado el pago, tendrás acceso completo a la plataforma.
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, fontSize: 13, color: "#e05c5c", padding: "10px 16px", background: "rgba(224,92,92,0.1)", borderRadius: 8 }}>
          ⚠ {error}
        </div>
      )}
      {ok && (
        <div style={{ marginBottom: 18, fontSize: 13, color: "#5ce07a", padding: "10px 16px", background: "rgba(92,224,122,0.1)", borderRadius: 8 }}>
          {ok}
        </div>
      )}

      <Precios onComprar={comprar} comprando={comprando} modoCompra />

      <button onClick={onLogout} style={{
        marginTop: 36, background: "none", border: "none",
        color: "var(--muted,#888)", fontSize: 13, cursor: "pointer", textDecoration: "underline",
      }}>
        Cerrar sesión
      </button>
    </div>
  );
}
