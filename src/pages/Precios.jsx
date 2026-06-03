import { useState, useEffect } from "react";

const DEFAULT_PRICES = { dia: 5000, mes: 40000, anio: 400000 };

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);

export default function Precios() {
  const [prices, setPrices] = useState(DEFAULT_PRICES);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fs_planes"));
      if (saved) setPrices(saved);
    } catch {}

    // Escucha cambios del admin en tiempo real (misma pestaña)
    const handler = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("fs_planes"));
        if (saved) setPrices(saved);
      } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const planes = [
    {
      key: "dia",
      label: "Plan Día",
      periodo: "24 horas",
      desc: "Acceso completo a la plataforma por un día. Ideal para probar todas las funcionalidades.",
      color: "#6eb5ff",
      features: ["Editor de guion completo", "Hasta 3 proyectos", "Exportar en PDF", "Soporte básico"],
    },
    {
      key: "mes",
      label: "Plan Mes",
      periodo: "30 días",
      desc: "El plan más popular. Acceso ilimitado durante un mes completo para desarrollar tus proyectos.",
      color: "#e8c547",
      badge: "MÁS POPULAR",
      features: ["Todo lo del Plan Día", "Proyectos ilimitados", "Colaboradores", "Carga masiva", "Soporte prioritario"],
    },
    {
      key: "anio",
      label: "Plan Anual",
      periodo: "365 días",
      desc: "La mejor inversión. Un año completo con todas las funciones y el mayor ahorro.",
      color: "#52c97a",
      features: ["Todo lo del Plan Mes", "Panel de instructor", "Historial de versiones", "Comentarios avanzados", "Soporte premium 24/7"],
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 700, marginBottom: 12 }}>
          PLANES Y PRECIOS
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: 3, color: "var(--text)", marginBottom: 14, lineHeight: 1 }}>
          ELIGE TU PLAN
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted2)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          Accede a todas las herramientas profesionales para escribir y gestionar tus guiones cinematográficos.
        </p>
      </div>

      {/* Tarjetas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {planes.map((p) => (
          <div key={p.key} style={{
            background: "var(--card)",
            border: p.badge ? `1px solid ${p.color}` : "1px solid var(--border)",
            borderRadius: 16,
            padding: "28px 24px",
            display: "flex", flexDirection: "column",
            position: "relative",
            boxShadow: p.badge ? `0 8px 32px ${p.color}20` : "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px ${p.color}25`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = p.badge ? `0 8px 32px ${p.color}20` : "none"; }}
          >
            {/* Badge */}
            {p.badge && (
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: p.color, color: "#000", fontSize: 10, fontWeight: 800,
                letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20,
              }}>
                {p.badge}
              </div>
            )}

            {/* Icono + nombre */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "var(--text)", marginBottom: 4 }}>
                {p.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted2)" }}>{p.desc}</div>
            </div>

            {/* Precio */}
            <div style={{ marginBottom: 24, padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: p.color, lineHeight: 1 }}>
                {fmt(prices[p.key])}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>por {p.periodo}</div>
            </div>

            {/* Features */}
            <div style={{ flex: 1, marginBottom: 24 }}>
              {p.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${p.color}20`, border: `1px solid ${p.color}60`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: p.color }}>✓</span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--muted2)" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Botón */}
            <button style={{
              width: "100%", padding: "12px",
              borderRadius: 10, border: `1px solid ${p.color}`,
              background: p.badge ? p.color : "transparent",
              color: p.badge ? "#000" : p.color,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = p.color; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={e => { e.currentTarget.style.background = p.badge ? p.color : "transparent"; e.currentTarget.style.color = p.badge ? "#000" : p.color; }}
            >
              Adquirir {p.label}
            </button>
          </div>
        ))}
      </div>

      {/* Nota inferior */}
      <div style={{ textAlign: "center", marginTop: 36, padding: "18px 24px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <span style={{ fontSize: 13, color: "var(--muted2)" }}>
          💬 ¿Tienes preguntas sobre los planes?{" "}
          <span style={{ color: "var(--accent)", cursor: "pointer" }}>Contáctanos en soporte@filmscript.com</span>
        </span>
      </div>
    </div>
  );
}