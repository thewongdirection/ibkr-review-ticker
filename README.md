# ibkr-review-ticker

A [Claude Code](https://claude.com/claude-code) skill that generates a fully-illustrated, single-stock review dashboard for any publicly traded ticker — rendered as a self-contained dark "instrument-panel" HTML report.

## Sample output

**[samples/pltr-dashboard.html](samples/pltr-dashboard.html)** — a real run on PLTR (July 6, 2026), built from live IBKR data (spot, IV, option chain) plus web research. [View it rendered](https://htmlpreview.github.io/?https://github.com/thewongdirection/ibkr-review-ticker/blob/main/samples/pltr-dashboard.html), or download and open locally.

## What it produces

One self-contained HTML file (no external dependencies beyond Google Fonts) covering, for a single ticker:

- **Vital signs** — market cap, P/E (TTM & forward), P/S, valuation context, 52-week return
- **Options & volatility positioning** — implied vs. realized vol, IV percentile, put/call volume and open interest, max pain, OI walls, plus a two-column "points to recovery / points to more decline" signal read
- **Probabilistic 6-month outlook** — a lognormal price distribution built from live implied vol, bucketed into five scenarios with probabilities, drawn as a shaded probability fan curve with the spot marker and direction odds
- **Profitability gauges** — gross/operating/net margin, ROE, FCF margin
- **Peer ranking rails** — the subject ticker highlighted in amber among 4–6 comparables on sector-relevant metrics
- **Income & cash engine, balance sheet, analyst consensus track, and upcoming catalysts**

Live market data comes from the Interactive Brokers (IBKR) connector; fundamentals, peers, and catalysts come from web research. Every figure is timestamped and approximations are flagged.

## Prerequisites

1. **Claude Code** (CLI, desktop, or web) with skills enabled.
2. **The IBKR MCP connector**, connected and authorized — the skill calls `search_contracts`, `get_price_snapshot`, `get_option_parameters`, and `get_option_data` for live quotes, volatility, and the option chain. Without it the skill falls back to web-sourced figures and says so in the report footer.
3. **Web search** available in the session (used for fundamentals, peer metrics, analyst targets, and catalysts).
4. An IBKR market-data subscription appropriate for the tickers you review (delayed data works; the report is timestamped either way).

## How to use it

**Install** — clone into your Claude Code skills directory:

```
git clone https://github.com/thewongdirection/ibkr-review-ticker.git ~/.claude/skills/ibkr-review-ticker
```

**Run** — in a Claude Code session, either invoke it directly:

```
/ibkr-review-ticker MSFT
```

or just ask naturally — "review NVDA", "why is AMD moving and will it recover", "run the dashboard on TSLA". Claude resolves the ticker on IBKR, pulls the live snapshot and ~6-month option chain, researches fundamentals/peers/catalysts on the web, builds the probability model, and renders the dashboard.

**Read** — you get one HTML file. Open it in any browser. The subject ticker is always the amber highlight; cyan is neutral data, rose is negative. The footer records the data timestamp, sources, and every approximation made.

Typical runtime is a few minutes; the option-chain scan (per-strike open interest) is the slow part and is skipped gracefully if unavailable.

## Layout

- `SKILL.md` — the workflow: resolve the ticker, pull live IBKR data, research fundamentals/peers/catalysts, build the probability model, render
- `assets/dashboard_template.html` — the report template; all content is driven by a single `CONFIG` object, the page renders itself
- `references/data_and_model.md` — the exact IBKR call sequence, the options-positioning interpretation playbook, and the probability-distribution model with a worked example
- `samples/pltr-dashboard.html` — a real output, generated July 6, 2026

## Disclaimer

This skill assembles a decision-support visual, **not investment advice**. It never places orders and never gives personalized buy/sell recommendations. Sample data is a point-in-time snapshot and is stale by the time you read it.
