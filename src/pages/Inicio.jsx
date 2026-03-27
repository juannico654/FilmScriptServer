import { useState, useEffect } from "react";
import "../styles/Inicio.css";

const SL = { active: "En curso", draft: "Borrador", done: "Finalizado" };
const SC = { active: "b-active", draft: "b-draft",  done: "b-done"    };

const TEMPLATES = [
  { icon: "🎬", name: "Piloto de Serie"       },
  { icon: "🎥", name: "Corto / Cortometraje"  },
  { icon: "🎞️", name: "Película Largometraje" },
  { icon: "📢", name: "Publicidad"            },
];

export default function Inicio({ onEdit }) {
  const [projects,     setProjects]     = useState([]);
  const [collaborators,setCollaborators]= useState(0);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
   
    setLoading(false);
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <div className="dash-hero">
        <div className="hero-text">
          <h1>Crea sin <em>límites.</em></h1>
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
          <div className="empty-state">Cargando proyectos…</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <button className="btn-gold sm" onClick={() => onEdit("Sin título", null)}>
              ＋ Nuevo guión
            </button>
          </div>
        ) : (
          projects.slice(0, 3).map(p => (
            <div className="proj-row" key={p.id} onClick={() => onEdit(p.name, null)}>
              <div className="proj-ico">📁</div>
              <div className="proj-inf">
                <div className="proj-name">{p.name}</div>
                <div className="proj-meta">{p.meta}</div>
              </div>
              <div className="proj-right">
                <span className="proj-date">{p.updatedAt}</span>
                <span className={`badge ${SC[p.status]}`}>{SL[p.status]}</span>
                <div className="proj-menu">⋮</div>
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
        {TEMPLATES.map(t => (
          <div className="tpl-card" key={t.name} onClick={() => onEdit(t.name, t.name)}>
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