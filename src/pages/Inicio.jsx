import { useState, useEffect } from "react";
import "../styles/Inicio.css";

const SL = { active: "En curso", draft: "Borrador", done: "Finalizado" };
const SC = { active: "b-active", draft: "b-draft", done: "b-done" };

const TEMPLATES = [
  { icon: "🎬", name: "Piloto de Serie" },
  { icon: "🎥", name: "Corto / Cortometraje" },
  { icon: "🎞️", name: "Película Largometraje" },
  { icon: "📢", name: "Publicidad" },
];

export default function Inicio({ onEdit, projects = [] }) {
  const [collaborators, setCollaborators] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <div className="dash-hero">
        <div className="hero-text">
          <h1>
            Crea sin <em>límites.</em>
          </h1>
          <p>Organiza tus proyectos y escribe tus guiones como nunca antes.</p>
        </div>
        <button className="btn-gold" onClick={() => onEdit("Sin título", null)}>
          <span>＋</span> Crear nuevo guión
        </button>
      </div>

      {/* ── Proyectos recientes ── */}
      <div className="sec-head">
        <span className="sec-title">Proyectos recientes</span>
        <button className="sec-link">Ver todos ↗</button>
      </div>

      <div className="proj-list">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Cargando proyectos</div>
            <div className="empty-sub">Preparando tus datos…</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state empty-template">
            <div className="empty-icon">📽️</div>
            <div className="empty-title">Bienvenido</div>
            <div className="empty-sub">
              Comienza creando tu primer guión cinematográfico.
            </div>
            <div className="empty-preview-label">Vista previa</div>
            <div className="sample-card sample-card-project">
              <div className="sample-card-tag">Ejemplo</div>
              <div className="sample-card-title">Mi primer guión</div>
              <div className="sample-card-meta">
                Drama · 3 escenas · Borrador
              </div>
            </div>
            <button
              className="btn-gold sm"
              onClick={() => onEdit("Sin título", null)}
              style={{ marginTop: 16 }}
            >
              ＋ Iniciar nuevo guión
            </button>
          </div>
        ) : (
          projects.slice(0, 3).map((p) => (
            <div
              className="proj-row"
              key={p.id}
              onClick={() => onEdit(p.name, null, p)}
            >
              <div className="proj-ico"></div>
              <div className="proj-inf">
                <div className="proj-name">{p.name}</div>
                <div className="proj-meta">{p.meta}</div>
              </div>
              <div className="proj-right">
                <span className="proj-date">{p.updatedAt}</span>
                <span className={`badge ${SC[p.status]}`}>{SL[p.status]}</span>
                <div
                  className="proj-menu"
                  style={{ position: "relative" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === p.id ? null : p.id);
                  }}
                >
                  ⋮
                  {menuOpen === p.id && (
                    <div className="proj-dropdown">
                      <div
                        className="proj-dd-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(p.name, null, p);
                          setMenuOpen(null);
                        }}
                      >
                        ✏ Editar
                      </div>
                      <div
                        className="proj-dd-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(p.name, null, p);
                          setMenuOpen(null);
                        }}
                      >
                        ✏ Editar
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Plantillas rápidas ── */}
      <div className="sec-head" style={{ marginTop: 26 }}>
        <span className="sec-title">Plantillas rápidas</span>
      </div>
      <div className="tpl-grid">
        {TEMPLATES.map((t) => (
          <div
            className="tpl-card"
            key={t.name}
            onClick={() => onEdit(t.name, t.name)}
          >
            <div className="tpl-ico">{t.icon}</div>
            <div className="tpl-name">{t.name}</div>
          </div>
        ))}
      </div>

      {/* ── Footer info ── */}
      <div className="df">
        <span>📁 {projects.length} proyectos</span>
        <span>👥 {collaborators} colaboradores</span>
      </div>
    </>
  );
}
