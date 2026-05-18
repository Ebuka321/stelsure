type ReactivityPanelProps = {
  triggerTxHash?: `0x${string}`;
  rainfallTarget?: bigint;
  active: boolean;
  expectsPayout: boolean;
  elapsedMs: number;
  oracleLatencyMs?: number;
  payoutLatencyMs?: number;
};

function formatLatency(value?: number) {
  if (value === undefined) {
    return "--";
  }

  return `${value.toLocaleString()} ms`;
}

export function ReactivityPanel({
  triggerTxHash,
  rainfallTarget,
  active,
  expectsPayout,
  elapsedMs,
  oracleLatencyMs,
  payoutLatencyMs,
}: ReactivityPanelProps) {
  const headlineMetric = payoutLatencyMs ?? oracleLatencyMs ?? (active ? elapsedMs : undefined);
  const statusLabel = payoutLatencyMs !== undefined
    ? "Payout settled on-chain"
    : oracleLatencyMs !== undefined
      ? expectsPayout
        ? "Awaiting payout event"
        : "Oracle update reflected"
      : active
        ? "Watching validator callback"
        : "Ready for the next weather event";

  return (
    <div className="card wide-card reactivity-card">
      <div className="label">Automated Distribution Speed</div>
      <div className="reactivity-header">
        <div className="metric">{headlineMetric !== undefined ? formatLatency(headlineMetric) : "Live"}</div>
        <div className={`pill ${payoutLatencyMs !== undefined ? "" : active ? "warning" : ""}`}>{statusLabel}</div>
      </div>
      <div className="reactivity-grid">
        <div className="reactivity-stage">
          <div className="label">1. Weather tx</div>
          <div className="reactivity-value mono">
            {triggerTxHash ? `${triggerTxHash.slice(0, 10)}...${triggerTxHash.slice(-6)}` : "Waiting for owner action"}
          </div>
        </div>
        <div className="reactivity-stage">
          <div className="label">2. Oracle reflected</div>
          <div className="reactivity-value">{formatLatency(oracleLatencyMs)}</div>
        </div>
        <div className="reactivity-stage">
          <div className="label">3. Payout observed</div>
          <div className="reactivity-value">
            {expectsPayout ? formatLatency(payoutLatencyMs) : rainfallTarget !== undefined ? "Not expected" : "--"}
          </div>
        </div>
      </div>
      <div className="status-row">
        <div className="pill">Target rainfall {rainfallTarget !== undefined ? `${rainfallTarget.toString()} mm` : "--"}</div>
        <div className={`pill ${expectsPayout ? "warning" : ""}`}>
          {expectsPayout ? "Threshold breach should auto-settle" : "Below threshold, refresh only"}
        </div>
      </div>
    </div>
  );
}
