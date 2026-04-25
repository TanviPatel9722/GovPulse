# Agents

Policy analysis agents live here.

The product is people-sentiment-first: agent outputs should use scenario language, confidence, assumptions, and evidence-backed limitations.

## Merged Working Agent Model

EconoSense now exposes a smaller operating surface while keeping specialist logic behind the scenes.

### Policy Parser Agent

Turns raw policy text into structured fields used by every downstream module.

### Stakeholder + Economic Impact Agent

Combines stakeholder intelligence, CrustData company/org signals, economic exposure, industry ripple effects, and finance / insurance exposure.

### Public Sentiment + Narrative Risk Agent

Combines public sentiment scenario forecasting, narrative risk, social-contagion risk, LinkedIn public-signal checks, and web-search signals for Twitter/X and Reddit.

### Risk & Abuse Assessment Agent

Combines fraud / abuse pre-mortem, implementation bottlenecks, explainable risk scoring, and source auditing.

### Policy Redesign + Executive Memo Agent

Combines policy redesign options, impact-chain simulation, and executive memo generation.

## Source Discipline

Public social signals are treated as amplification signals, not representative resident sentiment.

## Dynamic Fallback Discipline

Fallback outputs should be derived from the parsed policy, not from a fixed demo script.

Current guardrails:

- AI hiring routing requires both an AI/automation signal and a hiring/employment signal.
- Housing, health, energy, environment, and generic policies should produce different affected groups, industries, stakeholders, and redesign options.
- Numeric outputs use ranges with source labels unless backed by official or validated data.
- CrustData mock stakeholders should match the policy domain when live data is unavailable.
