# StelSure

StelSure is a decentralized parametric crop coverage dashboard for StellarDAO. Users buy a fixed policy with XLM, a weather oracle emits rainfall events, and automated smart contract distribution settles eligible payouts without a manual claim flow.

## License

MIT License

## Product

- App name: `StelSure`
- DAO brand: `StellarDAO`
- Fixed policy premium: `0.1 XLM`
- Fixed payout: `1 XLM`
- Fixed rainfall threshold: `100 mm`
- Demo scenario: crop coverage for a farmer in Kano, Nigeria
- Settlement: automated smart contract distribution from a prefunded payout vault

## Repo Layout

- `apps/web` Next.js dashboard and AI explanation API route
- `contracts` Solidity contracts, Foundry tests, and deployment scripts
- `templates` XML UI specification for the dashboard
- `scripts` TypeScript utility for subscription setup

## Architecture

The application follows a modular architecture with clear separation of concerns:
- Smart contracts handle policy management and automated settlements
- React components provide a responsive dashboard interface
- Hooks encapsulate business logic and state management

## Core Flow

1. A user creates a policy by paying `0.1 XLM`.
2. `WeatherOracleMock` emits `WeatherUpdated(rainfall)`.
3. The automated distribution handler invokes `ReactiveArbitrator`.
4. `ReactiveArbitrator` evaluates the rainfall threshold and calls `PolicyManager`.
5. `PolicyManager` settles eligible active policies from the prefunded vault.
6. The StelSure dashboard updates live and shows an AI-generated payout explanation.

## Stellar Focus

StelSure is branded around StellarDAO, XLM-denominated policy terms, instant revenue sharing, and automated DAO payouts. The current smart contract demo keeps the existing Solidity execution path, while the UI, docs, wallet labels, and user-facing copy present the experience as a Stellar-focused product.

## Quick Start

### Prerequisites

- Node.js `>= 22`
- pnpm `>= 10`
- Foundry / Forge
- Stellar-compatible RPC and WebSocket endpoints for this demo environment
- Testnet XLM for policy creation and vault prefunding

### Install

```bash
pnpm install
forge install
```

### Environment

Copy `.env.example` to `.env.local` for the web app and `.env` for scripts as needed. Use the `NEXT_PUBLIC_STELLAR_*` variables for frontend network configuration.

### Run

```bash
pnpm dev
```

### Test

```bash
forge test
pnpm --filter web lint
```

## Deployment Order

1. Deploy `WeatherOracleMock`
2. Deploy `PolicyManager`
3. Deploy `ReactiveArbitrator`
4. Call `setReactiveArbitrator(address)` on `PolicyManager`
5. Prefund the policy vault with XLM
6. Create and fund the automated distribution subscription
7. Deploy the web app to Vercel

## Current Testnet Deployment

Current demo contract addresses:

- `WeatherOracleMock`: `0x52ceac77A680A8305E8bBBAa6F2AdA5c91a2eA45`
- `PolicyManager`: `0x038432D9d02C2883853C3d50131D99b5347D15Ab`
- `ReactiveArbitrator`: `0xd305C380eE424584498B719c2c25b696AaC729e5`

Verified demo flow:

- Vault prefunded with XLM
- Policy purchased for `0.1 XLM`
- `updateWeather(120)` emitted from the oracle
- Automated distribution invoked `ReactiveArbitrator`
- Policy settled and became `active = false`

## Failure Handling

- Underfunded vault: payout reverts and the policy remains active
- Invalid oracle call: blocked by `onlyOwner`
- AI failure: deterministic fallback explanation is used

## Future Work

- Integrate Stellar-native oracle and payment infrastructure
- Add dynamic pricing and multi-risk policies
- Expand StellarDAO-backed coverage pools
- Add geospatial and weather verification layers

## Important Notes

- The current demo uses a mock oracle for deterministic testing.
- The AI layer is informational only and never participates in settlement.
- The AI explanation route lives in `apps/web/app/api/explain/route.ts` and uses Google AI Studio when a Gemini-compatible API key is configured.
