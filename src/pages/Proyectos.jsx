import { useState, useEffect } from "react";

const SL = { active: "En curso", draft: "Borrador", done: "Finalizado" };
const SC = { active: "b-active", draft: "b-draft",  done: "b-done"    };
const FILTER_OPTS = ["Todos", "En curso", "Borrador", "Finalizado"];

export default function Proyectos({ onEdit }) {
  const [projects, setProjects] = useState([]);
  const [filter,   setFilter]   = useState("Todos");
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null); // id del proyecto a eliminar
  const [menuOpen, setMenuOpen] = useState(null); // id del proyecto con menú abierto

  useEffect(() => {
    
    setLoading(false);
  }, []);

  const list = filter === "Todos"
    ? projects
    : projects.filter(p => SL[p.status] === filter);

  const handleDelete = async (id) => {
    
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirm(null);
  };

  return (
    <>
      <div className="page-h">Proyectos</div>
      <div className="page-sub">Todos tus guiones en un solo lugar.</div>

      <div className="fbar">
        {FILTER_OPTS.map(o => (
          <button key={o} className={`fbtn ${filter === o ? "on" : ""}`}
            onClick={() => setFilter(o)}>{o}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className="btn-gold sm" onClick={() => onEdit("Sin título", null)}>
            ＋ Nuevo proyecto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Cargando proyectos…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-title">
            {filter === "Todos" ? "Sin proyectos todavía" : `Sin proyectos en "${filter}"`}
          </div>
          <div className="empty-sub">Crea tu primer proyecto para empezar.</div>
          <button className="btn-gold sm" onClick={() => onEdit("Sin título", null)}>
            ＋ Nuevo proyecto
          </button>
        </div>
      ) : (
        <div className="proj-list">
          {list.map(p => (
            <div className="proj-row" key={p.id}
              onClick={() => onEdit(p.name, null)}>
              <div className="proj-ico">📁</div>
              <div className="proj-inf">
                <div className="proj-name">{p.name}</div>
                <div className="proj-meta">{p.meta}</div>
              </div>
              <div className="proj-right">
                <span className="proj-date">{p.updatedAt}</span>
                <span className={`badge ${SC[p.status] || "b-draft"}`}>
                  {SL[p.status] || "Borrador"}
                </span>
                {/* Menú de opciones */}
                <div className="proj-menu" style={{ position: "relative" }}
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}>
                  ⋮
                  {menuOpen === p.id && (
                    <div className="proj-dropdown">
                      <div className="proj-dd-item"
                        onClick={e => { e.stopPropagation(); onEdit(p.name, null); setMenuOpen(null); }}>
                        ✏ Editar
                      </div>
                      <div className="proj-dd-item proj-dd-del"
                        onClick={e => { e.stopPropagation(); setConfirm(p.id); setMenuOpen(null); }}>
                        🗑 Eliminar
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirm && (
        <div className="sc-modal-overlay"
          onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className="sc-modal" style={{ maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <div className="sc-modal-title">¿Eliminar proyecto?</div>
            <div style={{ fontSize: "13px", color: "var(--muted2)", marginBottom: 22 }}>
              Esta acción eliminará el proyecto y todas sus escenas. No se puede deshacer.
            </div>
            <div className="sc-modal-acts" style={{ justifyContent: "center" }}>
              <button className="btn-red" onClick={() => handleDelete(confirm)}>Sí, eliminar</button>
              <button className="btn-outline" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}