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

1. **An Interactive Brokers account** — any tier, live or paper. IBKR Lite/Pro both work; the skill only *reads* market data and never places orders, so no funding or trading permissions are needed beyond market-data access.
2. **The IBKR MCP connector, connected and authenticated.** Add it in claude.ai → Settings → Connectors (or `/mcp` in an interactive Claude Code session) and complete the OAuth flow with your IBKR credentials. Until it's authorized, the IBKR tools are unavailable and the skill falls back to web-sourced figures (and says so in the report footer). The skill calls `search_contracts`, `get_price_snapshot`, `get_option_parameters`, and `get_option_data`.
3. **Market-data entitlements follow your IBKR account.** Real-time quotes require the relevant IBKR market-data subscriptions; without them IBKR serves delayed data, which works fine — every report is timestamped either way.
4. **Claude Code** (CLI, desktop, or web) with skills enabled.
5. **Web search** available in the session (used for fundamentals, peer metrics, analyst targets, and catalysts).

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

## Security & authentication model

**Cloning this skill grants no access to anyone's brokerage data — including the author's.** The repo contains only instructions, an HTML template, and sample market data:

- **No credentials ship with the skill.** There are no tokens, API keys, session handles, account numbers, or connector identifiers anywhere in this repository or its git history (audited).
- **Authentication is per-user, at the connector layer.** The skill calls IBKR MCP tools by generic name (`search_contracts`, `get_price_snapshot`, …). Those tools only exist in *your* Claude session after *you* authorize the IBKR connector with *your own* IBKR login via OAuth. Without that grant, the calls simply don't exist and the skill falls back to web data.
- **Nothing is stored.** The skill never writes tokens or account data to disk, and its reports contain only public market data — never account numbers, positions, or balances.
- **Query-only — no trading, no account reads.** The skill operates under a strict allowlist of four market-data tools (`search_contracts`, `get_price_snapshot`, `get_option_parameters`, `get_option_data`). It never calls order-placement or account tools, and the test suite fails if any file ever references one.

In short: anyone who checks this skill out must connect their own IBKR account; there is no mechanism by which they could reach the author's.

## Layout

- `SKILL.md` — the workflow: resolve the ticker, pull live IBKR data, research fundamentals/peers/catalysts, build the probability model, render
- `assets/dashboard_template.html` — the report template; all content is driven by a single `CONFIG` object, the page renders itself
- `references/data_and_model.md` — the exact IBKR call sequence, the options-positioning interpretation playbook, and the probability-distribution model with a worked example
- `samples/pltr-dashboard.html` — a real output, generated July 6, 2026
- `tests/regression.test.js` — 53-test regression suite (probability math, CONFIG rendering contract, docs invariants, sample integrity, credential/session-isolation checks); run with `node tests/regression.test.js`, no dependencies

## Disclaimer

This skill assembles a decision-support visual, **not investment advice**. It never places orders and never gives personalized buy/sell recommendations. Sample data is a point-in-time snapshot and is stale by the time you read it.
