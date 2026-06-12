import api from "./api";
import { offlineDB } from "./offlineQueue";
import { localCache } from "./storage";

async function updateTransactionEverywhere(id, updates) {
  const cached = localCache.getTransactions() || [];

  const updatedList = cached.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );

  localCache.saveTransactions(updatedList);

  const updatedItem = updatedList.find((item) => item.id === id);

  if (updatedItem) {
    await offlineDB.saveTransaction(updatedItem);
  }

  return updatedItem;
}

export async function processPendingActions() {
  if (!navigator.onLine) return;

  const actions = await offlineDB.getPendingActions();

  for (const action of actions) {
    try {
      if (action.type === "ADD_TRANSACTION") {
        const response = await api.post("/transactions", action.payload);

        await updateTransactionEverywhere(action.localId, {
          syncStatus: "synced",
          syncedAt: new Date().toISOString(),
          errorMessage: null,
          lastSyncAttemptAt: new Date().toISOString(),
          serverId:
            response?.data?.transaction?._id ||
            response?.data?.data?._id ||
            response?.data?._id ||
            null,
          serverData: response?.data || null,
        });

        await offlineDB.removePendingAction(action.id);
      }
    } catch (error) {
      await updateTransactionEverywhere(action.localId, {
        syncStatus: "failed",
        errorMessage:
          error?.response?.data?.message ||
          error?.message ||
          "Sync failed",
        lastSyncAttemptAt: new Date().toISOString(),
      });
    }
  }
}

export function startQueueSync() {
  window.addEventListener("online", () => {
    processPendingActions();
  });

  processPendingActions();
}