import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
   localStorage.removeItem("bill_token");
    localStorage.removeItem("bill_user");
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav style={{ padding: "16px", background: "#0f172a", color: "#fff", display: "flex", gap: "16px" }}>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/entries">Entries</Link>
      <button onClick={logout} style={{ marginLeft: "auto", padding: "8px 12px" }}>
        Logout
      </button>
    </nav>
  );
}