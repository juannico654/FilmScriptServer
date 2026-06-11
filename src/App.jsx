import { useState, useEffect } from "react";
import Auth          from "./pages/Auth";
import Dashboard      from "./pages/Dashboard";
import AdminPanel     from "./pages/AdminPanel";
import PagoRequerido  from "./pages/PagoRequerido";
import "./styles/Global.css";

// Determina si la cuenta tiene una licencia activa y vigente
const tieneLicenciaActiva = (usuario) => {
  const licencia = usuario?.licencia;
  if (!licencia) return false;
  if (licencia.estado !== "activa") return false;
  if (!licencia.fechaExpiracion) return false;
  return new Date(licencia.fechaExpiracion) > new Date();
};

// Solo el rol "usuario" necesita pagar un plan para usar la plataforma.
// admin, instructor y aprendiz tienen acceso completo siempre.
const requierePago = (usuario) => usuario?.rol === "usuario" && !tieneLicenciaActiva(usuario);

export default function App() {
  const [page,    setPage]    = useState("auth");
  const [usuario, setUsuario] = useState(null);

  // Detectar ruta /admin en la URL
  const isAdminRoute = window.location.pathname === "/admin" || window.location.hash === "#/admin";

  useEffect(() => {
    if (isAdminRoute) { setPage("admin"); return; }
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsuario(user);
      setPage(requierePago(user) ? "pago" : "dashboard");
    }
  }, []);

  const handleLogin = (user) => {
    setUsuario(user);
    setPage(requierePago(user) ? "pago" : "dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    setPage("auth");
  };

  const handleLicenciaActivada = (user) => {
    setUsuario(user);
    setPage("dashboard");
  };

  if (page === "admin")     return <AdminPanel />;
  if (page === "auth")      return <Auth onLogin={handleLogin} />;
  if (page === "pago")
    return (
      <PagoRequerido
        usuario={usuario}
        onLicenciaActivada={handleLicenciaActivada}
        onLogout={handleLogout}
      />
    );
  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
}