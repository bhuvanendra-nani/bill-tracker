import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <>
      <Navbar />
      <div style={{ minHeight: "calc(100vh - 70px)", background: "#f3f4f6" }}>
        <Outlet />
      </div>
    </>
  );
}