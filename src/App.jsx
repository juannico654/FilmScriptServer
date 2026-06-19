import { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import PagoRequerido from "./pages/PagoRequerido";
import { requierePago } from "./utils/licencia";
import "./styles/Global.css";

export default function App() {
  const [page, setPage] = useState("auth");
  const [usuario, setUsuario] = useState(null);

  // Detectar ruta /admin en la URL
  const isAdminRoute =
    window.location.pathname === "/admin" || window.location.hash === "#/admin";

  useEffect(() => {
    if (isAdminRoute) {
      setPage("admin");
      return;
    }
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

  const handleExitAdminPanel = () => {
    window.history.replaceState({}, "", "/");
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsuario(user);
      setPage(requierePago(user) ? "pago" : "dashboard");
      return;
    }
    setUsuario(null);
    setPage("auth");
  };

  if (page === "admin") return <AdminPanel onExit={handleExitAdminPanel} />;
  if (page === "auth") return <Auth onLogin={handleLogin} />;
  if (page === "pago")
    return (
      <PagoRequerido
        usuario={usuario}
        onLicenciaActivada={handleLicenciaActivada}
        onLogout={handleLogout}
        onBackToLogin={handleLogout}
      />
    );
  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
}
