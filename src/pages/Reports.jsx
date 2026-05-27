import React, { useMemo } from "react";
import { Link } from "react-router-dom";
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

function ReportsPage() {
  const { transactions, deleteTransaction } = useApp();

  const pieData = useMemo(() => {
    const received = transactions
      .filter((item) => item.type === "received")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const sent = transactions
      .filter((item) => item.type === "sent")
      .reduce((sum, item) => sum + Number(item.amount), 0);

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

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[key]) {
        grouped[key] = {
          month: key,
          received: 0,
          sent: 0,
        };
      }

      if (item.type === "received") {
        grouped[key].received += Number(item.amount);
      } else if (item.type === "sent") {
        grouped[key].sent += Number(item.amount);
      }
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const yearlyData = useMemo(() => {
    const grouped = {};

    transactions.forEach((item) => {
      if (!item.date) return;

      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;

      const key = String(date.getFullYear());

      if (!grouped[key]) {
        grouped[key] = {
          year: key,
          received: 0,
          sent: 0,
        };
      }

      if (item.type === "received") {
        grouped[key].received += Number(item.amount);
      } else if (item.type === "sent") {
        grouped[key].sent += Number(item.amount);
      }
    });

    return Object.values(grouped).sort((a, b) => a.year.localeCompare(b.year));
  }, [transactions]);

  const COLORS = ["#16a34a", "#dc2626"];

  return (
    <div>
      <h1>Reports</h1>

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
            <ResponsiveContainer>
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
            <ResponsiveContainer>
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
          <ResponsiveContainer>
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

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: item.type === "received" ? "green" : "crimson" }}>
                  ₹{item.amount}
                </span>

                <Link to={`/entry-details/${item.id}`} style={styles.linkButton}>
                  View
                </Link>

                <button
                  style={styles.deleteBtn}
                  onClick={() => deleteTransaction(item.id)}
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