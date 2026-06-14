import { formatAddress, formatToken } from "@/lib/format";
import type { PolicyRecord } from "@/lib/types";

type PolicyListProps = {
  policies: PolicyRecord[];
  highlightedPolicyId?: number;
  transitionMs?: number;
};

function formatLatency(value?: number) {
  if (value === undefined) {
    return null;
  }

  return `${value.toLocaleString()} ms`;
}

export function PolicyList({ policies, highlightedPolicyId, transitionMs }: PolicyListProps) {
  return (
    <div className="card full-card">
      <div className="panel-head">
        <div>
          <h2>Your Policies</h2>
          <p>Live on-chain policy positions and settlement status.</p>
        </div>
      </div>
      {policies.length === 0 ? (
        <p className="inline-message">No policies yet. Buy the first policy to start the demo.</p>
      ) : (
        <div className="list">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className={`policy-row ${policy.id === highlightedPolicyId ? "policy-row-reactive" : ""}`}
            >
              <div className="policy-row-left">
                <div className={`policy-status-icon ${policy.active ? "" : "inactive"}`}>{policy.active ? "A" : "S"}</div>
                <div className="policy-meta">
                  <div className="policy-title-row">
                    <strong>{`Policy #${policy.id + 1}`}</strong>
                    <span className={`table-badge ${policy.active ? "active" : "settled"} ${policy.active ? "" : "inactive"}`}>
                      {policy.active ? "Active" : "Settled"}
                    </span>
                    {policy.id === highlightedPolicyId && transitionMs !== undefined ? (
                      <span className="table-badge reactive">{`Updated in ${formatLatency(transitionMs)}`}</span>
                    ) : null}
                  </div>
                  <span className="policy-caption">{`Farmer wallet ${formatAddress(policy.user)}`}</span>
                </div>
              </div>
              <div className="policy-sidecar">
                <div className="policy-kpis">
                  <div className="policy-kpi">
                    <span className="policy-kpi-label">Premium</span>
                    <span className="policy-value">{formatToken(policy.premium)}</span>
                  </div>
                  <div className="policy-kpi">
                    <span className="policy-kpi-label">Payout</span>
                    <span className="policy-value">{formatToken(policy.payout)}</span>
                  </div>
                  <div className="policy-kpi">
                    <span className="policy-kpi-label">Trigger</span>
                    <span className="policy-value">{`${policy.threshold.toString()} mm`}</span>
                  </div>
                </div>
                <span className="policy-caption">
                  {policy.active
                    ? "Covered against flood conditions and waiting for threshold breach."
                    : "Settlement completed and payout has already been executed."}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
