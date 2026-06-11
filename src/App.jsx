import { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import "./styles/global.css";
import "./styles/Emptystates.css";

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
      setUsuario(JSON.parse(storedUser));
      setPage("dashboard");
    }
  }, []);

  const handleLogin = (user) => {
    setUsuario(user);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    setPage("auth");
  };

  if (page === "admin") return <AdminPanel />;
  if (page === "auth") return <Auth onLogin={handleLogin} />;
  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
}
