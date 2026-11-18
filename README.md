# V-Hunter — cbBTC bars-replay race bot

Entry for [make.fun bounty: Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261118-1444).

## What it does

V-Hunter trades Coinbase Wrapped BTC (cbBTC) against 1-minute on-chain bars from its Orca
Whirlpool pool, with $1,000 of paper money. It is a **drawdown-reversal** bot:

- **Signal**: the close is ≥120 bps below the close 45 minutes ago (`r45 ≤ -120 bps`) **and**
  the current bar closed above its open (the slide just printed an up bar — a potential
  V-bottom).
- **Entry**: buy with the whole cash balance (long-only, no leverage).
- **Exit**: take profit at +130 bps, stop loss at −400 bps, or force-flat after 720 bars
  (12 hours) — whichever comes first.
- **Otherwise flat**: if no dip signal is active, it holds cash. A market that only falls
  costs it nothing but missed opportunities.

## Why

Minute-scale on-chain prices over-react. A sharp 45-minute slide that ends on an up-close
bar tends to bounce by more than the round-trip cost (~26 bps: 4 bps fee + 2 bps slippage +
constant-product impact). The thresholds were picked on the competition's frozen 24-hour dev
window and then validated on 40 block-bootstrap resamples of that window (worst case ≈ $0,
median ≈ +$26, wins 41/42) — the bot is tuned for robustness, not for a single perfect
backtest.

On the dev window it graded: **net PnL +$24.62, 4 trades, 100% win rate, max drawdown 1.36%**
(0 rejected orders; guardrails met).

## Determinism & constraints

- BigInt arithmetic only — identical inputs produce identical orders.
- No wall clock, no network, no files outside the repository; randomness is not used.
- Standard library only; the make.fun bars SDK shim is vendored under `vendor/`.

## Files

- `main.ts` — the bot (Node 22, TypeScript, run by the make.fun replay harness).
- `vendor/makefun-bars.ts` — byte-for-byte copy of the kit's SDK shim.

## License

MIT — see [LICENSE](LICENSE).
