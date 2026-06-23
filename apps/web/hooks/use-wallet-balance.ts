"use client";

import { useState, useEffect } from "react";
import { publicClient } from "@/lib/clients";

export function useWalletBalance(address: `0x${string}` | null) {
  const [balance, setBalance] = useState<bigint>(0n);

  useEffect(() => {
    if (!address) {
      setBalance(0n);
      return;
    }

    async function fetchBalance() {
      const bal = await publicClient.getBalance({ address: address! });
      setBalance(bal);
    }

    fetchBalance();
  }, [address]);

  return balance;
}
