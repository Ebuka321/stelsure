import type { Explanation } from "@/lib/types";

export function AIExplanationPanel({ explanation }: { explanation: Explanation | null }) {
  return (
    <div className="card wide-card explanation-card">
      {!explanation ? (
        <div className="loading-spinner" />
        <p className="inline-message">The next payout event will generate an explanation here.</p>
      ) : (
        <div className="explanation-copy">
          <div className="explanation-mark">AI</div>
          <div className="stack">
            <p className="explanation-heading">AI Settlement Explanation</p>
            <div className="explanation-status-row">
              <div className={`soft-pill ${explanation.fallback ? "warning" : ""}`}>
                {explanation.fallback ? "Deterministic fallback" : "AI-generated summary"}
              </div>
              <div className="soft-pill">{explanation.label}</div>
            </div>
            <p className="muted">{explanation.reason}</p>
            {explanation.fallbackReason ? <p className="explanation-note">{explanation.fallbackReason}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
