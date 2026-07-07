# ibkr-review-ticker

A [Claude Code](https://claude.com/claude-code) skill that generates a fully-illustrated, single-stock review dashboard for any publicly traded ticker — rendered as a self-contained dark "instrument-panel" HTML report.

## What it produces

One HTML file covering, for a single ticker:

- **Vital signs** — live price, day/YTD change, 52-week range
- **Options & volatility** — implied vs. realized vol, IV percentile, put/call volume, max pain, open-interest walls, skew
- **Probabilistic 6-month outlook** — a lognormal price distribution built from live implied vol, bucketed into five scenarios with probabilities, shown as a shaded probability fan curve
- **Fundamentals** — valuation multiples, margins, returns, income & cash flow, balance sheet, dividend
- **Peer rankings** — the subject ticker highlighted among 4–6 comparables on sector-relevant metrics
- **Analyst consensus and upcoming catalysts**

Live market data comes from the Interactive Brokers (IBKR) connector; fundamentals, peers, and catalysts come from web research. Every figure is timestamped and approximations are flagged.

## Requirements

- Claude Code with the **IBKR MCP connector** connected and authorized (tools like `search_contracts`, `get_price_snapshot`, `get_option_data`)
- Web search available for the fundamentals/peers research

## Install

Clone into your Claude Code skills directory:

```
git clone https://github.com/thewongdirection/ibkr-review-ticker.git ~/.claude/skills/ibkr-review-ticker
```

Then invoke it in a session:

```
/ibkr-review-ticker MSFT
```

or just ask naturally — "review NVDA", "why is AMD moving and will it recover", "run the dashboard on TSLA".

## Layout

- `SKILL.md` — the workflow: resolve the ticker, pull live IBKR data, research fundamentals/peers/catalysts, build the probability model, render
- `assets/dashboard_template.html` — the report template; all content is driven by a single `CONFIG` object
- `references/data_and_model.md` — the exact IBKR call sequence, the options-positioning interpretation playbook, and the probability-distribution model

## Disclaimer

This skill assembles a decision-support visual, **not investment advice**. It never places orders and never gives personalized buy/sell recommendations.
