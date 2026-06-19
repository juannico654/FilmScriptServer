import { useState, useEffect } from "react";
import API_BASE from "../utils/api";

const DEFAULT_PRICES = { mes: 40000, anio: 400000 };

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

export default function Precios({ onComprar, comprando, modoCompra }) {
  const [prices, setPrices] = useState(DEFAULT_PRICES);

  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plans`);
        if (res.ok) {
          const data = await res.json();
          setPrices({ mes: data.mes, anio: data.anio });
        }
      } catch {
        // si falla, se quedan los precios por defecto
      }
    };
    cargarPrecios();
  }, []);

  const planes = [
    {
      key: "mes",
      label: "Plan Mes",
      periodo: "30 días",
      desc: "El plan más popular. Acceso ilimitado durante un mes completo para desarrollar tus proyectos.",
      icon: "★",
      color: "#e8c547",
      badge: "MÁS POPULAR",
      features: [
        "Editor de guion completo",
        "Proyectos ilimitados",
        "Colaboradores",
        "Carga masiva",
        "Soporte prioritario",
      ],
    },
    {
      key: "anio",
      label: "Plan Anual",
      periodo: "365 días",
      desc: "La mejor inversión. Un año completo con todas las funciones y el mayor ahorro.",
      icon: "♛",
      color: "#52c97a",
      features: [
        "Todo lo del Plan Mes",
        "Panel de instructor",
        "Comentarios avanzados",
        "Soporte premium 24/7",
      ],
    },
  ];

  return (
    <div className="price-wrap">
      <div className="price-head">
        <div className="price-kicker">PLANES Y PRECIOS</div>
        <h1>ELIGE TU PLAN</h1>
        <p>
          Accede a todas las herramientas profesionales para escribir y
          gestionar tus guiones cinematográficos.
        </p>
      </div>

      <div className="price-grid">
        {planes.map((p) => (
          <div
            key={p.key}
            className={`price-card${p.badge ? " featured" : ""}`}
            style={{ "--plan-color": p.color }}
          >
            {p.badge && <div className="price-badge">{p.badge}</div>}

            <div className="price-top">
              <div className="price-icon">{p.icon}</div>
              <div className="price-name">{p.label}</div>
              <div className="price-desc">{p.desc}</div>
            </div>

            <div className="price-box">
              <div className="price-value">{fmt(prices[p.key])}</div>
              <div className="price-period">por {p.periodo}</div>
            </div>

            <div className="price-features">
              {p.features.map((f, i) => (
                <div key={i} className="price-feature">
                  <div className="price-check">✓</div>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button
              className="price-button"
              type="button"
              onClick={() => onComprar?.(p.key)}
            >
              {comprando === p.key
                ? "Procesando…"
                : modoCompra
                  ? `Comprar ${p.label}`
                  : `Adquirir ${p.label}`}
            </button>
          </div>
        ))}
      </div>

      <div className="price-note">
        <span>
          💬 ¿Tienes preguntas sobre los planes?{" "}
          <span>Contáctanos en soporte@filmscript.com</span>
        </span>
      </div>
    </div>
  );
}
