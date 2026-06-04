import api from "./api";

export const getPeopleSummary =
  async () => {
    const res =
      await api.get(
        "/people/summary"
      );

    return res.data;
  };

export const getPersonLedger =
  async (name) => {
    const res =
      await api.get(
        `/people/${name}`
      );

    return res.data;
  };