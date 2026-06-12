const TX_KEY = "bill_tracker_cached_transactions";
const SETTINGS_KEY = "bill_tracker_cached_settings";
const LAST_SYNC_KEY = "bill_tracker_last_sync";

export const localCache = {
  getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(TX_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveTransactions(data) {
    localStorage.setItem(TX_KEY, JSON.stringify(data));
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        businessName: "Bill Tracker",
        currency: "INR",
        theme: "light",
      };
    } catch {
      return {
        businessName: "Bill Tracker",
        currency: "INR",
        theme: "light",
      };
    }
  },

  saveSettings(data) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  },

  getLastSync() {
    return localStorage.getItem(LAST_SYNC_KEY) || "";
  },

  setLastSync(value) {
    localStorage.setItem(LAST_SYNC_KEY, value);
  },
};