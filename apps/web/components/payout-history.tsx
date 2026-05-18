import { explorerTxUrl, formatAddress, formatToken } from "@/lib/format";
import type { PayoutRecord } from "@/lib/types";

export function PayoutHistory({ payouts }: { payouts: PayoutRecord[] }) {
  const orderedPayouts = [...payouts].reverse();

  return (
    <div className="card wide-card">
      <div className="panel-head">
        <div>
          <h2>Payout History</h2>
          <p>Recent reactive payouts observed on-chain.</p>
        </div>
      </div>
      {payouts.length === 0 ? (
        <p className="inline-message">No payouts have been triggered yet.</p>
      ) : (
        <div className="list">
          {orderedPayouts.map((payout) => (
            <div key={`${payout.policyId.toString()}-${payout.txHash ?? "nohash"}`} className="payout-row">
              <div className="payout-row-left">
                <div className="policy-status-icon">Z</div>
                <div className="payout-meta">
                  <div className="payout-title-row">
                    <strong>{`Policy #${Number(payout.policyId) + 1}`}</strong>
                    <span className="table-badge active">Paid</span>
                  </div>
                  <span className="payout-caption">{`Paid to ${formatAddress(payout.user)}`}</span>
                </div>
              </div>
              <div className="policy-sidecar">
                <div className="policy-kpis">
                  <div className="policy-kpi">
                    <span className="policy-kpi-label">Amount</span>
                    <span className="payout-value">{formatToken(payout.amount)}</span>
                  </div>
                  <div className="policy-kpi">
                    <span className="policy-kpi-label">Reason</span>
                    <span className="payout-value">Flood threshold breached</span>
                  </div>
                </div>
                {payout.txHash ? (
                  <a className="payout-link mono" href={explorerTxUrl(payout.txHash)} target="_blank" rel="noreferrer">
                    View payout on explorer
                  </a>
                ) : (
                  <span className="payout-caption mono">Pending transaction hash</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
