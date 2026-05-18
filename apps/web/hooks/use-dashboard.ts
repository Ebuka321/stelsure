"use client";

import { useEffect, useState, useTransition } from "react";
import { loadDashboardSnapshot, watchDashboardEvents } from "@/lib/streams";
import { normalizeAppError } from "@/lib/errors";
import type { PayoutRecord, PolicyRecord, ReactivityStatus, WeatherSnapshot } from "@/lib/types";

export function useDashboard() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot>({ rainfall: 0n, breached: false });
  const [vaultBalance, setVaultBalance] = useState<bigint>(0n);
  const [reactivity, setReactivity] = useState<ReactivityStatus>({
    oracleRainfall: 0n,
    reactiveRainfall: 0n,
    inSync: true,
    vaultShortfall: 0n,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    try {
      setError(null);
      const snapshot = await loadDashboardSnapshot();
      setPolicies(snapshot.policies);
      setPayouts(snapshot.payouts);
      setWeather(snapshot.weather);
      setVaultBalance(snapshot.vaultBalance);
      setReactivity(snapshot.reactivity);
    } catch (refreshError) {
      setError(normalizeAppError(refreshError, "Failed to load dashboard data."));
    }
  }

  useEffect(() => {
    startTransition(() => {
      void refresh();
    });

    const stopWatching = watchDashboardEvents(() => {
      startTransition(() => {
        void refresh();
      });
    });

    return stopWatching;
  }, []);

  return { policies, payouts, weather, vaultBalance, reactivity, error, isPending, refresh };
}
