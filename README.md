# GovPulse / EconoSense 2.0

People-sentiment-first policy pre-mortem OS for government and government-adjacent teams.

EconoSense helps teams pressure-test a proposed policy before launch by organizing:

- people sentiment scenarios
- stakeholder intelligence
- economic exposure
- fraud and abuse pre-mortem
- implementation bottlenecks
- policy redesign options
- executive memo output

## Initial Project Structure

```text
src/
  app/
    api/analyze-policy/
  components/
  lib/
    agents/
    evidence/
    llm/
    scoring/
    sources/
knowledge/
```

## Product Principle

The system does not claim perfect prediction. Outputs are framed as scenario forecasts with confidence, assumptions, and evidence quality labels.

## Planned Core Modules

- Policy Parser Agent
- People Sentiment Agent
- Stakeholder Intelligence Agent
- Economic Exposure Agent
- Fraud / Abuse Pre-Mortem Agent
- Risk Scoring Engine
- Policy Redesign Agent
- Executive Memo Agent
- Impact Chain Simulation

