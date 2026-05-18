"use client";

import { explorerTxUrl, formatAddress } from "@/lib/format";
import { Modal } from "@/components/modal";

type ReactivityStatusModalProps = {
  open: boolean;
  onClose: () => void;
  weatherTxHash?: `0x${string}`;
  payoutTxHash?: `0x${string}`;
  oracleLatencyMs?: number;
  payoutLatencyMs?: number;
  rainfallTarget?: bigint;
  policyBecameInactive: boolean;
  payoutObserved: boolean;
};

function formatLatency(value?: number) {
  if (value === undefined) {
    return "Watching live...";
  }

  return `${value.toLocaleString()} ms`;
}

export function ReactivityStatusModal({
  open,
  onClose,
  weatherTxHash,
  payoutTxHash,
  oracleLatencyMs,
  payoutLatencyMs,
  rainfallTarget,
  policyBecameInactive,
  payoutObserved,
}: ReactivityStatusModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone={payoutObserved ? "success" : "default"}
      title="Live Settlement Update"
      description="Track the automated flow as StelSure updates the oracle, settles the policy, and records payout proof."
    >
      <div className="status-checklist">
        <div className={`status-item ${oracleLatencyMs !== undefined ? "done" : "pending"}`}>
          <div className="status-marker">{oracleLatencyMs !== undefined ? "1" : "..."}</div>
          <div className="status-copy">
            <strong>Rainfall updated</strong>
            <p>
              {rainfallTarget !== undefined
                ? `Oracle submitted ${rainfallTarget.toString()} mm and the dashboard reflected it in ${formatLatency(oracleLatencyMs)}.`
                : "Waiting for a fresh oracle event."}
            </p>
            {weatherTxHash ? (
              <a className="modal-link" href={explorerTxUrl(weatherTxHash)} target="_blank" rel="noreferrer">
                Weather tx: {formatAddress(weatherTxHash)}
              </a>
            ) : null}
          </div>
        </div>

        <div className={`status-item ${policyBecameInactive ? "done" : "pending"}`}>
          <div className="status-marker">{policyBecameInactive ? "2" : "..."}</div>
          <div className="status-copy">
            <strong>Policy became inactive</strong>
            <p>
              {policyBecameInactive
                ? "The active policy has been settled on-chain and is no longer eligible for payout."
                : "Waiting for automated smart contract distribution to execute the settlement callback."}
            </p>
          </div>
        </div>

        <div className={`status-item ${payoutObserved ? "done" : "pending"}`}>
          <div className="status-marker">{payoutObserved ? "3" : "..."}</div>
          <div className="status-copy">
            <strong>Payout appeared in history</strong>
            <p>
              {payoutObserved
                ? `The payout event has been observed${payoutLatencyMs !== undefined ? ` in ${formatLatency(payoutLatencyMs)}` : ""}.`
                : "Waiting for the payout event to land on-chain and stream back to the dashboard."}
            </p>
            {payoutTxHash ? (
              <a className="modal-link" href={explorerTxUrl(payoutTxHash)} target="_blank" rel="noreferrer">
                Payout tx: {formatAddress(payoutTxHash)}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
