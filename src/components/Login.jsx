import { useState } from "react";
import API_BASE from "../utils/api";

export default function Login({ onLogin }) {
  const [form,    setForm]    = useState({ email: "", password: "" });
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
    if (!form.email.trim())                     e.email    = "El correo es obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = "Correo no válido.";
    if (!form.password)                         e.password = "La contraseña es obligatoria.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setApiErr(data.message || "Error al iniciar sesión");
        return;
      }

      // Guardar token y usuario en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.user));

      // Pasar datos al parent
      onLogin(data.user);

    } catch (err) {
      setApiErr(err.message || "Error de conexión. Verifica que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="formulario">
      <div className="form-header">
        <h2>Bienvenido</h2>
        <p>Inicia sesión para continuar con tus guiones.</p>
      </div>

      {apiErr && <div className="form-error">⚠ {apiErr}</div>}

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
          placeholder="••••••••"
          className={errors.password ? "input-error" : ""}
          value={form.password}
          onChange={e => set("password", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoComplete="current-password"
        />
        <button className="pw-toggle" type="button" onClick={() => setShowPw(p => !p)}>
          {showPw ? "🙈" : "👁"}
        </button>
        {errors.password && <div className="field-error">⚠ {errors.password}</div>}
      </div>

      <button className="boton-principal" onClick={handleSubmit} disabled={loading}>
        {loading ? <><div className="btn-spinner" /> Entrando...</> : "Iniciar sesión"}
      </button>
    </div>
  );
}