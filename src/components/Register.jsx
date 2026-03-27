import { useState } from "react";

function pwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const SLABEL = ["", "Débil", "Regular", "Buena", "Fuerte"];
const SCLASS = ["", "weak",  "weak",    "medium","strong"];

export default function Register({ onLogin }) {
  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors,  setErrors]  = useState({});
  const [apiErr,  setApiErr]  = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
    setApiErr("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name     = "El nombre es obligatorio.";
    if (!form.email.trim())                     e.email    = "El correo es obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = "Correo no válido.";
    if (!form.password)                         e.password = "La contraseña es obligatoria.";
    else if (form.password.length < 6)          e.password = "Mínimo 6 caracteres.";
    if (form.confirm !== form.password)         e.confirm  = "Las contraseñas no coinciden.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      // TODO: await fetch("/api/auth/register", ...)
      await new Promise(r => setTimeout(r, 800));
      onLogin();
    } catch (err) {
      setApiErr(err.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const strength = pwStrength(form.password);

  return (
    <div className="formulario">
      <div className="form-header">
        <h2>Crear cuenta</h2>
        <p>Empieza a escribir tus guiones hoy.</p>
      </div>

      {apiErr && <div className="form-error">⚠ {apiErr}</div>}

      <div className="input-group">
        <label>Nombre completo</label>
        <span className="input-icon">👤</span>
        <input
          type="text"
          placeholder="Tu nombre"
          className={errors.name ? "input-error" : ""}
          value={form.name}
          onChange={e => set("name", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoComplete="name"
        />
        {errors.name && <div className="field-error">⚠ {errors.name}</div>}
      </div>

      <div className="input-group">
        <label>Correo electrónico</label>
        <span className="input-icon">✉</span>
        <input
          type="email"
          placeholder="tu@correo.com"
          className={errors.email ? "input-error" : ""}
          value={form.email}
          onChange={e => set("email", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoComplete="email"
        />
        {errors.email && <div className="field-error">⚠ {errors.email}</div>}
      </div>

      <div className="input-group has-toggle">
        <label>Contraseña</label>
        <span className="input-icon">🔒</span>
        <input
          type={showPw ? "text" : "password"}
          placeholder="Mínimo 6 caracteres"
          className={errors.password ? "input-error" : ""}
          value={form.password}
          onChange={e => set("password", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoComplete="new-password"
        />
        <button className="pw-toggle" type="button" onClick={() => setShowPw(p => !p)}>
          {showPw ? "🙈" : "👁"}
        </button>
        {form.password && (
          <div className="pw-strength">
            <div className="pw-strength-bar">
              {[1,2,3,4].map(i => (
                <div key={i} className={`pw-strength-seg ${i <= strength ? SCLASS[strength] : ""}`} />
              ))}
            </div>
            <div className="pw-strength-label">{SLABEL[strength]}</div>
          </div>
        )}
        {errors.password && <div className="field-error">⚠ {errors.password}</div>}
      </div>

      <div className="input-group has-toggle">
        <label>Confirmar contraseña</label>
        <span className="input-icon">🔒</span>
        <input
          type={showPw ? "text" : "password"}
          placeholder="Repite tu contraseña"
          className={errors.confirm ? "input-error" : ""}
          value={form.confirm}
          onChange={e => set("confirm", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoComplete="new-password"
        />
        {errors.confirm && <div className="field-error">⚠ {errors.confirm}</div>}
      </div>

      <button className="boton-principal" onClick={handleSubmit} disabled={loading}>
        {loading ? <><div className="btn-spinner" /> Creando cuenta...</> : "Crear cuenta"}
      </button>
    </div>
  );
}