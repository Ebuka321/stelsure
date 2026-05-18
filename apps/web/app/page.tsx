"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AIExplanationPanel } from "@/components/ai-explanation-panel";
import { AdminPanel } from "@/components/admin-panel";
import { Modal } from "@/components/modal";
import { PayoutHistory } from "@/components/payout-history";
import { PolicyForm } from "@/components/policy-form";
import { PolicyList } from "@/components/policy-list";
import { ReactivityPanel } from "@/components/reactivity-panel";
import { ReactivityStatusModal } from "@/components/reactivity-status-modal";
import { useDashboard } from "@/hooks/use-dashboard";
import { useWallet } from "@/hooks/use-wallet";
import { defaultExplanation } from "@/lib/ai";
import { appEnv, isConfigured } from "@/lib/env";
import { formatToken } from "@/lib/format";
import type { Explanation } from "@/lib/types";

type ReactivityRun = {
  triggerTxHash: `0x${string}`;
  rainfallTarget: bigint;
  baselinePayoutCount: number;
  startedAt: number;
  oracleLatencyMs?: number;
  payoutLatencyMs?: number;
};

const THRESHOLD = 100n;

const rainfallHistory = [
  { time: "06:00", value: 45 },
  { time: "09:00", value: 62 },
  { time: "12:00", value: 78 },
  { time: "15:00", value: 95 },
  { time: "18:00", value: 120 },
  { time: "21:00", value: 88 },
];

export default function HomePage() {
  const { account, connect, error: walletError, isPending: walletPending } = useWallet();
  const { policies, payouts, weather, vaultBalance, reactivity, error, isPending, refresh } = useDashboard();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "owner">("dashboard");
  const [reactivityRun, setReactivityRun] = useState<ReactivityRun | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dismissedStatusRun, setDismissedStatusRun] = useState<number | null>(null);
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const lastExplainedRef = useRef<string | null>(null);

  useEffect(() => {
    const latestPayout = payouts.at(-1);
    if (!latestPayout) {
      return;
    }

    const explanationKey = `${latestPayout.policyId.toString()}-${latestPayout.txHash ?? "pending"}`;
    if (lastExplainedRef.current === explanationKey) {
      return;
    }

    lastExplainedRef.current = explanationKey;

    void fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rainfall: weather.rainfall.toString(),
        threshold: THRESHOLD.toString(),
        payoutAmount: latestPayout.amount.toString(),
        policyId: latestPayout.policyId.toString(),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Explanation request failed.");
        }
        return response.json();
      })
      .then((payload: Explanation) => {
        setExplanation(payload);
      })
      .catch(() => {
        setExplanation(defaultExplanation);
      });
  }, [payouts, weather.rainfall]);

  useEffect(() => {
    if (!reactivityRun) {
      setElapsedMs(0);
      return;
    }

    setElapsedMs(Date.now() - reactivityRun.startedAt);

    const isComplete =
      reactivityRun.payoutLatencyMs !== undefined ||
      (reactivityRun.oracleLatencyMs !== undefined && reactivityRun.rainfallTarget < THRESHOLD);

    if (isComplete) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - reactivityRun.startedAt);
    }, 50);

    return () => {
      window.clearInterval(timer);
    };
  }, [reactivityRun]);

  useEffect(() => {
    if (!reactivityRun) {
      return;
    }

    if (reactivityRun.oracleLatencyMs === undefined && weather.rainfall === reactivityRun.rainfallTarget) {
      setReactivityRun((currentRun) => {
        if (!currentRun || currentRun.oracleLatencyMs !== undefined) {
          return currentRun;
        }

        return {
          ...currentRun,
          oracleLatencyMs: Date.now() - currentRun.startedAt,
        };
      });
    }
  }, [reactivityRun, weather.rainfall]);

  useEffect(() => {
    if (!reactivityRun || reactivityRun.payoutLatencyMs !== undefined) {
      return;
    }

    if (reactivityRun.rainfallTarget < THRESHOLD) {
      return;
    }

    if (payouts.length <= reactivityRun.baselinePayoutCount) {
      return;
    }

    setReactivityRun((currentRun) => {
      if (!currentRun || currentRun.payoutLatencyMs !== undefined) {
        return currentRun;
      }

      return {
        ...currentRun,
        payoutLatencyMs: Date.now() - currentRun.startedAt,
      };
    });
  }, [payouts.length, reactivityRun]);

  function handleWeatherSubmitted(payload: { hash: `0x${string}`; rainfall: bigint }) {
    setReactivityRun({
      triggerTxHash: payload.hash,
      rainfallTarget: payload.rainfall,
      baselinePayoutCount: payouts.length,
      startedAt: Date.now(),
    });
    setElapsedMs(0);
  }

  const expectsPayout = reactivityRun ? reactivityRun.rainfallTarget >= THRESHOLD : false;
  const reactivityActive = reactivityRun
    ? reactivityRun.payoutLatencyMs === undefined && (expectsPayout || reactivityRun.oracleLatencyMs === undefined)
    : false;
  const latestPayout = payouts.at(-1);
  const highlightedPolicyId =
    reactivityRun?.payoutLatencyMs !== undefined && latestPayout ? Number(latestPayout.policyId) : undefined;
  const walletLabel = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet";
  const networkLabel = `Stellar testnet ${appEnv.chainId}`;
  const activePolicyCount = policies.filter((policy) => policy.active).length;
  const settledPolicies = policies.filter((policy) => !policy.active);
  const totalPayoutValue = settledPolicies.reduce((sum, policy) => sum + Number(policy.payout) / 1e18, 0);
  const policyBecameInactive = reactivityRun ? activePolicyCount < reactivityRun.baselinePayoutCount + 1 : false;
  const statusModalOpen =
    Boolean(reactivityRun) &&
    dismissedStatusRun !== reactivityRun?.startedAt &&
    (reactivityActive || reactivityRun?.oracleLatencyMs !== undefined || reactivityRun?.payoutLatencyMs !== undefined);

  const globalError = [
    walletError,
    error,
    !reactivity.inSync
      ? `Oracle rainfall is ${reactivity.oracleRainfall.toString()} mm, but the distribution handler is still at ${reactivity.reactiveRainfall.toString()} mm. The automated smart contract distribution likely did not fire.`
      : null,
    reactivity.vaultShortfall > 0n
      ? `Vault is short by ${Number(reactivity.vaultShortfall) / 1e18} XLM for current active policies. Automated payouts will revert until the vault is topped up.`
      : null,
  ].find(Boolean) ?? null;

  useEffect(() => {
    if (!reactivityRun) {
      return;
    }

    setDismissedStatusRun(null);
  }, [reactivityRun?.startedAt]);

  useEffect(() => {
    if (globalError && globalError !== dismissedErrorKey) {
      return;
    }

    if (!globalError) {
      setDismissedErrorKey(null);
    }
  }, [dismissedErrorKey, globalError]);

  return (
    <div className="app-shell">
      <div className="ambient ambient-primary" />
      <div className="ambient ambient-secondary" />

      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark">S</div>
          <div>
            <h1>StelSure</h1>
            <p>StellarDAO Coverage</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="network-badge">
            <span className="network-dot" />
            {networkLabel}
          </div>
          <button className="ghost-button" type="button" onClick={connect} disabled={walletPending}>
            {walletPending ? "Connecting..." : walletLabel}
          </button>
        </div>
      </header>

      <div className="app-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "owner" ? "active" : ""}`}
          onClick={() => setActiveTab("owner")}
        >
          Owner Panel
        </button>
        <div className="tab-links">
          <Link href="/policies">Policies</Link>
          <Link href="/payouts">Payouts</Link>
        </div>
      </div>

      <main className="app-main">
        {activeTab === "dashboard" ? (
          <div className="dashboard-stack">
            {!isConfigured() ? (
              <p className="inline-message">Configure contract addresses in the environment to activate live reads.</p>
            ) : null}

            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-head">
                  <span className="stat-icon">S</span>
                  <span>Active Policies</span>
                </div>
                <div className="stat-value">{policies.filter((policy) => policy.active).length}</div>
              </article>
              <article className="stat-card">
                <div className="stat-head">
                  <span className="stat-icon">T</span>
                  <span>Total Premiums</span>
                </div>
                <div className="stat-value">{`${(policies.length * 0.1).toFixed(1)} XLM`}</div>
              </article>
              <article className="stat-card">
                <div className="stat-head">
                  <span className="stat-icon">Z</span>
                  <span>Total Payouts</span>
                </div>
                <div className="stat-value">{totalPayoutValue.toFixed(1)} XLM</div>
              </article>
              <article className="stat-card">
                <div className="stat-head">
                  <span className="stat-icon">R</span>
                  <span>Current Rainfall</span>
                </div>
                <div className="stat-value">{weather.rainfall.toString()} mm</div>
              </article>
            </section>

            <section className="content-grid">
              <div className="rainfall-card panel">
                <div className="panel-head">
                  <div>
                    <h3>Rainfall Monitor</h3>
                    <p>Live oracle data for the current demo region.</p>
                  </div>
                  <div className="outline-pill">Flood threshold: {THRESHOLD.toString()} mm</div>
                </div>

                <div className="rainfall-chart">
                  {rainfallHistory.map((point) => {
                    const overThreshold = point.value >= Number(THRESHOLD);
                    const height = `${(point.value / 140) * 100}%`;

                    return (
                      <div key={point.time} className="rainfall-bar-group">
                        <span className={`rainfall-bar-value ${overThreshold ? "danger" : ""}`}>{point.value}</span>
                        <div className={`rainfall-bar ${overThreshold ? "danger" : ""}`} style={{ height }} />
                        <span className="rainfall-bar-time">{point.time}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="threshold-line">
                  <span />
                  <p>Threshold breach triggers autonomous settlement</p>
                  <span />
                </div>
              </div>

              <PolicyForm account={account} onSuccess={refresh} />
            </section>

            <ReactivityPanel
              triggerTxHash={reactivityRun?.triggerTxHash}
              rainfallTarget={reactivityRun?.rainfallTarget}
              active={reactivityActive}
              expectsPayout={expectsPayout}
              elapsedMs={elapsedMs}
              oracleLatencyMs={reactivityRun?.oracleLatencyMs}
              payoutLatencyMs={reactivityRun?.payoutLatencyMs}
            />

            <PolicyList
              policies={policies}
              highlightedPolicyId={highlightedPolicyId}
              transitionMs={reactivityRun?.payoutLatencyMs}
            />
            <AIExplanationPanel explanation={explanation} />
          </div>
        ) : (
          <div className="owner-stack">
            <div className="owner-grid">
              <div className="owner-summary panel">
                <div className="panel-head">
                  <div>
                    <h3>Vault Readiness</h3>
                    <p>Capital available to cover automated payouts.</p>
                  </div>
                  <div className="outline-pill">Built on Stellar</div>
                </div>
                <div className="vault-metric">{formatToken(vaultBalance)}</div>
                <div className="vault-meter">
                  <div
                    className="vault-meter-fill"
                    style={{ width: `${Math.min(100, Number(vaultBalance) / 1e16)}%` }}
                  />
                </div>
                <p className="inline-message">
                  {vaultBalance > 0n
                    ? "Vault is funded and ready for automatic settlement."
                    : "Vault is empty. Prefund before triggering rainfall above threshold."}
                </p>
              </div>

              <AdminPanel account={account} onSuccess={refresh} onWeatherSubmitted={handleWeatherSubmitted} />
            </div>

            <PayoutHistory payouts={payouts} />

            <div className="panel contract-card">
              <div className="panel-head">
                <div>
                  <h3>Deployed Contracts</h3>
                  <p>StelSure testnet live addresses.</p>
                </div>
                <div className="outline-pill">Chain ID {appEnv.chainId}</div>
              </div>

              <div className="contract-list">
                <div className="contract-row">
                  <span>WeatherOracleMock</span>
                  <code>{appEnv.weatherOracleAddress ?? "Not configured"}</code>
                </div>
                <div className="contract-row">
                  <span>PolicyManager</span>
                  <code>{appEnv.policyManagerAddress ?? "Not configured"}</code>
                </div>
                <div className="contract-row">
                  <span>ReactiveArbitrator</span>
                  <code>{appEnv.reactiveArbitratorAddress ?? "Not configured"}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built on Stellar for automated DAO payouts</p>
        <div className="network-badge compact">
          <span className="network-dot" />
          Testnet Live
        </div>
      </footer>

      <Modal
        open={Boolean(globalError && dismissedErrorKey !== globalError)}
        onClose={() => {
          if (globalError) {
            setDismissedErrorKey(globalError);
          }
        }}
        title="Action Needed"
        tone="error"
        description="StelSure detected a blocking wallet, dashboard, or settlement issue."
      >
        <p className="modal-message">{globalError}</p>
      </Modal>

      <ReactivityStatusModal
        open={statusModalOpen}
        onClose={() => {
          if (reactivityRun) {
            setDismissedStatusRun(reactivityRun.startedAt);
          }
        }}
        weatherTxHash={reactivityRun?.triggerTxHash}
        payoutTxHash={latestPayout?.txHash}
        oracleLatencyMs={reactivityRun?.oracleLatencyMs}
        payoutLatencyMs={reactivityRun?.payoutLatencyMs}
        rainfallTarget={reactivityRun?.rainfallTarget}
        policyBecameInactive={policyBecameInactive}
        payoutObserved={Boolean(reactivityRun?.payoutLatencyMs !== undefined && latestPayout?.txHash)}
      />
    </div>
  );
}
