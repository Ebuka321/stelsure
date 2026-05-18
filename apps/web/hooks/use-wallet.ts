"use client";

import { useState, useTransition } from "react";
import { ensureStellarChain, getWalletClient } from "@/lib/clients";
import { normalizeAppError } from "@/lib/errors";

export function useWallet() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function connect() {
    startTransition(async () => {
      try {
        setError(null);
        await ensureStellarChain();
        const walletClient = getWalletClient();
        const [selectedAccount] = await walletClient.requestAddresses();
        setAccount(selectedAccount);
      } catch (connectError) {
        setError(normalizeAppError(connectError, "Failed to connect wallet."));
      }
    });
  }

  return { account, connect, isPending, error };
}
