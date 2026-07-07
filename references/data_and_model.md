# Data sourcing & probability model

Read this before Steps 2 and 4 of the workflow. Three parts: (A) IBKR field reference,
(B) options-positioning interpretation, (C) the probability model with a worked example.

---

## A. IBKR call sequence & fields

1. **`search_contracts`** `{ query: "<SYMBOL>", security_type: "STK" }` → take
   `underlying_contract_id` of the exact-symbol, primary-listing (US), OPT-bearing row.

2. **`get_price_snapshot`** `{ contract_id, market_data_names: [...] }`. Request these:

   | field | populates |
   |---|---|
   | `last` | header price |
   | `change` | day change % |
   | `year_to_date_change` | YTD chip |
   | `misc_statistics` | 52-week high/low (and 13/26-week) |
   | `implied_vol_underlying` | **IV (annual)** — multiply fraction ×100; check `is_valid` |
   | `historical_vol` | realized 30d vol (`annual_pct`) |
   | `implied_volatility_percentile` | IV percentile (fraction; 1.0 = 100th) |
   | `underlying_today_option_volume` | today call/put volume |
   | `underlying_avg_option_volume` | average call/put volume |
   | `dividend_yield` | dividend cell (or get exact $ from web) |

   Response keys are **hyphenated** (`implied-vol-underlying`, not underscore). IV/vol
   values are fractions — ×100 for percent. Put/call **volume ratio** = putVolume ÷
   callVolume.

3. **Option chain (optional, needs approval):**
   `get_option_parameters { underlying_contract_id }` → choose the expiration `id` nearest
   ~6 months out (prefer `regular:true`, no exotic `trading_class`). Then
   `get_option_data { expiration_id, min_strike, max_strike }` bounded ±~25% around spot.
   For each interesting strike, `get_price_snapshot` on `call_contract_id`/`put_contract_id`
   with `["option_open_interest","option_midpoint_iv","option_volume"]`. Use this to find
   the **largest call-OI strike** (overhead resistance), **largest put-OI strike**
   (support/hedge wall), the **put/call OI ratio**, and **max pain** (the strike minimizing
   total intrinsic value of all open contracts at expiry).
   **Never display contract IDs or expiration IDs to the user** — present by symbol, expiry
   date, strike. If approval fails, web-search these and note the source in the footer.

---

## B. Options-positioning interpretation playbook

Translate the raw numbers into the **recovery vs. decline** signal lists in section 02.
Direction matters more than level; compare today vs. average and IV vs. realized.

**Signals that lean toward recovery / a floor:**
- **IV at a high percentile (≥~90th)** with the stock already beaten down — often a
  capitulation marker; a post-event "vol crush" can fuel a relief rally.
- **Put/call volume < ~0.7 and below its own average** — call-heavy flow = dip
  accumulation, not panic hedging.
- **Put/call OI < 1** — positioning leans long.
- **Max pain above spot** — mild structural "pull" upward into expiry; rising call OI above
  spot marks an upside target.
- **Price resting on a multi-window low** (13/26/52-week low coincide) — tested support.

**Signals that lean toward more decline:**
- **IV > realized vol** — hedgers paying a premium for protection; the event move is priced
  large and a miss gets punished.
- **Broken technicals** — death cross / fresh lows / no nearby support below.
- **Large put-OI wall now in-the-money** — those hedges are working and cap bounces; that
  strike becomes overhead resistance.
- **Unresolved fundamental overhangs** (guidance risk, litigation, regulation).

The honest synthesis is usually "positioning is **bimodal around a binary catalyst**" with a
slight tilt — say which way and why, don't force a single direction.

---

## C. Probability model (risk-neutral lognormal + judgment tilt)

The template's `CONFIG.dist` block renders the curve and direction odds automatically from
`spot`, `sigma` (forward vol), `T` (years), `r` (drift = risk-free − dividend yield),
`domain`, and `bounds`. Your job is to pick good inputs and the scenario probabilities.

### Choosing forward vol (`sigma`)
Front-month IV is inflated by the next earnings event and current stress. For a 6-month
horizon, **step it down toward realized vol** to reflect mean-reversion and term structure
— a blend such as `0.5×IV + 0.5×realized`, or roughly `realized + a few points`. Always
justify the number in the chat. (Example: IV 42%, realized 34.5% → use ~30–34% for 6M.)

### The distribution
With S₀ = spot, σ = forward vol, T in years, drift μ = r:
- log-mean `m = ln(S₀) + (μ − σ²/2)·T`, log-sd `s = σ·√T`
- median ≈ `S₀·exp((μ − σ²/2)·T)`; mean (forward) ≈ `S₀·exp(μ·T)`
- percentile at price K: `z = (ln(K) − m)/s`, probability `S<K` = Φ(z) (normal CDF)

### Worked example (the MSFT run)
S₀ = 368, σ = 0.30, T = 0.5, μ = 0.03 → s = 0.2121, m = ln(368) − 0.0075.
Probability below each zone bound (raw, risk-neutral):

| bound K | P(S < K) | implied bucket prob |
|---|---|---|
| 320 | 26.6% | <320 ≈ **27%** |
| 355 | 44.7% | 320–355 ≈ **18%** |
| 400 | 66.6% | 355–400 ≈ **22%** |
| 460 | 86.2% | 400–460 ≈ **20%** |
| — | — | >460 ≈ **14%** |

### The judgment tilt
The risk-neutral measure omits the equity risk premium and any company-specific alpha, so
it under-weights the upside relative to a real-world view. Tilt probability from the deep-
downside tail toward the base/recovery buckets when warranted by: strong fundamentals,
analyst targets well above spot, capitulation-level IV (mean-reversion), and constructive
options flow. Shift modestly (a handful of points) — keep the binary catalyst's downside
real. Re-state the final buckets so they sum to ~100 and put them in `CONFIG.scenarios`,
plus the median, ±1σ band, and direction odds in `CONFIG.distStats`.

For the MSFT run the raw table above was tilted to 20 / 18 / 27 / 22 / 13 — a slight
upward shift reflecting the call-heavy flow and capitulation IV, leaving ~38% combined
below the base zone to respect the July-29 binary.

### Sensitivity to offer
Mention (or render as a second curve) how the tails widen if the **full front-month IV** is
used instead of the normalized forward vol — it shows the user how much uncertainty the
market is pricing around the event.
