import { useState, useEffect } from "react";

const ADMIN_EMAIL    = "admin@filmscript.com";
const ADMIN_PASSWORD = "Admin2024!";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Roles disponibles ────────────────────────────────────────────
const ROLES = [
  { key: "admin",      label: "Administrador" },
  { key: "instructor", label: "Instructor" },
  { key: "aprendiz",   label: "Aprendiz" },
  { key: "usuario",    label: "Usuario" },
];
const ROL_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));

// ─── Precios por defecto (sin Plan Día) ───────────────────────────
const DEFAULT_PRICES = { mes: 40000, anio: 400000 };

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fieldInput = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--border,#2a2a3e)", borderRadius: "8px",
  padding: "9px 12px", color: "var(--text,#e0e0e0)", fontSize: "13px",
  outline: "none", boxSizing: "border-box",
};
const btnGold = {
  padding: "10px 22px", borderRadius: "8px", border: "none",
  background: "var(--gold,#c9a84c)", color: "#000",
  fontWeight: 700, fontSize: "13px", cursor: "pointer",
};
const fieldLabel = { fontSize: "11px", color: "var(--muted2,#aaa)", marginBottom: 5, display: "block" };

// Helper: hace fetch a /api/admin/* incluyendo la cabecera X-Admin-Key
const adminFetch = (path, options = {}) => {
  const adminKey = sessionStorage.getItem("adminKey") || "";
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
      ...(options.headers || {}),
    },
  });
};

// ════════════════════════════════════════════════════════════════
//  LOGIN DEL ADMINISTRADOR
// ════════════════════════════════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  const handleSubmit = () => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminKey = btoa(`${email}:${password}`);
      sessionStorage.setItem("adminKey", adminKey);
      onLogin();
    } else {
      setError("Correo o contraseña de administrador incorrectos.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--ink,#0d0d14)",
    }}>
      <div style={{
        background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)",
        borderRadius: "16px", padding: "40px", width: "380px", maxWidth: "95vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "14px",
            background: "var(--gold,#c9a84c)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 900, margin: "0 auto 14px",
          }}>⚙</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 3, color: "var(--text,#e0e0e0)" }}>
            PANEL ADMINISTRADOR
          </div>
          <div style={{ fontSize: 12, color: "var(--muted,#888)", marginTop: 4 }}>FilmScript · Acceso restringido</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Correo electrónico</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="admin@filmscript.com"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={fieldInput} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={fieldLabel}>Contraseña</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={fieldInput} />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#e05c5c", marginBottom: 14, padding: "8px 12px", background: "rgba(224,92,92,0.1)", borderRadius: 7 }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={handleSubmit} style={{ ...btnGold, width: "100%" }}>
          Entrar al panel
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SECCIÓN: GESTIÓN DE PRECIOS
// ════════════════════════════════════════════════════════════════
function SeccionPrecios() {
  const [prices,  setPrices]  = useState(DEFAULT_PRICES);
  const [editing, setEditing] = useState({ mes: String(DEFAULT_PRICES.mes), anio: String(DEFAULT_PRICES.anio) });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [flash,   setFlash]   = useState("");
  const [err,     setErr]     = useState("");

  const cargar = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/api/plans`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const p = { mes: data.mes, anio: data.anio };
      setPrices(p);
      setEditing({ mes: String(p.mes), anio: String(p.anio) });
    } catch {
      setErr("No se pudieron cargar los precios desde el backend. Mostrando valores por defecto.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const save = async () => {
    const mes  = parseInt(editing.mes,  10);
    const anio = parseInt(editing.anio, 10);
    if (isNaN(mes) || isNaN(anio) || mes <= 0 || anio <= 0) {
      setErr("Todos los precios deben ser números positivos."); return;
    }
    setSaving(true); setErr(""); setFlash("");
    try {
      const res = await adminFetch(`/api/admin/plans`, {
        method: "PUT",
        body: JSON.stringify({ mes, anio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setPrices({ mes: data.mes, anio: data.anio });
      setFlash("✓ Precios actualizados correctamente");
      setTimeout(() => setFlash(""), 2500);
    } catch (e) {
      setErr(e.message || "No se pudo conectar al backend.");
    } finally {
      setSaving(false);
    }
  };

  const planes = [
    { key: "mes",  label: "Plan Mes",   icon: "📅", desc: "Acceso por 30 días",  color: "#c9a84c" },
    { key: "anio", label: "Plan Anual", icon: "⭐", desc: "Acceso por 365 días", color: "#5ce07a" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text,#e0e0e0)", marginBottom: 6 }}>
          💰 Gestión de Precios
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted,#888)" }}>
          Configura el precio de cada plan de acceso. Los cambios se aplican de inmediato para todos los usuarios.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted,#888)" }}>⏳ Cargando…</div>
      ) : (
        <>
          {/* Tarjetas de precios actuales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
            {planes.map(p => (
              <div key={p.key} style={{
                background: "var(--card-bg,#1a1a2e)", border: `1px solid ${p.color}33`,
                borderRadius: 14, padding: "22px 20px",
                boxShadow: `0 4px 20px ${p.color}15`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text,#e0e0e0)", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted,#888)", marginBottom: 14 }}>{p.desc}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: p.color }}>{fmt(prices[p.key])}</div>
              </div>
            ))}
          </div>

          {/* Editor de precios */}
          <div style={{
            background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)",
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text,#e0e0e0)", marginBottom: 20 }}>
              Editar precios (COP)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>
              {planes.map(p => (
                <div key={p.key}>
                  <label style={fieldLabel}>{p.icon} {p.label}</label>
                  <input
                    type="number" min="1" value={editing[p.key]}
                    onChange={e => { setEditing(prev => ({ ...prev, [p.key]: e.target.value })); setErr(""); }}
                    style={fieldInput}
                  />
                </div>
              ))}
            </div>
            {err   && <div style={{ fontSize: 12, color: "#e05c5c", marginBottom: 12 }}>⚠ {err}</div>}
            {flash && <div style={{ fontSize: 12, color: "#5ce07a", marginBottom: 12 }}>{flash}</div>}
            <button onClick={save} style={{ ...btnGold, opacity: saving ? 0.7 : 1 }} disabled={saving}>
              {saving ? "Guardando…" : "Guardar precios"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MODAL: CREAR / EDITAR USUARIO
// ════════════════════════════════════════════════════════════════
function UsuarioModal({ usuario, onClose, onSaved }) {
  const esEdicion = !!usuario;
  const [form, setForm] = useState({
    name:  usuario?.name  || "",
    email: usuario?.email || "",
    rol:   usuario?.rol   || "usuario",
    password: "",
  });
  const [err,    setErr]    = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setErr("El nombre y el correo son obligatorios."); return; }
    if (!/\S+@\S+\.\S+/.test(form.email))         { setErr("Correo no válido.");                       return; }
    if (!esEdicion && !form.password)             { setErr("La contraseña es obligatoria.");           return; }
    if (form.password && form.password.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres."); return; }

    setSaving(true); setErr("");
    try {
      const path = esEdicion ? `/api/admin/users/${usuario._id || usuario.id}` : `/api/admin/users`;
      const body = { name: form.name.trim(), email: form.email.trim(), rol: form.rol };
      if (form.password) body.password = form.password;

      const res = await adminFetch(path, {
        method: esEdicion ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar el usuario");
      onSaved(data.user);
    } catch (e) {
      setErr(e.message || "No se pudo conectar al backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)", borderRadius: 14, padding: 28, width: 400, maxWidth: "95vw", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text,#e0e0e0)", marginBottom: 18 }}>
          {esEdicion ? "✏️ Editar usuario" : "➕ Crear usuario"}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Nombre completo</label>
          <input style={fieldInput} value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Correo electrónico</label>
          <input style={fieldInput} type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Rol</label>
          <select style={{ ...fieldInput, cursor: "pointer" }} value={form.rol} onChange={e => set("rol", e.target.value)}>
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>{esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
          <input style={fieldInput} type="password" value={form.password}
            placeholder={esEdicion ? "Dejar en blanco para no cambiarla" : "Mínimo 6 caracteres"}
            onChange={e => set("password", e.target.value)} />
        </div>

        {err && <div style={{ fontSize: 12, color: "#e05c5c", marginBottom: 14, padding: "8px 12px", background: "rgba(224,92,92,0.1)", borderRadius: 7 }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border,#2a2a3e)", background: "transparent", color: "var(--text,#e0e0e0)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--gold,#c9a84c)", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando…" : (esEdicion ? "Guardar cambios" : "Crear usuario")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SECCIÓN: USUARIOS REGISTRADOS
// ════════════════════════════════════════════════════════════════
function SeccionUsuarios() {
  const [agrupados, setAgrupados] = useState({ admin: [], instructor: [], aprendiz: [], usuario: [] });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [deleting,  setDeleting]  = useState(null);
  const [flash,     setFlash]     = useState("");
  const [confirm,   setConfirm]   = useState(null);
  const [modal,     setModal]     = useState(null); // { mode: "crear" | "editar", usuario? }

  const fetchUsuarios = async () => {
    setLoading(true); setError("");
    try {
      const res = await adminFetch(`/api/admin/users`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.agrupados) {
        setAgrupados({
          admin: data.agrupados.admin || [],
          instructor: data.agrupados.instructor || [],
          aprendiz: data.agrupados.aprendiz || [],
          usuario: data.agrupados.usuario || [],
        });
      } else {
        // Compatibilidad: si el backend devuelve un array plano, agrupar acá
        const lista = Array.isArray(data) ? data : data.users || [];
        const ag = { admin: [], instructor: [], aprendiz: [], usuario: [] };
        lista.forEach(u => { (ag[u.rol] || ag.usuario).push(u); });
        setAgrupados(ag);
      }
    } catch (e) {
      setError("No se pudo conectar al backend. Asegúrate de que esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const eliminarUsuario = async (user) => {
    setConfirm(null);
    setDeleting(user._id || user.id);
    try {
      const res = await adminFetch(`/api/admin/users/${user._id || user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      setAgrupados(prev => {
        const next = {};
        for (const rol of Object.keys(prev)) {
          next[rol] = prev[rol].filter(u => (u._id || u.id) !== (user._id || user.id));
        }
        return next;
      });
      setFlash(`✓ Usuario "${user.name}" eliminado`);
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      setError(e.message || "No se pudo eliminar el usuario.");
    } finally {
      setDeleting(null);
    }
  };

  const onUsuarioGuardado = (usuarioGuardado) => {
    setModal(null);
    setFlash(modal?.mode === "crear" ? "✓ Usuario creado correctamente" : "✓ Usuario actualizado correctamente");
    setTimeout(() => setFlash(""), 3000);
    fetchUsuarios();
  };

  const rolColor = { admin: "#e05c5c", instructor: "#c9a84c", aprendiz: "#6eb5ff", usuario: "#9b8cff" };
  const rolBg    = { admin: "rgba(224,92,92,0.12)", instructor: "rgba(201,168,76,0.12)", aprendiz: "rgba(110,181,255,0.12)", usuario: "rgba(155,140,255,0.12)" };
  const rolIcon  = { admin: "🛡️", instructor: "🎓", aprendiz: "📘", usuario: "👤" };

  const grupos = [
    { key: "admin",      titulo: "Administradores" },
    { key: "instructor", titulo: "Instructores" },
    { key: "aprendiz",   titulo: "Aprendices" },
    { key: "usuario",    titulo: "Usuarios" },
  ];

  const renderTabla = (lista) => (
    <div style={{ background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 140px 90px 80px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border,#2a2a3e)", fontSize: 10, color: "var(--muted,#888)", fontWeight: 700, letterSpacing: 1 }}>
        <span>NOMBRE</span><span>CORREO</span><span>REGISTRO</span><span>LICENCIA</span><span style={{ textAlign: "right" }}>ACCIONES</span>
      </div>
      {lista.map((u, i) => (
        <div key={u._id || u.id || i} style={{
          display: "grid", gridTemplateColumns: "1fr 1.4fr 140px 90px 80px",
          gap: 12, padding: "14px 20px", alignItems: "center",
          borderBottom: i < lista.length - 1 ? "1px solid var(--border,#2a2a3e)" : "none",
          background: (u._id || u.id) === deleting ? "rgba(224,92,92,0.05)" : "transparent",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gold,#c9a84c)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {(u.name || "?").slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "var(--text,#e0e0e0)", fontWeight: 600 }}>{u.name}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--muted2,#aaa)" }}>{u.email}</span>
          <span style={{ fontSize: 11, color: "var(--muted,#888)" }}>
            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: u.licencia?.estado === "activa" ? "#5ce07a" : "#888", textAlign: "left" }}>
            {u.licencia?.estado === "activa" ? "Activa" : (u.licencia?.estado || "—")}
          </span>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              onClick={() => setModal({ mode: "editar", usuario: u })}
              style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", color: "var(--gold,#c9a84c)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              Editar
            </button>
            <button
              onClick={() => setConfirm(u)}
              disabled={deleting === (u._id || u.id) || u.rol === "admin"}
              title={u.rol === "admin" ? "No se puede eliminar un administrador" : ""}
              style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(224,92,92,0.4)", background: "rgba(224,92,92,0.08)", color: "#e05c5c", fontSize: 11, cursor: u.rol === "admin" ? "not-allowed" : "pointer", fontWeight: 600, opacity: u.rol === "admin" ? 0.4 : 1 }}>
              {deleting === (u._id || u.id) ? "…" : "Eliminar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const totalUsuarios = Object.values(agrupados).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text,#e0e0e0)", marginBottom: 6 }}>
            👥 Usuarios Registrados
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted,#888)" }}>
            Visualiza y gestiona todos los usuarios de la plataforma, separados por rol.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setModal({ mode: "crear" })} style={{ ...btnGold, padding: "8px 16px", fontSize: 12 }}>
            ＋ Crear usuario
          </button>
          <button onClick={fetchUsuarios} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 8, border: "1px solid var(--border,#2a2a3e)", background: "transparent", color: "var(--text,#e0e0e0)", cursor: "pointer" }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {flash && (
        <div style={{ fontSize: 13, color: "#5ce07a", marginBottom: 16, padding: "10px 16px", background: "rgba(92,224,122,0.1)", borderRadius: 8 }}>
          {flash}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted,#888)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Cargando usuarios…
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: "20px 24px", background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.25)", borderRadius: 12, color: "#e05c5c", fontSize: 13 }}>
          ⚠ {error}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted,#888)" }}>
            Una vez que el backend esté conectado, los usuarios aparecerán aquí automáticamente.
          </div>
        </div>
      )}

      {!loading && !error && totalUsuarios === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted,#888)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 14 }}>Sin usuarios registrados todavía</div>
        </div>
      )}

      {!loading && !error && totalUsuarios > 0 && grupos.map(g => (
        agrupados[g.key].length > 0 && (
          <div key={g.key} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: rolColor[g.key] }}>{rolIcon[g.key]} {g.titulo}</span>
              <span style={{ fontSize: 11, color: "var(--muted,#888)", background: rolBg[g.key], padding: "2px 8px", borderRadius: 12 }}>
                {agrupados[g.key].length}
              </span>
            </div>
            {renderTabla(agrupados[g.key])}
          </div>
        )
      ))}

      {/* Modal de confirmación de borrado */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)", borderRadius: 14, padding: 28, width: 360, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text,#e0e0e0)", textAlign: "center", marginBottom: 8 }}>
              ¿Eliminar usuario?
            </div>
            <div style={{ fontSize: 13, color: "var(--muted,#888)", textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
              Vas a eliminar a <strong style={{ color: "var(--text,#e0e0e0)" }}>{confirm.name}</strong> ({confirm.email}).<br/>Esta acción no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border,#2a2a3e)", background: "transparent", color: "var(--text,#e0e0e0)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => eliminarUsuario(confirm)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#e05c5c", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación/edición de usuario */}
      {modal && (
        <UsuarioModal
          usuario={modal.mode === "editar" ? modal.usuario : null}
          onClose={() => setModal(null)}
          onSaved={onUsuarioGuardado}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  PANEL PRINCIPAL DEL ADMIN
// ════════════════════════════════════════════════════════════════
function AdminDashboard({ onLogout }) {
  const [seccion, setSeccion] = useState("precios");

  const secciones = [
    { key: "precios",   icon: "💰", label: "Precios" },
    { key: "usuarios",  icon: "👥", label: "Usuarios" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--ink,#0d0d14)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "var(--surface,#111120)", borderRight: "1px solid var(--border,#2a2a3e)", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 16px 24px", borderBottom: "1px solid var(--border,#2a2a3e)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--gold,#c9a84c)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>✦</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, color: "var(--text,#e0e0e0)" }}>FILMSCRIPT</div>
              <div style={{ fontSize: 10, color: "var(--gold,#c9a84c)", letterSpacing: 1 }}>ADMIN PANEL</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "0 14px" }}>
          {secciones.map(s => (
            <button key={s.key} onClick={() => setSeccion(s.key)}
              style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%",
                padding: "9px 11px", borderRadius: 9, cursor: "pointer",
                fontSize: 13, border: "none", textAlign: "left", marginBottom: 2,
                background: seccion === s.key ? "rgba(201,168,76,0.15)" : "none",
                color: seccion === s.key ? "var(--gold,#c9a84c)" : "var(--muted2,#aaa)",
                borderLeft: seccion === s.key ? "2px solid var(--gold,#c9a84c)" : "2px solid transparent",
              }}>
              <span style={{ fontSize: 15 }}>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "14px", borderTop: "1px solid var(--border,#2a2a3e)" }}>
          <button onClick={onLogout}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: 9, cursor: "pointer", fontSize: 13, border: "none", background: "none", color: "#e05c5c", textAlign: "left" }}>
            <span>⏻</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "40px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(201,168,76,0.15)", border: "1px solid var(--gold,#c9a84c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {secciones.find(s => s.key === seccion)?.icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text,#e0e0e0)" }}>
              {secciones.find(s => s.key === seccion)?.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted,#888)" }}>Panel de Administración · FilmScript</div>
          </div>
        </div>

        {seccion === "precios"  && <SeccionPrecios  />}
        {seccion === "usuarios" && <SeccionUsuarios />}
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  EXPORT PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("adminLoggedIn") === "true" && !!sessionStorage.getItem("adminKey"));

  const handleLogin = () => {
    sessionStorage.setItem("adminLoggedIn", "true");
    setLoggedIn(true);
  };
  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    sessionStorage.removeItem("adminKey");
    setLoggedIn(false);
  };

  if (!loggedIn) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard onLogout={handleLogout} />;
}