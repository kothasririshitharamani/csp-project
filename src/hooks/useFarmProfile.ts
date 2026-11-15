import { useCallback, useEffect, useState } from "react";
import { RecentActivityItem } from "../types/app";

const ACTIVITY_PREFIX = "swm_recent_activity_v1";

function getStorageKey(userId?: string | null): string {
  return userId ? `${ACTIVITY_PREFIX}_${userId}` : ACTIVITY_PREFIX;
}

export function useRecentActivity(userId?: string | null) {
  const storageKey = getStorageKey(userId);

  const [activities, setActivities] = useState<RecentActivityItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as RecentActivityItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setActivities(raw ? (JSON.parse(raw) as RecentActivityItem[]) : []);
    } catch {
      setActivities([]);
    }
  }, [storageKey]);

  const addActivity = useCallback(
    (item: Omit<RecentActivityItem, "id" | "createdAt">) => {
      const entry: RecentActivityItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      setActivities((prev) => {
        const updated = [entry, ...prev].slice(0, 8);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore storage failures
        }
        return updated;
      });
    },
    [storageKey]
  );

  const deleteActivity = useCallback(
    (id: string) => {
      setActivities((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore storage failures
        }
        return updated;
      });
    },
    [storageKey]
  );

  const clearActivities = useCallback(() => {
    setActivities([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures
    }
  }, [storageKey]);

  return {
    activities,
    addActivity,
    deleteActivity,
    clearActivities,
  };
}
