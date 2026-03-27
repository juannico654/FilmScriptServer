import { useState } from "react";
import Login    from "../components/Login";
import Register from "../components/Register";
import "../styles/Auth.css";

function Auth({ onLogin }) {
  const [mostrarLogin, setMostrarLogin] = useState(true);

  return (
    <div className="container">

      {/* ── Panel Izquierdo ── */}
      <div className="background-rotate">
        <div className="deco-lines">
          <span /><span /><span /><span />
        </div>
        <div className="left-content">
          <div className="brand">
            <div className="brand-icon">✦</div>
            <span className="brand-name">FILMSCRIPT</span>
          </div>
          <div className="left-hero">
            <div className="hero-label">Plataforma de guiones</div>
            <h1>Crea sin<br /><em>límites.</em></h1>
            <p>Escribe, organiza y colabora en tus guiones y proyectos creativos desde un solo lugar.</p>
          </div>
          <div className="left-stats">
            <div className="stat"><span className="stat-num"></span><span className="stat-label">Guiones</span></div>
            <div className="stat"><span className="stat-num"></span><span className="stat-label">Usuarios</span></div>
            <div className="stat"><span className="stat-num"></span><span className="stat-label">Uptime</span></div>
          </div>
        </div>
      </div>

      {/* ── Panel Derecho ── */}
      <div className="right-panel">
        {mostrarLogin
          ? <Login    onLogin={onLogin} />
          : <Register onLogin={onLogin} />
        }
        <div className="divider">o</div>
        <button className="boton-cambiar" onClick={() => setMostrarLogin(!mostrarLogin)}>
          {mostrarLogin
            ? <>¿No tienes cuenta? <span>Regístrate gratis</span></>
            : <>¿Ya tienes cuenta? <span>Inicia sesión</span></>
          }
        </button>
      </div>

    </div>
  );
}

export default Auth;