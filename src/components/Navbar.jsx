import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("bill_token");
    localStorage.removeItem("bill_user");
    navigate("/login");
    window.location.reload();
  };

  const linkStyle = {
    color: "#fff",
    textDecoration: "none",
    fontWeight: "500",
    padding: "8px 10px",
    borderRadius: "8px",
  };

  return (
    <nav
      style={{
        padding: "16px",
        background: "#0f172a",
        color: "#fff",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
     
      <Link to="/calculator" style={linkStyle}>Calculator</Link>

      <button
        onClick={logout}
        style={{
          marginLeft: "auto",
          padding: "8px 12px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </nav>
  );
}