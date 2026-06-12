export default function StatCard({
  Name,
  value
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-sm text-gray-500">
        {Name}
      </h3>

      <p className="text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}