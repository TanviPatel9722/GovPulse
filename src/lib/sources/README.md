# Sources

Adapters for official data, CrustData stakeholder intelligence, public records, and source-aware registry logic live here.

## CrustData Live Source Layer

CrustData powers stakeholder and public-signal intelligence only. It does not replace official government/statistical sources.

Planned live source paths:

- Company and organization discovery
- Company/person enrichment
- LinkedIn public activity signals
- Web-search signals scoped to Twitter/X and Reddit
- Hiring, growth, posts, and stakeholder influence signals

LinkedIn calls are rate-gated for the 30 requests/minute limit.

All CrustData-backed sentiment signals must be labeled as partial public activity signals, not representative public opinion.

## Economic Reliability Layer

Official statistical sources should be preferred for numeric baselines.

Initial source-backed baselines:

- Census ACS: income, poverty, households, labor participation, housing burden
- BLS: unemployment and CPI pressure

Modeled policy-cost ranges must be labeled as:

- source-backed
- model-estimated
- scenario assumption
- demo estimate

For the AI hiring transparency demo, industry and financial metrics should show ranges such as employer compliance cost, audit-market exposure, appeal workload, and enforcement capacity.
