import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import TransactionDetails from "./pages/TransactionDetails";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("bill_token");

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Server returned HTML instead of JSON.\nURL: ${API_URL}${endpoint}`
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is not defined");
}

const AppContext = createContext(null);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

function useIsMobile(breakpoint = 768) {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [breakpoint]);

  return isMobile;
}

function getStoredToken() {
  return localStorage.getItem("bill_token") || "";
}



function normalizeTransaction(item) {
  return {
    ...item,
    id: item.id || item._id,
  };
}

function getDefaultSettings() {
  return {
    businessName: "Bill Manager",
    currency: "INR",
    theme: "light",
  };
}

function formatCurrency(amount, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0)}`;
  }
}

function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bill_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => getStoredToken());
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(getDefaultSettings());
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("bill_token", token);
    } else {
      localStorage.removeItem("bill_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("bill_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("bill_user");
    }
  }, [user]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const [profileData, settingsData, transactionsData] = await Promise.all([
  apiRequest("/profile"),
  apiRequest("/settings"),
  apiRequest("/transactions"),
]);

        setUser(profileData?.user || profileData || null);
        setSettings(settingsData?.settings || settingsData || getDefaultSettings());

        const transactionList = Array.isArray(transactionsData)
          ? transactionsData
          : transactionsData?.transactions || [];

        setTransactions(transactionList.map(normalizeTransaction));
      } catch (error) {
  console.error("Bootstrap Error:", error);

  // logout only for authentication failures
  if (
    error.message.includes("401") ||
    error.message.includes("Unauthorized")
  ) {
    setUser(null);
    setToken("");
    setTransactions([]);
    setSettings(getDefaultSettings());
  }
} finally {
        setBooting(false);
      }
    };

    bootstrap();
  }, [token]);

  const register = async ({ name, email, password }) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    setUser(data.user || null);
    setToken(data.token || "");
    return data;
  };

  const login = async ({ email, password }) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setUser(data.user || null);
    setToken(data.token || "");
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setTransactions([]);
    setSettings(getDefaultSettings());
  };

  const fetchTransactions = async () => {
    const data = await apiRequest("/transactions");
    const list = Array.isArray(data) ? data : data?.transactions || [];
    setTransactions(list.map(normalizeTransaction));
  };

  const addTransaction = async (payload) => {
    const data = await apiRequest("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const newItem = normalizeTransaction(data?.transaction || data);
    setTransactions((prev) => [newItem, ...prev]);
    return newItem;
  };

  const deleteTransaction = async (id) => {
    await apiRequest(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const updateProfile = async (payload) => {
    const body = {
      name: payload.name,
      email: payload.email,
      ...(payload.password ? { password: payload.password } : {}),
    };

    const data = await apiRequest("/profile", {
  method: "PUT",
  body: JSON.stringify(body),
});

    const updatedUser = data?.user || data;
    setUser(updatedUser);
    return updatedUser;
  };

  const saveSettings = async (payload) => {
    const data = await apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const updated = data?.settings || data || getDefaultSettings();
    setSettings(updated);
    return updated;
  };

  const refreshSettings = async () => {
    const data = await apiRequest("/settings");
    setSettings(data?.settings || data || getDefaultSettings());
  };

  const exportBackup = async () => {
    const data = await apiRequest("/backup/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bill-backup.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importBackup = async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text);

    await apiRequest("/backup/import", {
      method: "POST",
      body: JSON.stringify(parsed),
    });

    await Promise.all([fetchTransactions(), refreshSettings()]);
  };

  const dashboardStats = useMemo(() => {
    const totalReceived = transactions
      .filter((item) => item.type === "received")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalSent = transactions
      .filter((item) => item.type === "sent")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      totalReceived,
      totalSent,
      balance: totalReceived - totalSent,
      totalEntries: transactions.length,
    };
  }, [transactions]);

  const value = {
    user,
    token,
    transactions,
    settings,
    loading,
    setLoading,
    booting,
    register,
    login,
    logout,
    addTransaction,
    deleteTransaction,
    updateProfile,
    saveSettings,
    exportBackup,
    importBackup,
    fetchTransactions,
    dashboardStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function PageLoader({ text = "Loading..." }) {
  return (
    <div style={styles.centerPage}>
      <div style={{ ...styles.card, background: "#fff", color: "#111827", maxWidth: 420 }}>
        <h2 style={{ margin: 0 }}>{text}</h2>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { token, booting } = useApp();

  if (booting) {
    return <PageLoader text="Loading app..." />;
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const { token, booting } = useApp();

  if (booting) {
    return <PageLoader text="Loading..." />;
  }

  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function SplashPage() {
  const navigate = useNavigate();
  const { token } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(token ? "/dashboard" : "/login", { replace: true });
    }, 1200);

    return () => clearTimeout(timer);
  }, [navigate, token]);

  return (
    <div style={styles.centerPage}>
      <div style={{ ...styles.cardLarge, background: "#fff", color: "#111827" }}>
        <h1 style={{ margin: 0 }}>Bill Manager</h1>
        <p style={{ margin: 0 }}>
          Track received and sent money with reports, settings, and backup.
        </p>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login, setLoading, loading } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.centerPage}>
      <form
        onSubmit={handleSubmit}
        style={{
          ...styles.card,
          ...styles.authCard,
          background: "#fff",
          color: "#111827",
        }}
      >
        <h2 style={{ margin: 0 }}>Login</h2>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error ? <p style={styles.error}>{error}</p> : null}

        <button style={styles.buttonPrimary} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ margin: 0 }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}

function RegisterPage() {
  const { register, setLoading, loading } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.centerPage}>
      <form
        onSubmit={handleSubmit}
        style={{
          ...styles.card,
          ...styles.authCard,
          background: "#fff",
          color: "#111827",
        }}
      >
        <h2 style={{ margin: 0 }}>Register</h2>

        <input
          style={styles.input}
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error ? <p style={styles.error}>{error}</p> : null}

        <button style={styles.buttonPrimary} type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p style={{ margin: 0 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

function DashboardLayout() {
  const { logout, user, settings } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const isDark = settings.theme === "dark";

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/add-transaction", label: "Add Transaction" },
    { to: "/reports", label: "Reports" },
    { to: "/settings", label: "Settings" },
    { to: "/profile", label: "Profile" },
    { to: "/backup-export", label: "Backup & Export" },
  ];

  return (
    <div
      style={{
        ...styles.appShell,
        gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
        background: isDark ? "#0f172a" : "#f4f7fb",
        color: isDark ? "#f8fafc" : "#111827",
      }}
    >
      <aside
        style={{
          ...styles.sidebar,
          padding: isMobile ? 16 : 20,
        }}
      >
        <h2 style={{ marginBottom: 8, marginTop: 0 }}>
          {settings.businessName || "Bill Manager"}
        </h2>
        <p style={{ ...styles.sidebarMuted, marginTop: 0 }}>
          Hello, {user?.name || "User"}
        </p>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 20,
            gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                ...styles.navLink,
                textAlign: isMobile ? "center" : "left",
                ...(location.pathname === link.to ? styles.navLinkActive : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          style={{
            ...styles.buttonSecondary,
            marginTop: 20,
            width: isMobile ? "100%" : "auto",
          }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <main
        style={{
          ...styles.mainContent,
          padding: isMobile ? 16 : 24,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function DashboardPage() {
  const { dashboardStats, transactions, settings } = useApp();
  const isMobile = useIsMobile();

  return (
    <div>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      <div
        style={{
          ...styles.grid3,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <StatCard
          label="Total Received"
          value={formatCurrency(dashboardStats.totalReceived, settings.currency)}
          settings={settings}
        />
        <StatCard
          label="Total Sent"
          value={formatCurrency(dashboardStats.totalSent, settings.currency)}
          settings={settings}
        />
        <StatCard
          label="Balance"
          value={formatCurrency(dashboardStats.balance, settings.currency)}
          settings={settings}
        />
      </div>

      <div style={{ ...themedCard(settings), marginTop: 20 }}>
        <h3 style={styles.sectionTitle}>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p style={styles.paragraph}>No transactions yet.</p>
        ) : (
          transactions.slice(0, 5).map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.rowBetween,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <p style={styles.mutedSmall}>{item.date}</p>
              </div>
              <div style={{ color: item.type === "received" ? "green" : "crimson" }}>
                {item.type === "received" ? "+" : "-"}{" "}
                {formatCurrency(item.amount, settings.currency)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddTransactionPage() {
  const { settings, setLoading, loading, fetchTransactions } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    amount: "",
    
    type: "received",
    category: "",
    date: "",
    note: "",
    photoUrl: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl("");
      return;
    }

    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      setPreviewUrl(fileReader.result);
    };
    fileReader.readAsDataURL(photoFile);
  }, [photoFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPhotoFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      setPhotoFile(null);
      setPreviewUrl("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      setPhotoFile(null);
      setPreviewUrl("");
      return;
    }

    setError("");
    setPhotoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.amount || !form.date) {
      setError("Title, amount, and date are required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append(
  "Name",
  form.Name
);
      formData.append("amount", String(Number(form.amount)));
      formData.append("type", form.type);
      formData.append("category", form.category);
      formData.append("date", form.date);
      formData.append("note", form.note);
      formData.append("photoUrl", form.photoUrl);

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      await apiRequest("/transactions", {
        method: "POST",
        body: formData,
      });

      await fetchTransactions();
      navigate("/reports");
    } catch (err) {
      setError(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={themedCard(settings)}>
      <h1 style={styles.pageTitle}>Add Transaction</h1>

      <input
        style={styles.input}
        placeholder="Name"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <input
        style={styles.input}
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />
      
      <select
        style={styles.input}
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="received">Money Received</option>
        <option value="sent">Money Sent</option>
      </select>

      <input
        style={styles.input}
        placeholder="Category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      />

      <input
        style={styles.input}
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />

      <textarea
        style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
        placeholder="Note"
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />

      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="photo-upload" style={{ fontWeight: 600 }}>
          Upload Photo
        </label>
        <input
          id="photo-upload"
          style={styles.input}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {previewUrl ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Preview</p>
          <img
            src={previewUrl}
            alt="Transaction preview"
            style={{
              width: 220,
              maxWidth: "100%",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              objectFit: "cover",
            }}
          />
        </div>
      ) : null}

      <input
        style={styles.input}
        placeholder="Or paste Photo URL (optional)"
        value={form.photoUrl}
        onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
      />

      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}

function ReportsPage() {
  const { transactions, deleteTransaction, loading, setLoading, settings } = useApp();
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  const pieData = useMemo(() => {
    const received = transactions
      .filter((item) => item.type === "received")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const sent = transactions
      .filter((item) => item.type === "sent")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return [
      { name: "Received", value: received },
      { name: "Sent", value: sent },
    ];
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const grouped = {};

    transactions.forEach((item) => {
      if (!item.date) return;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;

      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      });

      if (!grouped[sortKey]) {
        grouped[sortKey] = {
          sortKey,
          month: label,
          received: 0,
          sent: 0,
        };
      }

      if (item.type === "received") {
        grouped[sortKey].received += Number(item.amount || 0);
      } else if (item.type === "sent") {
        grouped[sortKey].sent += Number(item.amount || 0);
      }
    });

    return Object.values(grouped).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  const yearlyData = useMemo(() => {
    const grouped = {};

    transactions.forEach((item) => {
      if (!item.date) return;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;

      const year = String(date.getFullYear());

      if (!grouped[year]) {
        grouped[year] = {
          year,
          received: 0,
          sent: 0,
        };
      }

      if (item.type === "received") {
        grouped[year].received += Number(item.amount || 0);
      } else if (item.type === "sent") {
        grouped[year].sent += Number(item.amount || 0);
      }
    });

    return Object.values(grouped).sort((a, b) => a.year.localeCompare(b.year));
  }, [transactions]);

  const handleDelete = async (id) => {
    setError("");
    setLoading(true);

    try {
      await deleteTransaction(id);
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#16a34a", "#dc2626"];

  return (
    <div>
      <h1 style={styles.pageTitle}>Reports</h1>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <div style={themedCard(settings)}>
          <h3 style={styles.sectionTitle}>Received vs Sent</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 80 : 100}
                  label={!isMobile}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={themedCard(settings)}>
          <h3 style={styles.sectionTitle}>Monthly Usage</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="received" fill="#16a34a" name="Received" />
                <Bar dataKey="sent" fill="#dc2626" name="Sent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={themedCard(settings)}>
        <h3 style={styles.sectionTitle}>Yearly Usage</h3>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="received" fill="#16a34a" name="Received" />
              <Bar dataKey="sent" fill="#dc2626" name="Sent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...themedCard(settings), marginTop: 20 }}>
        <h3 style={styles.sectionTitle}>All Transactions</h3>

        {transactions.length === 0 ? (
          <p style={styles.paragraph}>No transactions available.</p>
        ) : (
          transactions.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.reportItem,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <p style={styles.mutedSmall}>
                  {item.category || "-"} • {item.date || "-"} • {item.type}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <span style={{ color: item.type === "received" ? "green" : "crimson" }}>
                  {formatCurrency(item.amount, settings.currency)}
                </span>

                <Link to={`/entry-details/${item.id}`} style={styles.linkButton}>
                  View
                </Link>

                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(item.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EntryDetailsPage() {
  const { id } = useParams();
  const { transactions, settings } = useApp();

  const item = transactions.find((t) => String(t.id) === String(id));

  if (!item) {
    return (
      <div style={themedCard(settings)}>
        <h1 style={styles.pageTitle}>Entry Details</h1>
        <p style={styles.paragraph}>Transaction not found.</p>
      </div>
    );
  }

  return (
    <div style={themedCard(settings)}>
      <h1 style={styles.pageTitle}>Entry Details</h1>
      <p style={styles.paragraph}><strong>Title:</strong> {item.title}</p>
      <p style={styles.paragraph}>
        <strong>Amount:</strong> {formatCurrency(item.amount, settings.currency)}
      </p>
      <p style={styles.paragraph}><strong>Type:</strong> {item.type}</p>
      <p style={styles.paragraph}><strong>Category:</strong> {item.category || "-"}</p>
      <p style={styles.paragraph}><strong>Date:</strong> {item.date || "-"}</p>
      <p style={styles.paragraph}><strong>Note:</strong> {item.note || "-"}</p>
      {item.photo ? (
        <img
          src={item.photo}
          alt={item.title}
          style={{ maxWidth: "100%", width: 320, borderRadius: 12, marginTop: 10 }}
        />
      ) : null}
    </div>
  );
}

function SettingsPage() {
  const { settings, saveSettings, setLoading, loading } = useApp();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const updated = await saveSettings(form);
      setForm(updated);
      setMessage("Settings saved successfully");
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={themedCard(settings)}>
      <h1 style={styles.pageTitle}>Settings</h1>

      <label>Business Name</label>
      <input
        style={styles.input}
        value={form.businessName || ""}
        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
      />

      <label>Currency</label>
      <select
        style={styles.input}
        value={form.currency || "INR"}
        onChange={(e) => setForm({ ...form, currency: e.target.value })}
      >
        <option value="INR">INR</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>

      <label>Theme</label>
      <select
        style={styles.input}
        value={form.theme || "light"}
        onChange={(e) => setForm({ ...form, theme: e.target.value })}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      {message ? <p style={styles.success}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}

function ProfilePage() {
  const { user, settings, updateProfile, setLoading, loading } = useApp();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user?.name || "",
      email: user?.email || "",
    }));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await updateProfile(form);
      setMessage("Profile updated successfully");
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={themedCard(settings)}>
      <h1 style={styles.pageTitle}>Profile</h1>

      <input
        style={styles.input}
        value={form.name}
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <input
        style={styles.input}
        value={form.email}
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        style={styles.input}
        type="password"
        value={form.password}
        placeholder="New Password (optional)"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      {message ? <p style={styles.success}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update Profile"}
      </button>
    </form>
  );
}

function BackupExportPage() {
  const { exportBackup, importBackup, setLoading, loading, settings } = useApp();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");
    setLoading(true);

    try {
      await importBackup(file);
      setMessage("Backup imported successfully");
      e.target.value = "";
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await exportBackup();
      setMessage("Backup exported successfully");
    } catch (err) {
      setError(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={themedCard(settings)}>
      <h1 style={styles.pageTitle}>Backup & Export</h1>

      <button style={styles.buttonPrimary} onClick={handleExport} disabled={loading}>
        {loading ? "Exporting..." : "Export Backup JSON"}
      </button>

      <div style={{ marginTop: 12 }}>
        <label>Import Backup JSON</label>
        <input
          style={styles.input}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
        />
      </div>

      {message ? <p style={styles.success}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}
    </div>
  );
}

function StatCard({ label, value, settings }) {
  return (
    <div style={themedStatCard(settings)}>
      <p style={styles.muted}>{label}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

function themedCard(settings = getDefaultSettings()) {
  const isDark = settings.theme === "dark";
  return {
    ...styles.card,
    background: isDark ? "#1e293b" : "#fff",
    color: isDark ? "#f8fafc" : "#111827",
  };
}

function themedStatCard(settings = getDefaultSettings()) {
  const isDark = settings.theme === "dark";
  return {
    ...styles.statCard,
    background: isDark ? "#1e293b" : "#fff",
    color: isDark ? "#f8fafc" : "#111827",
  };
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/add-transaction" element={<AddTransactionPage />} />
          <Route path="/transactions/:id" element={<TransactionDetails />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/entry-details/:id" element={<EntryDetailsPage />} />
          
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/backup-export" element={<BackupExportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

const styles = {
  centerPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f4f7fb",
    padding: 20,
  },
  appShell: {
    minHeight: "100vh",
    display: "grid",
  },
  sidebar: {
    background: "#111827",
    color: "#fff",
    padding: 20,
  },
  sidebarMuted: {
    color: "#cbd5e1",
  },
  mainContent: {
    padding: 24,
    width: "100%",
    overflowX: "hidden",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    display: "grid",
    gap: 12,
    width: "100%",
  },
  authCard: {
    maxWidth: 420,
  },
  cardLarge: {
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    maxWidth: 600,
    textAlign: "center",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    minHeight: 44,
  },
  buttonPrimary: {
    background: "#2563eb",
    color: "#fff",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    minHeight: 44,
  },
  buttonSecondary: {
    background: "#e5e7eb",
    color: "#111827",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    minHeight: 44,
  },
  deleteBtn: {
    background: "#dc2626",
    color: "#fff",
    padding: "10px 12px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    minHeight: 44,
  },
  navLink: {
    color: "#d1d5db",
    textDecoration: "none",
    padding: "12px 12px",
    borderRadius: 10,
    display: "block",
    minHeight: 44,
  },
  navLinkActive: {
    background: "#2563eb",
    color: "#fff",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  },
  reportItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
    gap: 12,
  },
  muted: {
    color: "#6b7280",
    margin: 0,
  },
  mutedSmall: {
    color: "#6b7280",
    fontSize: 14,
    margin: "4px 0 0",
  },
  error: {
    color: "#dc2626",
    margin: 0,
  },
  success: {
    color: "green",
    margin: 0,
  },
  linkButton: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "bold",
  },
  pageTitle: {
    marginTop: 0,
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 8,
  },
  paragraph: {
    margin: 0,
  },
};