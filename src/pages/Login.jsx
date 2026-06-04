import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Sending login data:", formData);
    console.log("API URL:", import.meta.env.VITE_API_URL);

    try {
      const res = await api.post("/auth/login", formData);

      localStorage.setItem("bill_token", res.data.token);
      localStorage.setItem("bill_user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed";

      alert(message);
    }
  };

  const devLogin = () => {
    localStorage.setItem("bill_token", "dev-token");
    localStorage.setItem(
      "bill_user",
      JSON.stringify({
        id: 1,
        name: "Dev User",
        email: "test@local.test",
      })
    );
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-md"
      >
        <h1 className="text-center text-2xl font-bold text-gray-800">Login</h1>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          required
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
        >
          Login
        </button>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={devLogin}
            className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700"
          >
            Dev Login (no backend)
          </button>
        )}
      </form>
    </div>
  );
};

export default Login;