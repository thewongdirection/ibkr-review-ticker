---
name: ibkr-review-ticker
description: >-
  Generate a fully-illustrated, single-stock review dashboard for any publicly traded
  ticker — fundamentals vs. peers, live options/volatility positioning, and a
  probabilistic 6-month price outlook — using live Interactive Brokers (IBKR) data plus
  web research, rendered as a self-contained dark "instrument-panel" HTML report. Use
  this whenever the user wants to review, evaluate, analyze, or "build a dashboard/report"
  for a stock or ticker; asks why a stock is moving or whether it will recover; asks about
  a stock's fundamentals, valuation, or how it compares to industry/peers; asks about
  options positioning, implied volatility, max pain, or a price forecast / probability
  distribution for a stock; or says anything like "review TICKER", "run the dashboard on
  X", or "IBKR ticker review" — even if they don't say the word "dashboard". Prefer this
  skill over ad-hoc analysis for any equity that has IBKR data available.
---

# IBKR Review Ticker — illustrated single-stock dashboard

Produces one self-contained HTML file: a dark instrument-panel dashboard covering vital
signs, options/volatility positioning, a probabilistic price outlook, profitability,
peer rankings, income/cash, balance sheet, analyst targets, and upcoming catalysts for a
single ticker. Live market data comes from the IBKR connector; fundamentals, peers, and
catalysts come from web research.

This skill assembles a **decision-support visual, not advice.** Always present figures as
as-of a timestamp, flag approximations, and state plainly that it is informational and
that you are not a financial advisor.

## Prerequisites

- **An Interactive Brokers account** (any tier, live or paper) with the **IBKR MCP
  connector** connected and authorized — the user links their IBKR login to Claude via
  the connector's OAuth flow (claude.ai → Settings → Connectors, or `/mcp` in Claude
  Code). The skill only reads market data; it never places orders.
- **Market-data entitlements follow the account.** Real-time quotes require the user's
  IBKR market-data subscriptions; without them IBKR serves delayed data, which is fine —
  timestamp the report either way.
- **Web search** available in the session, for fundamentals, peers, and catalysts.
- If the IBKR tools are missing, unauthorized, or time out, do not block: fall back to
  web-sourced figures and say so in the footer.

## Files in this skill

- `assets/dashboard_template.html` — the report template. **All content is driven by one
  `CONFIG` object** inside its `<script>`. You fill `CONFIG`; the page renders itself
  (gauges, peer rails, the probability curve, scenario bars, analyst track). Do not
  hand-edit the HTML body. Read its header comment for the per-field contract.
- `references/data_and_model.md` — the exact IBKR call sequence and market-data fields to
  request, the options-positioning interpretation playbook (recovery vs. decline signals),
  and the probability-distribution model with a worked example. **Read this before the
  data-gathering and modeling steps.**

## Workflow

Work through these in order. Scale the web research to the ticker's complexity (a quiet
mega-cap needs less than a stock in the middle of a sell-off).

### 1 — Resolve the ticker (IBKR)
Load IBKR tools with `tool_search` (query e.g. "search contracts option chain price
snapshot"). Call `search_contracts` with the symbol. Pick the row whose `symbol` is an
**exact** match, `country_code` is the primary listing (usually `US`), and `sections`
include `OPT`. Keep its `underlying_contract_id`. Ignore leveraged/yield ETFs that merely
contain the symbol (MSFU, MSFY, etc.).

### 2 — Pull live market + volatility data (IBKR)
Call `get_price_snapshot` on the underlying with the field list in
`references/data_and_model.md`. Capture: last price, day change, YTD change, 52-week
high/low, implied vol (annual), historical (realized) vol, IV percentile, and today's vs.
average option put/call volume. These populate the header, **Vital signs**, and **Options
& volatility** sections.

For the option chain (max pain, OI walls, skew): call `get_option_parameters` →
`get_option_data` for the nearest expiry ~6 months out, then `get_price_snapshot` per
contract for `option_open_interest` / `option_midpoint_iv`. **If those calls are not
approved or time out, fall back to web search** for max pain / put-call OI / OI walls and
say so in the footer. Do not block the whole report on chain-level data.

### 3 — Research fundamentals, peers, catalysts (web)
Search for, and record with sources: valuation multiples (P/E TTM & forward, PEG, P/S,
EV/EBITDA), margins (gross/operating/net), returns (ROE, ROIC, FCF margin), income & cash
(revenue, net income, operating cash flow, capex, FCF and their YoY growth), balance sheet
(cash, debt, D/E, current ratio), dividend, and analyst consensus (rating, average target,
range). Then pull the same comparison metrics for 4–5 relevant peers, and list upcoming
catalysts (next earnings date, ex-dividend, conferences, litigation/regulatory overhangs).
Favor primary/recent sources; obey copyright (paraphrase, short quotes only).

### 4 — Build the probability outlook (compute)
Using the live implied vol and the model in `references/data_and_model.md`, construct the
6-month / end-of-year distribution: pick a forward vol (step the front-month IV down toward
realized to reflect mean-reversion/term structure — justify the number), build the
lognormal, bucket into 5 scenarios with price ranges, and assign probabilities by blending
the option-implied odds with the fundamental/positioning picture. State the median, the
±1σ range, and the direction odds. Keep probabilities summing to ~100.

### 5 — Render the dashboard
Copy `assets/dashboard_template.html` to `/mnt/user-data/outputs/<ticker>-dashboard.html`.
Fill the `CONFIG` object with everything gathered. The subject ticker is the **first entry
of `peerOrder`** and is highlighted amber automatically. Replace `__TICKER__` in `<title>`.
Then `present_files` the result. Keep the post-amble short: a few sentences on the headline
read (why it's moving, the peer-ranking takeaway, the probability split, the key catalyst),
then offer obvious follow-ups (refresh with exact chain data; add peers; second curve at
full IV).

### 6 — Guardrails
- Informational only, not investment advice; you are not a financial advisor. (This belongs
  in the footer and the chat reply.)
- Timestamp the data and flag every approximation (especially peer figures and any web-
  sourced chain stats).
- Never place orders or give personalized buy/sell/allocation recommendations. If the user
  asks "should I buy", give the factual setup and the probability picture, not a directive.

## Design system (keep it)
Dark slate instrument panel. Three disciplined hues: **cyan** = neutral data accent,
**rose** = negative/decline, **amber** = the subject ticker / the one bold highlight.
Numerics in IBM Plex Mono, labels in Space Grotesk. The signature elements are the
**peer ranking rails** (subject glowing amber among grey peers) and the **probability fan
curve** (lognormal, shaded decline→base→recovery). The template already encodes all of
this — don't redesign it per run; just feed `CONFIG`.

## Adapting to other sectors
The MSFT defaults in the template are an example. For a bank, swap capex/FCF framing for
NIM/efficiency-ratio context; for a biotech, the catalyst section may dominate (trial
readouts) and margins may be N/A — set those cells to "n/a" rather than forcing a number.
The peer rails work for any 4–6 comparables; choose metrics that matter for the sector.
