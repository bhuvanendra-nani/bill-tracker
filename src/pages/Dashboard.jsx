import { useEffect, useState } from "react";
import api from "../services/api";
import SimpleCalculator from "../components/SimpleCalculator";

const Dashboard = () => {
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalGiven: 0,
    netBalance: 0,
    totalEntries: 0,
    totalPeople: 0,
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const summaryRes = await api.get("/reports/summary");
        const monthlyRes = await api.get("/reports/monthly");
        const peopleRes = await api.get("/people/summary");

        setSummary({
          ...summaryRes.data,
          totalPeople: peopleRes.data.length,
        });

        setMonthlyData(monthlyRes.data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <h2 className="p-6 text-xl">Loading dashboard...</h2>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-green-100 p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Total Received</h2>
          <p className="text-2xl font-bold text-green-700">₹{summary.totalReceived}</p>
        </div>

        <div className="bg-red-100 p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Total Given</h2>
          <p className="text-2xl font-bold text-red-700">₹{summary.totalGiven}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Net Balance</h2>
          <p className="text-2xl font-bold text-blue-700">₹{summary.netBalance}</p>
        </div>

        <div className="bg-yellow-100 p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Total Entries</h2>
          <p className="text-2xl font-bold text-yellow-700">{summary.totalEntries}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Monthly Report</h2>

          {monthlyData.length === 0 ? (
            <p>No monthly data found.</p>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{item.month}</p>
                    <p className="text-sm text-gray-600">
                      Entries: {item.totalEntries}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-green-600">Received: ₹{item.totalReceived}</p>
                    <p className="text-red-600">Given: ₹{item.totalGiven}</p>
                    <p className="text-blue-600 font-semibold">
                      Net: ₹{item.netBalance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-1">
          <SimpleCalculator />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;