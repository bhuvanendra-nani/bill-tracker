function AddTransactionPage() {
  const { settings, setLoading, loading, fetchTransactions } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    personName: "",
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

    if (
      !form.title ||
      !form.personName ||
      !form.amount ||
      !form.date
    ) {
      setError(
        "Title, person name, amount and date are required"
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("personName", form.personName);
      formData.append("amount", String(Number(form.amount)));
      formData.append("type", form.type);
      formData.append("category", form.category);
      formData.append("date", form.date);
      formData.append("dueDate", form.dueDate);
      formData.append("status", form.status);
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
        placeholder="Transaction Title"
        value={form.title}
        onChange={(e) =>
          setForm({
            ...form,
            title: e.target.value,
          })
        }
      />

      <input
        style={styles.input}
        placeholder="Person Name"
        value={form.personName}
        onChange={(e) =>
          setForm({
            ...form,
            personName: e.target.value,
          })
        }
      />

      <input
        style={styles.input}
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={(e) =>
          setForm({
            ...form,
            amount: e.target.value,
          })
        }
      />

      <select
        style={styles.input}
        value={form.type}
        onChange={(e) =>
          setForm({
            ...form,
            type: e.target.value,
          })
        }
      >
        <option value="received">Money Received</option>
        <option value="sent">Money Sent</option>
      </select>

      <input
        style={styles.input}
        placeholder="Category"
        value={form.category}
        onChange={(e) =>
          setForm({
            ...form,
            category: e.target.value,
          })
        }
      />

      <label>Date</label>

      <input
        style={styles.input}
        type="date"
        value={form.date}
        onChange={(e) =>
          setForm({
            ...form,
            date: e.target.value,
          })
        }
      />

      <label>Due Date</label>

      <input
        style={styles.input}
        type="date"
        value={form.dueDate}
        onChange={(e) =>
          setForm({
            ...form,
            dueDate: e.target.value,
          })
        }
      />

      <label>Status</label>

      <select
        style={styles.input}
        value={form.status}
        onChange={(e) =>
          setForm({
            ...form,
            status: e.target.value,
          })
        }
      >
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
      </select>

      <textarea
        style={{
          ...styles.input,
          minHeight: 100,
          resize: "vertical",
        }}
        placeholder="Note"
        value={form.note}
        onChange={(e) =>
          setForm({
            ...form,
            note: e.target.value,
          })
        }
      />

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        <label
          htmlFor="photo-upload"
          style={{
            fontWeight: 600,
          }}
        >
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
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 600,
            }}
          >
            Preview
          </p>

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
        onChange={(e) =>
          setForm({
            ...form,
            photoUrl: e.target.value,
          })
        }
      />

      {error ? (
        <p style={styles.error}>
          {error}
        </p>
      ) : null}

      <button
        style={styles.buttonPrimary}
        type="submit"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}