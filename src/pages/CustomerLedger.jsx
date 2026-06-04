import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function CustomerLedger() {
  const { name } = useParams();

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    try {
      const res = await api.get(
        `/transactions/person/${name}`
      );

      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {name}
      </h1>

      {transactions.map((t) => (
        <div
          key={t._id}
          className="border p-3 mb-2 rounded"
        >
          <p>{t.date}</p>
          <p>{t.type}</p>
          <p>₹{t.amount}</p>
        </div>
      ))}
    </div>
  );
}