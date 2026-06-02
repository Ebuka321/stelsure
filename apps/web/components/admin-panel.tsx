"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { parseEther } from "viem";
import { ensureStellarChain, getWalletClient, publicClient } from "@/lib/clients";
import { policyManagerAbi, weatherOracleAbi } from "@/lib/contracts";
import { appEnv } from "@/lib/env";
import { normalizeAppError } from "@/lib/errors";

type AdminPanelProps = {
  account: `0x${string}` | null;
  onSuccess: () => Promise<void> | void;
  onWeatherSubmitted?: (payload: { hash: `0x${string}`; rainfall: bigint }) => void;
};

export function AdminPanel({ account, onSuccess, onWeatherSubmitted }: AdminPanelProps) {
  const [rainfall, setRainfall] = useState("150");
  const [fundAmount, setFundAmount] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwner =
    Boolean(account) && Boolean(appEnv.ownerAddress) && account?.toLowerCase() === appEnv.ownerAddress.toLowerCase();

  function prefundVault() {
    startTransition(async () => {
      try {
        if (!account || !isOwner) {
          throw new Error("Only the owner can prefund the vault.");
        }

        setError(null);
        await ensureStellarChain();
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
          account,
          address: appEnv.policyManagerAddress as `0x${string}`,
          abi: policyManagerAbi,
          functionName: "fundVault",
          value: parseEther(fundAmount),
        });

        await publicClient.waitForTransactionReceipt({ hash });
        await onSuccess();
      } catch (actionError) {
        setError(normalizeAppError(actionError, "Vault funding failed."));
      }
    });
  }

  function triggerWeather() {
    startTransition(async () => {
      try {
        if (!account || !isOwner) {
          throw new Error("Only the owner can trigger oracle updates.");
        }

        setError(null);
        await ensureStellarChain();
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
          account,
          address: appEnv.weatherOracleAddress as `0x${string}`,
          abi: weatherOracleAbi,
          functionName: "updateWeather",
          args: [BigInt(rainfall)],
        });

        onWeatherSubmitted?.({ hash, rainfall: BigInt(rainfall) });
        await publicClient.waitForTransactionReceipt({ hash });
        await onSuccess();
      } catch (actionError) {
        setError(normalizeAppError(actionError, "Weather update failed."));
      }
    });
  }

  return (
    <div className="card wide-card owner-panel-card">
      <div className="panel-head">
        <div>
          <h2>Operator Console</h2>
          <p>Manage liquidity and trigger a fresh rainfall event for the live StelSure demo.</p>
        </div>
        <div className="soft-pill">{isOwner ? "Owner connected" : "Read-only mode"}</div>
      </div>
      {!isOwner ? (
        <p className="inline-message">Connect the configured owner wallet to prefund the vault or emit rainfall updates.</p>
      ) : (
        <div className="admin-grid">
          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-mark">V</div>
              <div>
                <h4>Vault Management</h4>
                <p className="admin-helper">Top up the PolicyManager reserve before judges or farmers start testing payouts.</p>
              </div>
            </div>
            <div className="owner-actions">
              <label className="field">
                <span>Funding amount</span>
                <input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} />
              </label>
              <div className="admin-summary-band">
                <span className="policy-kpi-label">This action sends XLM directly into the payout vault.</span>
                <span className="policy-value">{`${fundAmount || "0"} XLM`}</span>
              </div>
              <div className="owner-action-row owner-action-row-full">
                <button className="secondary-button" type="button" onClick={prefundVault} disabled={isPending}>
                  {isPending ? "Waiting..." : `Fund vault with ${fundAmount || "0"} XLM`}
                </button>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-mark">R</div>
              <div>
                <h4>Weather Oracle</h4>
                <p className="admin-helper">Submit a fresh rainfall reading to trigger automated smart contract distribution.</p>
              </div>
            </div>
            <div className="owner-actions">
              <label className="field">
                <span>Rainfall reading</span>
                <input value={rainfall} onChange={(event) => setRainfall(event.target.value)} />
              </label>
              <div className="admin-summary-band">
                <span className="policy-kpi-label">Threshold</span>
                <span className="policy-value">100 mm</span>
              </div>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setRainfall("80")}>
                  Use 80 mm
                </button>
                <button className="ghost-button" type="button" onClick={() => setRainfall("120")}>
                  Use 120 mm
                </button>
              </div>
              <div className="owner-action-row owner-action-row-full">
                <button className="danger-button" type="button" onClick={triggerWeather} disabled={isPending}>
                  {isPending ? "Waiting..." : `Submit rainfall: ${rainfall} mm`}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      <Modal open={Boolean(error)} onClose={() => setError(null)} title="Owner Action Error" tone="error">
        <p className="modal-message">{error}</p>
      </Modal>
    </div>
  );
}
