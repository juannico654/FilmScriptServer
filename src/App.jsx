import { useState, useEffect } from "react";
import Auth      from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import "./styles/global.css";

export default function App() {
  const [page,    setPage]    = useState("auth");
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
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

  if (page === "auth")
    return <Auth onLogin={handleLogin} />;

  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
}