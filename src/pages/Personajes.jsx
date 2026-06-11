import { useState, useEffect } from "react";
import "../styles/Personajes.css";

const ROLES = ["Protagonista", "Antagonista", "Secundario", "Apoyo", "Extra"];

const EMPTY = {
  name: "",
  role: "Protagonista",
  projectId: "",
  scenes: 0,
  desc: "",
};

export default function Personajes({ projects = [] }) {
  const [chars, setChars] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: "view"|"edit"|"new", char? }
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // TODO: GET /api/characters
    // const res  = await fetch("/api/characters");
    // const data = await res.json();
    // setChars(data);

    setLoading(false);
  }, []);

  // Proyectos disponibles
  const projectList =
    projects.length > 0
      ? projects
      : [
          ...new Map(chars.map((c) => [c.projectId, c.projectName])).entries(),
        ].map(([id, name]) => ({ id, name }));

  const filterOpts = ["Todos", ...projectList.map((p) => p.name)];

  const list =
    filter === "Todos" ? chars : chars.filter((c) => c.projectName === filter);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const openView = (c) => setModal({ mode: "view", char: c });

  const openNew = () => {
    setForm({ ...EMPTY });
    setErrors({});
    setModal({ mode: "new" });
  };

  const openEdit = (c) => {
    setForm({ ...c });
    setErrors({});
    setModal({ mode: "edit", char: c });
  };

  const close = () => setModal(null);

  const validate = () => {
    const e = {};

    if (!form.name.trim()) {
      e.name = "El nombre es obligatorio.";
    }

    if (!form.projectId) {
      e.projectId = "Selecciona un proyecto.";
    }

    return e;
  };

  const save = async () => {
    const e = validate();

    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload = {
      ...form,
      scenes: Number(form.scenes) || 0,
    };

    const projName =
      projectList.find((p) => p.id === form.projectId)?.name || "";

    if (modal.mode === "new") {
      // TODO: POST /api/characters

      setChars((prev) => [
        ...prev,
        {
          ...payload,
          id: Date.now(),
          projectName: projName,
        },
      ]);
    } else {
      // TODO: PUT /api/characters/:id

      setChars((prev) =>
        prev.map((c) =>
          c.id === modal.char.id
            ? { ...c, ...payload, projectName: projName }
            : c,
        ),
      );
    }

    close();
  };

  const remove = async (id) => {
    // TODO: DELETE /api/characters/:id

    setChars((prev) => prev.filter((c) => c.id !== id));

    close();
  };

  return (
    <>
      <div className="page-h">Personajes</div>

      <div className="page-sub">Ficha de cada personaje de tus guiones.</div>

      <div className="fbar">
        {filterOpts.map((p) => (
          <button
            key={p}
            className={`fbtn ${filter === p ? "on" : ""}`}
            onClick={() => setFilter(p)}
          >
            {p}
          </button>
        ))}

        <div style={{ marginLeft: "auto" }}>
          <button className="btn-gold sm" onClick={openNew}>
            ＋ Nuevo personaje
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Cargando personajes</div>
          <div className="empty-sub">Preparando tus personajes…</div>
        </div>
      ) : list.length === 0 ? (
        <div className="empty-state empty-template">
          <div className="empty-icon">👥</div>
          <div className="empty-title">Sin personajes creados</div>
          <div className="empty-sub">
            Agrega los personajes para desarrollar y dar vida a tu guión.
          </div>
          <div className="sample-card sample-card-character">
            <div className="sample-card-title">Alex Mercado</div>
            <div className="sample-card-meta">
              Protagonista · 5 escenas · Detective con pasado
            </div>
            <div className="sample-card-note">
              Un personaje base para empezar tu historia con una voz clara.
            </div>
          </div>
          <button
            className="btn-gold sm"
            onClick={openNew}
            style={{ marginTop: 16 }}
          >
            ＋ Nuevo personaje
          </button>
        </div>
      ) : (
        <div className="ch-grid">
          {list.map((c) => (
            <div className="ch-card" key={c.id} onClick={() => openView(c)}>
              <div className="ch-name">{c.name}</div>

              <div className="ch-role">{c.role}</div>

              <div className="ch-desc">{c.desc}</div>

              <div className="ch-meta">
                🎭 {c.scenes} escenas · 📁 {c.projectName}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────── MODAL ───────── */}
      {modal && (
        <div
          className="ch-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="ch-modal">
            <button className="ch-modal-close" onClick={close}>
              ✕
            </button>

            {modal.mode === "view" ? (
              <>
                <div className="ch-modal-name">{modal.char.name}</div>

                <div className="ch-modal-role">{modal.char.role}</div>

                <div className="ch-modal-desc">{modal.char.desc}</div>

                <div className="ch-modal-meta">
                  🎭 {modal.char.scenes} escenas &nbsp;·&nbsp; 📁{" "}
                  {modal.char.projectName}
                </div>

                <div className="ch-modal-acts">
                  <button
                    className="btn-gold sm"
                    onClick={() => openEdit(modal.char)}
                  >
                    ✏ Editar
                  </button>

                  <button
                    className="btn-red"
                    onClick={() => remove(modal.char.id)}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ch-modal-name" style={{ marginBottom: 16 }}>
                  {modal.mode === "new"
                    ? "Nuevo personaje"
                    : "Editar personaje"}
                </div>

                {/* Nombre */}
                <div className="ch-form-row">
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted2)",
                      marginBottom: 5,
                    }}
                  >
                    Nombre
                  </div>

                  <input
                    className={`ch-form-input ${
                      errors.name ? "sc-input-err" : ""
                    }`}
                    placeholder="Nombre del personaje"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />

                  {errors.name && (
                    <div className="sc-field-err">⚠ {errors.name}</div>
                  )}
                </div>

                {/* Descripción */}
                <div className="ch-form-row">
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted2)",
                      marginBottom: 5,
                    }}
                  >
                    Descripción
                  </div>

                  <textarea
                    className="ch-form-input"
                    placeholder="Breve descripción del personaje…"
                    rows={3}
                    value={form.desc}
                    onChange={(e) => set("desc", e.target.value)}
                    style={{
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {/* Rol */}
                  <div className="ch-form-row">
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted2)",
                        marginBottom: 5,
                      }}
                    >
                      Rol
                    </div>

                    <select
                      className="ch-form-sel"
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Proyecto */}
                  <div className="ch-form-row">
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted2)",
                        marginBottom: 5,
                      }}
                    >
                      Proyecto
                    </div>

                    <select
                      className={`ch-form-sel ${
                        errors.projectId ? "sc-input-err" : ""
                      }`}
                      value={form.projectId}
                      onChange={(e) => set("projectId", e.target.value)}
                    >
                      <option value="">— Seleccionar —</option>

                      {projectList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {errors.projectId && (
                      <div className="sc-field-err">⚠ {errors.projectId}</div>
                    )}
                  </div>
                </div>

                <div className="ch-modal-acts">
                  <button className="btn-gold sm" onClick={save}>
                    💾 Guardar
                  </button>

                  <button className="btn-outline" onClick={close}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
