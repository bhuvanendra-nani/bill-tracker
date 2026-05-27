import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useNavigate,
  useLocation,
  useParams,
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

const API_BASE_URL = "/api";

const AppContext = createContext();

const useApp = () => useContext(AppContext);

function getStoredToken() {
  return localStorage.getItem("bill_token") || "";
}

async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bill_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => getStoredToken());
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({
    businessName: "Bill Manager",
    currency: "INR",
    theme: "light",
  });
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

        setUser(profileData.user || profileData);
        setSettings(settingsData.settings || settingsData);
        setTransactions(
          Array.isArray(transactionsData)
            ? transactionsData
            : transactionsData.transactions || []
        );
      } catch (error) {
        console.error(error);
        setUser(null);
        setToken("");
        setTransactions([]);
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

    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const login = async ({ email, password }) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setTransactions([]);
    setSettings({
      businessName: "Bill Manager",
      currency: "INR",
      theme: "light",
    });
  };

  const fetchTransactions = async () => {
    const data = await apiRequest("/transactions");
    setTransactions(Array.isArray(data) ? data : data.transactions || []);
  };

  const addTransaction = async (payload) => {
    const data = await apiRequest("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const newItem = data.transaction || data;
    setTransactions((prev) => [newItem, ...prev]);
    return newItem;
  };

  const deleteTransaction = async (id) => {
    await apiRequest(`/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const updateProfile = async (payload) => {
    const data = await apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setUser(data.user || data);
    return data.user || data;
  };

  const saveSettings = async (payload) => {
    const data = await apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const updated = data.settings || data;
    setSettings(updated);
    return updated;
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

  const refreshSettings = async () => {
    const data = await apiRequest("/settings");
    setSettings(data.settings || data);
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

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppContext.Provider>
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

function PageLoader({ text = "Loading..." }) {
  return (
    <div style={styles.centerPage}>
      <div style={styles.card}>
        <h2>{text}</h2>
      </div>
    </div>
  );
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
      <div style={styles.cardLarge}>
        <h1>Bill Manager</h1>
        <p>Track received and sent money with reports, settings, and backup.</p>
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
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2>Login</h2>

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

        <p>
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
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2>Register</h2>

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

        <p>
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
        background: settings.theme === "dark" ? "#0f172a" : "#f4f7fb",
        color: settings.theme === "dark" ? "#f8fafc" : "#111827",
      }}
    >
      <aside style={styles.sidebar}>
        <h2 style={{ marginBottom: 8 }}>{settings.businessName || "Bill Manager"}</h2>
        <p style={{ ...styles.muted, color: "#cbd5e1" }}>
          Hello, {user?.name || "User"}
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                ...styles.navLink,
                ...(location.pathname === link.to ? styles.navLinkActive : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          style={{ ...styles.buttonSecondary, marginTop: 20 }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <main style={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}

function DashboardPage() {
  const { dashboardStats, transactions } = useApp();

  return (
    <div>
      <h1>Dashboard</h1>

      <div style={styles.grid3}>
        <StatCard label="Total Received" value={`₹${dashboardStats.totalReceived}`} />
        <StatCard label="Total Sent" value={`₹${dashboardStats.totalSent}`} />
        <StatCard label="Balance" value={`₹${dashboardStats.balance}`} />
      </div>

      <div style={{ ...styles.card, marginTop: 20 }}>
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          transactions.slice(0, 5).map((item) => (
            <div key={item.id} style={styles.rowBetween}>
              <div>
                <strong>{item.title}</strong>
                <p style={styles.mutedSmall}>{item.date}</p>
              </div>
              <div style={{ color: item.type === "received" ? "green" : "crimson" }}>
                {item.type === "received" ? "+" : "-"} ₹{item.amount}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddTransactionPage() {
  const { addTransaction, setLoading, loading } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "received",
    category: "",
    date: "",
    note: "",
    photo: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await addTransaction({
        ...form,
        amount: Number(form.amount),
      });
      navigate("/reports");
    } catch (err) {
      setError(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h1>Add Transaction</h1>

      <input
        style={styles.input}
        placeholder="Title"
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
        style={styles.input}
        placeholder="Note"
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />

      <input
        style={styles.input}
        placeholder="Photo URL (optional)"
        value={form.photo}
        onChange={(e) => setForm({ ...form, photo: e.target.value })}
      />

      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}

function ReportsPage() {
  const { transactions, deleteTransaction, loading, setLoading } = useApp();
  const [error, setError] = useState("");

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
      <h1>Reports</h1>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <div style={styles.card}>
          <h3>Received vs Sent</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
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

        <div style={styles.card}>
          <h3>Monthly Usage</h3>
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

      <div style={styles.card}>
        <h3>Yearly Usage</h3>
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

      <div style={{ ...styles.card, marginTop: 20 }}>
        <h3>All Transactions</h3>

        {transactions.length === 0 ? (
          <p>No transactions available.</p>
        ) : (
          transactions.map((item) => (
            <div key={item.id} style={styles.reportItem}>
              <div>
                <strong>{item.title}</strong>
                <p style={styles.mutedSmall}>
                  {item.category} • {item.date} • {item.type}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: item.type === "received" ? "green" : "crimson" }}>
                  ₹{item.amount}
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
  const { transactions } = useApp();

  const item = transactions.find((t) => String(t.id) === String(id));

  if (!item) {
    return (
      <div style={styles.card}>
        <h1>Entry Details</h1>
        <p>Transaction not found.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h1>Entry Details</h1>
      <p><strong>Title:</strong> {item.title}</p>
      <p><strong>Amount:</strong> ₹{item.amount}</p>
      <p><strong>Type:</strong> {item.type}</p>
      <p><strong>Category:</strong> {item.category || "-"}</p>
      <p><strong>Date:</strong> {item.date}</p>
      <p><strong>Note:</strong> {item.note || "-"}</p>
      {item.photo ? (
        <img
          src={item.photo}
          alt={item.title}
          style={{ maxWidth: 320, borderRadius: 12, marginTop: 10 }}
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
    <form onSubmit={handleSubmit} style={styles.card}>
      <h1>Settings</h1>

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

      {message ? <p style={{ color: "green" }}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}

function ProfilePage() {
  const { user, updateProfile, setLoading, loading } = useApp();
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
    <form onSubmit={handleSubmit} style={styles.card}>
      <h1>Profile</h1>

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

      {message ? <p style={{ color: "green" }}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <button style={styles.buttonPrimary} type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update Profile"}
      </button>
    </form>
  );
}

function BackupExportPage() {
  const { exportBackup, importBackup, setLoading, loading } = useApp();
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
    <div style={styles.card}>
      <h1>Backup & Export</h1>

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

      {message ? <p style={{ color: "green" }}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.muted}>{label}</p>
      <h2>{value}</h2>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/entry-details/:id" element={<EntryDetailsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/backup-export" element={<BackupExportPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
    gridTemplateColumns: "260px 1fr",
  },
  sidebar: {
    background: "#111827",
    color: "#fff",
    padding: 20,
  },
  mainContent: {
    padding: 24,
  },
  card: {
    background: "#fff",
    color: "#111827",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    display: "grid",
    gap: 12,
  },
  cardLarge: {
    background: "#fff",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    maxWidth: 600,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
  },
  buttonPrimary: {
    background: "#2563eb",
    color: "#fff",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  buttonSecondary: {
    background: "#e5e7eb",
    color: "#111827",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#dc2626",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  navLink: {
    color: "#d1d5db",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 10,
    display: "block",
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
    background: "#fff",
    color: "#111827",
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
  },
  mutedSmall: {
    color: "#6b7280",
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
  },
  linkButton: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "bold",
  },
};