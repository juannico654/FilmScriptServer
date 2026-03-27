import { useState } from "react";
import Auth      from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import "./styles/global.css";

export default function App() {
  const [page,    setPage]    = useState("auth");
  const [usuario, setUsuario] = useState(null);

  if (page === "auth")
    return <Auth onLogin={(u) => { setUsuario(u); setPage("dashboard"); }} />;

  return <Dashboard usuario={usuario} onLogout={() => { setUsuario(null); setPage("auth"); }} />;
}