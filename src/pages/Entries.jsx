import { useEffect, useState } from "react";
import api from "../services/api";

export default function Entries() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    person: "",
    amount: "",
    type: "received",
    date: "",
    note: "",
    billImage: "",
    voiceNote: ""
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/entries");
      setEntries(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBillUpload = async (file) => {
    const formData = new FormData();
    formData.append("bill", file);

    const res = await api.post("/upload/bill", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    setForm((prev) => ({ ...prev, billImage: res.data.filePath }));
  };

  const handleVoiceUpload = async (file) => {
    const formData = new FormData();
    formData.append("voice", file);

    const res = await api.post("/upload/voice", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    setForm((prev) => ({ ...prev, voiceNote: res.data.filePath }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/entries", {
        ...form,
        amount: Number(form.amount)
      });
      setForm({
        person: "",
        amount: "",
        type: "received",
        date: "",
        note: "",
        billImage: "",
        voiceNote: ""
      });
      fetchEntries();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save entry");
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/entries/${id}`);
    fetchEntries();
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>Entries</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px", maxWidth: "500px", marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Person Name"
          value={form.person}
          onChange={(e) => setForm({ ...form, person: e.target.value })}
        />
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="received">Received</option>
          <option value="given">Given</option>
        </select>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <textarea
          placeholder="Note"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <label>Upload Bill</label>
        <input type="file" onChange={(e) => handleBillUpload(e.target.files[0])} />
        <label>Upload Voice</label>
        <input type="file" onChange={(e) => handleVoiceUpload(e.target.files[0])} />
        <button type="submit">Save Entry</button>
      </form>

      <h2 style={{ marginTop: "30px" }}>All Entries</h2>
      <div style={{ marginTop: "10px" }}>
        {entries.map((item) => (
          <div key={item._id} style={{ background: "#fff", padding: "16px", marginBottom: "10px", borderRadius: "10px" }}>
            <p><strong>{item.person}</strong> - ₹ {item.amount}</p>
            <p>{item.type}</p>
            <p>{item.date}</p>
            <p>{item.note}</p>
            {item.billImage && (
              <a href={`http://localhost:5000${item.billImage}`} target="_blank" rel="noreferrer">
                View Bill
              </a>
            )}
            <br />
            {item.voiceNote && (
              <audio controls src={`http://localhost:5000${item.voiceNote}`}></audio>
            )}
            <br />
            <button onClick={() => handleDelete(item._id)} style={{ marginTop: "10px" }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}