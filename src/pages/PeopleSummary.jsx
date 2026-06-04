import {
  useEffect,
  useState,
} from "react";

import {
  getPeopleSummary,
} from "../services/people";

const PeopleSummary = () => {
  const [people, setPeople] =
    useState([]);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople =
    async () => {
      try {
        const data =
          await getPeopleSummary();

        setPeople(data);
      } catch (err) {
        console.error(err);
      }
    };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        People Summary
      </h1>

      <div className="grid gap-4">
        {people.map((person) => (
          <div
            key={person.name}
            className="bg-white rounded-xl shadow p-4"
          >
            <h2 className="font-bold text-xl">
              {person.name}
            </h2>

            <p className="text-green-600">
              Received ₹
              {person.received}
            </p>

            <p className="text-red-600">
              Sent ₹
              {person.sent}
            </p>

            <p className="font-bold text-blue-600">
              Balance ₹
              {person.balance}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeopleSummary;