import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineChain, http, keccak256, stringToHex, toFunctionSelector, createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SDK } from "../apps/web/node_modules/@somnia-chain/reactivity/dist/index.js";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnv() {
  const rootDir = process.cwd();
  const candidatePaths = [
    path.join(rootDir, ".env.local"),
    path.join(rootDir, ".env"),
    path.join(rootDir, "apps/web/.env.local"),
    path.join(rootDir, "apps/web/.env"),
  ];

  for (const candidatePath of candidatePaths) {
    loadEnvFile(candidatePath);
  }
}

async function main() {
  loadLocalEnv();

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.STELLAR_RPC_URL;
  const chainId = Number(process.env.STELLAR_CHAIN_ID ?? "50312");
  const weatherOracle = process.env.WEATHER_ORACLE_ADDRESS;
  const reactiveArbitrator = process.env.REACTIVE_ARBITRATOR_ADDRESS;

  if (!privateKey || !rpcUrl || !weatherOracle || !reactiveArbitrator) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY, STELLAR_RPC_URL, WEATHER_ORACLE_ADDRESS, or REACTIVE_ARBITRATOR_ADDRESS.");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chain = defineChain({
    id: chainId,
    name: "Stellar Testnet",
    nativeCurrency: { name: "XLM", symbol: "XLM", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    testnet: true,
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);

  const sdk = new SDK({
    public: walletClient,
    wallet: walletClient,
  });

  const result = await sdk.createSoliditySubscription({
    eventTopics: [keccak256(stringToHex("WeatherUpdated(uint256)"))],
    emitter: weatherOracle as `0x${string}`,
    handlerContractAddress: reactiveArbitrator as `0x${string}`,
    handlerFunctionSelector: toFunctionSelector("onEvent(address,bytes32[],bytes)"),
    priorityFeePerGas: 2_000_000_000n,
    maxFeePerGas: 10_000_000_000n,
    gasLimit: 3_000_000n,
    isGuaranteed: true,
    isCoalesced: false,
  });

  if (result instanceof Error) {
    throw result;
  }

  console.log("Subscription transaction hash:", result);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
