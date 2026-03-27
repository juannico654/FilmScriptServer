import { useState, useEffect } from "react";
import "../styles/Escenas.css";

const TIPOS    = ["INT.", "EXT.", "INT./EXT."];
const MOMENTOS = ["Día", "Noche", "Amanecer", "Atardecer", "Continuo"];
const EMPTY    = { title: "", projectId: "", type: "INT.", lugar: "", momento: "Día", pags: 1 };

export default function Escenas({ projects = [] }) {
  const [scenes,  setScenes]  = useState([]);
  const [filter,  setFilter]  = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [editId,  setEditId]  = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    // TODO: GET /api/scenes
    // const res  = await fetch("/api/scenes");
    // const data = await res.json();
    // setScenes(data);
    setLoading(false);
  }, []);

  // Si no llegan proyectos como prop, los inferimos de las escenas cargadas
  const projectNames = projects.length > 0
    ? projects.map(p => ({ id: p.id, name: p.name }))
    : [...new Map(scenes.map(s => [s.projectId, s.projectName])).entries()]
        .map(([id, name]) => ({ id, name }));

  const filterOpts = ["Todos", ...projectNames.map(p => p.name)];

  const list = filter === "Todos"
    ? scenes
    : scenes.filter(s => s.projectName === filter);

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "El título es obligatorio.";
    if (!form.lugar.trim()) e.lugar = "La locación es obligatoria.";
    if (!form.projectId)    e.projectId = "Selecciona un proyecto.";
    return e;
  };

  const openNew = () => {
    const defaultProject = filter !== "Todos" && projectNames.find(p => p.name === filter);
    setForm({ ...EMPTY, projectId: defaultProject ? defaultProject.id : "" });
    setEditId(null);
    setErrors({});
    setModal(true);
  };

  const openEdit = (s, e) => {
    e.stopPropagation();
    setForm({
      title: s.title, projectId: s.projectId, type: s.type,
      lugar: s.lugar, momento: s.momento,     pags: s.pags,
    });
    setEditId(s.id);
    setErrors({});
    setModal(true);
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const payload = { ...form, pags: Number(form.pags) || 1 };

    if (editId) {
      // TODO: PUT /api/scenes/:id
      // await fetch(`/api/scenes/${editId}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      setScenes(prev => prev.map(s => s.id === editId ? { ...s, ...payload } : s));
    } else {
      // TODO: POST /api/scenes
      // const res  = await fetch("/api/scenes", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      // const data = await res.json();
      // setScenes(prev => [...prev, data]);
      const tempId = Date.now();
      const projName = projectNames.find(p => p.id === form.projectId)?.name || "";
      setScenes(prev => [...prev, { ...payload, id: tempId, projectName: projName }]);
    }
    setModal(false);
  };

  const remove = async (id) => {
    // TODO: DELETE /api/scenes/:id
    // await fetch(`/api/scenes/${id}`, { method: "DELETE" });
    setScenes(prev => prev.filter(s => s.id !== id));
    setConfirm(null);
  };

  return (
    <>
      <div className="page-h">Escenas</div>
      <div className="page-sub">Administra y organiza todas las escenas de tus proyectos.</div>

      <div className="fbar">
        {filterOpts.map(p => (
          <button key={p} className={`fbtn ${filter === p ? "on" : ""}`}
            onClick={() => setFilter(p)}>{p}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className="btn-gold sm" onClick={openNew}>＋ Nueva escena</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Cargando escenas…</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <div className="empty-title">Sin escenas todavía</div>
          <div className="empty-sub">Agrega la primera escena de tu guión.</div>
          <button className="btn-gold sm" onClick={openNew}>＋ Nueva escena</button>
        </div>
      ) : (
        <table className="stbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Proyecto</th>
              <th>Tipo</th>
              <th>Locación</th>
              <th>Págs.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={s.id}>
                <td><span className="sc-num">{String(i + 1).padStart(2, "0")}</span></td>
                <td style={{ fontWeight: 500, color: "var(--text)" }}>{s.title}</td>
                <td style={{ color: "var(--muted2)", fontSize: "12px" }}>{s.projectName}</td>
                <td><span className="sc-type">{s.type}</span></td>
                <td style={{ color: "var(--muted2)", fontSize: "12px" }}>{s.lugar} — {s.momento}</td>
                <td style={{ color: "var(--muted2)", fontSize: "12px" }}>{s.pags}p.</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sc-row-btn" onClick={e => openEdit(s, e)}>✏</button>
                    <button className="sc-row-btn sc-row-del"
                      onClick={e => { e.stopPropagation(); setConfirm(s.id); }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Modal nueva / editar ── */}
      {modal && (
        <div className="sc-modal-overlay"
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="sc-modal">
            <button className="sc-modal-close" onClick={() => setModal(false)}>✕</button>
            <div className="sc-modal-title">{editId ? "Editar escena" : "Nueva escena"}</div>

            <div className="sc-form-row">
              <label>Título</label>
              <input className={`sc-form-input ${errors.title ? "sc-input-err" : ""}`}
                placeholder="Ej: El encuentro"
                value={form.title}
                onChange={e => setF("title", e.target.value)} />
              {errors.title && <div className="sc-field-err">⚠ {errors.title}</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="sc-form-row">
                <label>Tipo</label>
                <select className="sc-form-sel" value={form.type}
                  onChange={e => setF("type", e.target.value)}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="sc-form-row">
                <label>Momento</label>
                <select className="sc-form-sel" value={form.momento}
                  onChange={e => setF("momento", e.target.value)}>
                  {MOMENTOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="sc-form-row">
              <label>Locación</label>
              <input className={`sc-form-input ${errors.lugar ? "sc-input-err" : ""}`}
                placeholder="Ej: Oficina principal"
                value={form.lugar}
                onChange={e => setF("lugar", e.target.value)} />
              {errors.lugar && <div className="sc-field-err">⚠ {errors.lugar}</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="sc-form-row">
                <label>Proyecto</label>
                <select className={`sc-form-sel ${errors.projectId ? "sc-input-err" : ""}`}
                  value={form.projectId}
                  onChange={e => setF("projectId", e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {projectNames.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.projectId && <div className="sc-field-err">⚠ {errors.projectId}</div>}
              </div>
              <div className="sc-form-row">
                <label>Páginas</label>
                <input className="sc-form-input" type="number" min={1} max={99}
                  value={form.pags}
                  onChange={e => setF("pags", e.target.value)} />
              </div>
            </div>

            <div className="sc-modal-acts">
              <button className="btn-gold sm" onClick={save}>
                💾 {editId ? "Guardar cambios" : "Crear escena"}
              </button>
              <button className="btn-outline" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirm && (
        <div className="sc-modal-overlay"
          onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className="sc-modal" style={{ maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <div className="sc-modal-title">¿Eliminar escena?</div>
            <div style={{ fontSize: "13px", color: "var(--muted2)", marginBottom: 22 }}>
              Esta acción no se puede deshacer.
            </div>
            <div className="sc-modal-acts" style={{ justifyContent: "center" }}>
              <button className="btn-red" onClick={() => remove(confirm)}>Sí, eliminar</button>
              <button className="btn-outline" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}