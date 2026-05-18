"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { parseEther } from "viem";
import { ensureStellarChain, getWalletClient, publicClient } from "@/lib/clients";
import { policyManagerAbi } from "@/lib/contracts";
import { appEnv } from "@/lib/env";
import { normalizeAppError } from "@/lib/errors";

type PolicyFormProps = {
  account: `0x${string}` | null;
  onSuccess: () => Promise<void> | void;
};

export function PolicyForm({ account, onSuccess }: PolicyFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createPolicy() {
    startTransition(async () => {
      try {
        if (!account) {
          throw new Error("Connect a wallet before creating a policy.");
        }
        if (!appEnv.policyManagerAddress) {
          throw new Error("Missing policy manager address.");
        }

        setError(null);
        await ensureStellarChain();
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
          account,
          address: appEnv.policyManagerAddress as `0x${string}`,
          abi: policyManagerAbi,
          functionName: "createPolicy",
          value: parseEther("0.1"),
        });

        await publicClient.waitForTransactionReceipt({ hash });
        await onSuccess();
      } catch (transactionError) {
        setError(normalizeAppError(transactionError, "Policy purchase failed."));
      }
    });
  }

  return (
    <div className="card wide-card buy-policy-card">
      <div className="panel-head">
        <div>
          <h2>Buy Policy</h2>
          <p>Fixed parametric crop insurance settled directly on-chain.</p>
        </div>
      </div>
      <div className="policy-terms">
        <div className="policy-term">
          <span className="muted">Premium</span>
          <span className="policy-value">0.1 XLM</span>
        </div>
        <div className="policy-term">
          <span className="muted">Payout</span>
          <span className="policy-value">1.0 XLM</span>
        </div>
        <div className="policy-term">
          <span className="muted">Threshold</span>
          <span className="policy-value">100 mm rainfall</span>
        </div>
        <div className="policy-term">
          <span className="muted">Coverage</span>
          <span className="policy-value">Flood damage</span>
        </div>
        <div className="policy-term">
          <span className="muted">Settlement</span>
          <span className="policy-value">Automatic</span>
        </div>
      </div>
      <div className="policy-settlement-card">
        <p className="muted">
          Automated smart contract distribution listens for rainfall changes and settles the policy once the threshold
          is breached. No claim submission is required.
        </p>
      </div>
      <div className="stack">
        <button className="primary-button" type="button" onClick={createPolicy} disabled={isPending || !account}>
          {isPending ? "Submitting..." : account ? "Purchase Policy - 0.1 XLM" : "Connect Wallet First"}
        </button>
      </div>
      <Modal open={Boolean(error)} onClose={() => setError(null)} title="Policy Purchase Error" tone="error">
        <p className="modal-message">{error}</p>
      </Modal>
    </div>
  );
}
