import { offlineDB } from "./offlineQueue";
import { localCache } from "./storage";

const API_URL = import.meta.env.VITE_API_URL;

export async function syncPendingActions(token) {
  const actions = await offlineDB.getPendingActions();

  for (const action of actions) {
    try {
      if (action.type === "ADD_TRANSACTION") {
        const formData = new FormData();

        Object.entries(action.payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });

        await fetch(`${API_URL}/transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }

      if (action.type === "DELETE_TRANSACTION") {
        await fetch(`${API_URL}/transactions/${action.payload.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      await offlineDB.removePendingAction(action.id);
    } catch (error) {
      console.error("Sync failed for action", action.id, error);
    }
  }

  localCache.setLastSync(new Date().toISOString());
}