# EconoSense Source Usage Rules

EconoSense is source-aware. It does not treat every source as equally reliable.

## Metric Discipline

Every numeric metric must include:
- `metric_value`
- `metric_source_type`
- `source_ids`
- `confidence`
- `assumptions`
- `limitations`

Allowed `metric_source_type` values:
- `source-backed`
- `model-estimated`
- `scenario-assumption`
- `placeholder-demo-estimate`

Exact numbers require official, peer-reviewed, or dataset-backed evidence. If a number is not supportable, use a range or mark it as a scenario assumption.

## Agent Rules

Policy Parser:
Use submitted policy text, Federal Register, Congress.gov, Regulations.gov, and state/local government documents first. Extract what is stated. Do not infer consequences.

Sentiment Agent:
Separate people sentiment, online sentiment, stakeholder sentiment, and media sentiment. Social media is never representative by itself.

Economic and Finance Agents:
Use BEA, BLS, Census ACS, Treasury, FRED, Federal Reserve sources, IMF, NBER, and source-backed tables where available. Separate first-order effects from second-order scenario effects.

Equity Reasoning:
Use Census ACS, BLS, EPI, CBPP, Brookings, and development-policy sources when relevant. Disclose think-tank perspectives.

Consulting Benchmarking:
Use consulting and economic-impact methodology sources only for structure, uncertainty language, and memo format. Do not copy their claims.

Source Auditor:
Flag unsupported exact numbers, social-only sentiment claims, background-only evidence used as primary support, stale sources, and missing source-backed metrics.
