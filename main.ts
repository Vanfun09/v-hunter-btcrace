// V-Hunter: a drawdown-reversal bot for the cbBTC bars-replay race.
//
// Thesis: this 1-minute on-chain pool over-reacts at minute scale; a sharp slide over the last
// ~45 minutes that ends on an up-close bar tends to bounce harder than the round-trip cost
// (~26 bps). The bot goes all-in on such V-bottoms and exits at +130 bps, -400 bps, or after
// 720 bars. It stands aside otherwise, so a falling window costs it nothing but missed chances.
//
// Determinism: bigint arithmetic only, no clock, no randomness, no environment reads.

import { runBars, type Order } from './vendor/makefun-bars.ts';

const LOOKBACK = 45;          // bars in the slide measurement window
const DIP_BPS = 120;          // r45 <= -120 bps triggers a hunt
const TAKE_PROFIT_BPS = 130;  // exit in profit
const STOP_LOSS_BPS = 400;    // exit at a loss
const MAX_HOLD_BARS = 720;    // 12 hours, then flat
const MAX_SLIPPAGE_BPS = 1000;

const closes: bigint[] = [];
let entryBar = -1;
let held = false;

await runBars({
  onBatch(state, batch) {
    const bar = batch.bars.find((b) => b.symbol === 'CBBTC');
    if (bar === undefined) return [];

    const o = BigInt(bar.o);
    const c = BigInt(bar.c);
    closes.push(c);
    if (closes.length > LOOKBACK + 1) closes.shift();

    const pos = state.positions.get('CBBTC');
    const orders: Order[] = [];

    if (pos !== undefined && held) {
      const valueNow = (pos.qty * c * 10n ** 6n) / 10n ** 13n;
      const gain = Number((valueNow - pos.cost) * 10000n / pos.cost);
      const heldBars = state.seq - entryBar;
      if (gain >= TAKE_PROFIT_BPS || gain <= -STOP_LOSS_BPS || heldBars >= MAX_HOLD_BARS) {
        orders.push({ side: 'sell', symbol: 'CBBTC', qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        held = false;
      }
      return orders;
    }

    if (closes.length <= LOOKBACK) return [];
    const rBps = Number((c - closes[0]) * 10000n / closes[0]);
    const green = c > o;
    if (rBps <= -DIP_BPS && green && !state.warmingUp) {
      entryBar = state.seq + 1;
      held = true;
      orders.push({ side: 'buy', symbol: 'CBBTC', notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS });
    }
    return orders;
  },
});
