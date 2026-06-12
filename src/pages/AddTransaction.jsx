// src/pages/AddTransaction.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const styles = {
  card: {
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    display: "grid",
    gap: 12,
    width: "100%",
    background: "#fff",
    color: "#111827",
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
  error: {
    color: "#dc2626",
    margin: 0,
  },
  pageTitle: {
    marginTop: 0,
    marginBottom: 8,
  },
};

export default function AddTransaction() {
  const navigate = useNavigate();
  const { addTransaction } = useApp();

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "received",
    category: "",
    date: "",
    dueDate: "",
    status: "completed",
    note: "",
    photoUrl: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (loading) return;

    setError("");

    const cleanTitle = form.title.trim();
    const cleanCategory = form.category.trim();
    const cleanNote = form.note.trim();
    const cleanPhotoUrl = form.photoUrl.trim();
    const numericAmount = Number(form.amount);

    if (!cleanTitle || !form.date || form.amount === "" || Number.isNaN(numericAmount)) {
      setError("Title, amount and date are required");
      return;
    }

    setLoading(true);

    const payload = {
      title: cleanTitle,
      amount: numericAmount,
      type: form.type,
      category: cleanCategory,
      date: form.date,
      dueDate: form.dueDate,
      status: form.status,
      note: cleanNote,
      photoUrl: cleanPhotoUrl,
    };

    try {
      await addTransaction(payload);

      alert("Transaction saved successfully");

      setForm({
        title: "",
        amount: "",
        type: "received",
        category: "",
        date: "",
        dueDate: "",
        status: "completed",
        note: "",
        photoUrl: "",
      });

      setPhotoFile(null);
      setPreviewUrl("");

      navigate("/reports");
    } catch (err) {
      console.error("Save failed:", err);
      setError(err?.message || "Could not save transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h1 style={styles.pageTitle}>Add Transaction</h1>

      <input
        style={styles.input}
        placeholder="Transaction Name"
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

      <label>Date</label>
      <input
        style={styles.input}
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />

      <label>Due Date</label>
      <input
        style={styles.input}
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />

      <label>Status</label>
      <select
        style={styles.input}
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
      >
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
      </select>

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