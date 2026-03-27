import { useState, useEffect } from "react";
import "../styles/Versiones.css";

export default function Versiones({ projectId }) {
  const [versions, setVersions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null); // { type: "restore"|"delete", id }
  const [flash,    setFlash]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    // TODO: GET /api/projects/:projectId/versions
    // const res  = await fetch(`/api/projects/${projectId}/versions`);
    // const data = await res.json();
    // setVersions(data);
    setLoading(false);
  }, [projectId]);

  const restore = async (id) => {
    // TODO: POST /api/versions/:id/restore
    // await fetch(`/api/versions/${id}/restore`, { method: "POST" });
    setVersions(prev => prev.map(v => ({ ...v, cur: v.id === id })));
    setConfirm(null);
  };

  const remove = async (id) => {
    // TODO: DELETE /api/versions/:id
    // await fetch(`/api/versions/${id}`, { method: "DELETE" });
    setVersions(prev => prev.filter(v => v.id !== id));
    setConfirm(null);
  };

  const saveNew = async () => {
    setSaving(true);
    // TODO: POST /api/projects/:projectId/versions
    // const res  = await fetch(`/api/projects/${projectId}/versions`, { method: "POST" });
    // const data = await res.json();
    // setVersions(prev => [data, ...prev]);
    const now = new Date();
    const label = `v${versions.length + 1}.0`;
    const newV = {
      id:     Date.now(),
      name:   `${label} — Versión guardada`,
      date:   now.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
      author: "Tú",
      cur:    false,
      ch:     "Versión guardada manualmente.",
    };
    setVersions(prev => [newV, ...prev]);
    setSaving(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  };

  return (
    <>
      <div className="page-h">Versiones</div>
      <div className="page-sub">Historial de cambios de tus guiones.</div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button className="btn-gold sm" onClick={saveNew} disabled={saving}>
          {flash ? "✓ Guardada" : saving ? "Guardando…" : "＋ Guardar versión"}
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Cargando versiones…</div>
      ) : versions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">Sin versiones guardadas</div>
          <div className="empty-sub">
            {projectId
              ? "Guarda la primera versión de este guión."
              : "Abre un proyecto para ver su historial de versiones."}
          </div>
          {projectId && (
            <button className="btn-gold sm" onClick={saveNew}>＋ Guardar versión</button>
          )}
        </div>
      ) : (
        <div className="vr-list">
          {versions.map((v, i) => (
            <div className="vr-item" key={v.id}>
              <div className="vr-line" />
              <div className={`vr-dot ${v.cur ? "cur" : ""}`}>{v.cur ? "★" : i + 1}</div>
              <div className="vr-body">
                <div className="vr-head">
                  <span className="vr-name">{v.name}</span>
                  <span className={`vr-tag ${v.cur ? "vr-cur" : "vr-old"}`}>
                    {v.cur ? "Actual" : "Anterior"}
                  </span>
                </div>
                <div className="vr-meta">{v.date} · {v.author}</div>
                <div className="vr-changes">{v.ch}</div>
                <div className="vr-acts">
                  {!v.cur && (
                    <button className="btn-outline"
                      onClick={() => setConfirm({ type: "restore", id: v.id })}>
                      ↩ Restaurar
                    </button>
                  )}
                  <button className="btn-outline">👁 Ver</button>
                  {!v.cur && (
                    <button className="btn-red"
                      onClick={() => setConfirm({ type: "delete", id: v.id })}>
                      🗑 Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirm && (
        <div className="vr-modal-overlay"
          onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className="vr-modal">
            <div className="vr-modal-icon">{confirm.type === "restore" ? "↩" : "🗑"}</div>
            <div className="vr-modal-title">
              {confirm.type === "restore" ? "¿Restaurar esta versión?" : "¿Eliminar esta versión?"}
            </div>
            <div className="vr-modal-sub">
              {confirm.type === "restore"
                ? "Esta versión se marcará como la actual."
                : "Esta acción no se puede deshacer."}
            </div>
            <div className="vr-modal-acts">
              {confirm.type === "restore"
                ? <button className="btn-gold sm" onClick={() => restore(confirm.id)}>Sí, restaurar</button>
                : <button className="btn-red"     onClick={() => remove(confirm.id)}>Sí, eliminar</button>
              }
              <button className="btn-outline" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}