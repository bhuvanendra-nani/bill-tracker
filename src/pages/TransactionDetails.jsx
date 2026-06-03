import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import VoiceRecorder from "../components/VoiceRecorder";
import TransactionVoicePlayer from "../components/TransactionVoicePlayer";

export default function TransactionDetails() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await api.get(`/transactions/${id}`);
        setTransaction(res.data.transaction);
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  if (loading) {
    return <p>Loading transaction...</p>;
  }

  if (!transaction) {
    return <p>Transaction not found.</p>;
  }

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto", padding: "16px" }}>
      <h2>{transaction.title}</h2>
      <p><strong>Amount:</strong> {transaction.amount}</p>
      <p><strong>Type:</strong> {transaction.type}</p>
      <p><strong>Category:</strong> {transaction.category || "N/A"}</p>
      <p><strong>Date:</strong> {transaction.date}</p>
      <p><strong>Note:</strong> {transaction.note || "No note"}</p>

      {transaction.photo && (
        <div style={{ marginTop: "12px" }}>
          <p><strong>Bill Photo</strong></p>
          <img
            src={transaction.photo}
            alt={transaction.title}
            style={{ width: "220px", borderRadius: "8px" }}
          />
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h3>Record Voice Note</h3>
        <VoiceRecorder
          transactionId={transaction._id}
          onUploaded={(updatedTransaction) => {
            setTransaction(updatedTransaction);
          }}
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <TransactionVoicePlayer voiceNote={transaction.voiceNote} />
      </div>
    </div>
  );
}