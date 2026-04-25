"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  Landmark,
  Loader2,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  Wand2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_POLICY_TEXT, type MetricSourceType, type PolicyAnalysis, type PublicSentimentLabel } from "@/lib/types";
import type { Stakeholder } from "@/lib/types/stakeholders";

type InsightKey = "sentiment" | "industry" | "finance" | "redesign";

type ApiResponse = {
  ok: boolean;
  analysis?: PolicyAnalysis;
  error?: string;
  notice?: string;
  warnings?: Array<{ message: string; severity: string }>;
  mode?: "demo" | "live";
};

type PublicGroup = PolicyAnalysis["peopleSentimentForecast"]["public_groups"][number];
type IndustryEffect = NonNullable<PolicyAnalysis["industryRippleEffects"]>["industries"][number];
type FinanceRisk = NonNullable<PolicyAnalysis["financeInsuranceRisk"]>["risk_categories"][number];
type RedesignOption = PolicyAnalysis["redesignBrief"]["redesign_options"][number];
type ConsultationItem = PolicyAnalysis["redesignBrief"]["stakeholder_consultation_plan"][number];

interface EconoSenseAppProps {
  initialAnalysis: PolicyAnalysis;
  initialNotice: string;
}

const insightMeta: Record<
  InsightKey,
  {
    label: string;
    shortLabel: string;
    icon: typeof UsersRound;
    caption: string;
  }
> = {
  sentiment: {
    label: "People Sentiment",
    shortLabel: "Public Sentiment",
    icon: UsersRound,
    caption: "Support, opposition, and backlash"
  },
  industry: {
    label: "Industrial Impact",
    shortLabel: "Industry Shock",
    icon: Building2,
    caption: "Winners, losers, and CrustData signals"
  },
  finance: {
    label: "Financial Impact",
    shortLabel: "Fiscal Exposure",
    icon: Banknote,
    caption: "Budget, burden, and insurance risk"
  },
  redesign: {
    label: "Redesign the Law",
    shortLabel: "Better Rollout",
    icon: Wand2,
    caption: "Lower risk while preserving intent"
  }
};

const jurisdictions = ["Washington, DC", "United States", "California", "New York", "Maryland", "Virginia"];
const policyTypes = [
  "AI governance",
  "Labor and employment",
  "Procurement",
  "Grant or subsidy",
  "Tax credit",
  "Benefits program",
  "Housing",
  "Public safety",
  "Environmental retail regulation"
];

export function EconoSenseApp({ initialAnalysis, initialNotice }: EconoSenseAppProps) {
  const [policyText, setPolicyText] = useState(initialAnalysis.policyText);
  const [jurisdiction, setJurisdiction] = useState(initialAnalysis.parsedPolicy.jurisdiction);
  const [policyType, setPolicyType] = useState(
    /plastic|bag|retail|environment/i.test(initialAnalysis.policyText)
      ? "Environmental retail regulation"
      : "AI governance"
  );
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(initialAnalysis);
  const [activeInsight, setActiveInsight] = useState<InsightKey>("sentiment");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [error, setError] = useState<string | null>(null);

  const requestAnalysis = useCallback(
    async (input: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/analyze-policy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            policyText: input,
            jurisdiction,
            policyCategory: policyType,
            policyType,
            mode: "live"
          })
        });
        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.ok || !data.analysis) {
          throw new Error(data.error ?? "Policy analysis failed.");
        }

        setAnalysis(data.analysis);
        setActiveInsight("sentiment");
        const warningSummary = data.warnings?.filter((warning) => warning.severity !== "info").length ?? 0;
        setNotice(
          data.notice ??
            (warningSummary > 0
              ? `Analysis completed with ${warningSummary} warning${warningSummary === 1 ? "" : "s"}.`
              : null)
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Policy analysis failed.");
      } finally {
        setLoading(false);
      }
    },
    [jurisdiction, policyType]
  );

  const activeMeta = insightMeta[activeInsight];
  const ActiveInsightIcon = activeMeta.icon;

  return (
    <main className="min-h-screen overflow-x-hidden lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-5">
        <TopBar analysis={analysis} />

        <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <HeroCopy />
            <PolicyInputCard
              value={policyText}
              loading={loading}
              jurisdiction={jurisdiction}
              policyType={policyType}
              onChange={setPolicyText}
              onJurisdictionChange={setJurisdiction}
              onPolicyTypeChange={setPolicyType}
              onAnalyze={() => void requestAnalysis(policyText)}
              onLoadSample={() => {
                setPolicyText(DEMO_POLICY_TEXT);
                setJurisdiction("Washington, DC");
                setPolicyType("AI governance");
                void requestAnalysis(DEMO_POLICY_TEXT);
              }}
            />
            <StatusStrip notice={notice} error={error} />
          </div>

          <div className="space-y-4 lg:min-h-0">
            {!analysis ? (
              <EmptyAnalysisState loading={loading} />
            ) : (
              <>
                <InsightSelectorCards analysis={analysis} activeInsight={activeInsight} onSelect={setActiveInsight} />
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActiveInsightIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                        <div>
                          <div className="text-sm font-semibold text-white">{activeMeta.label}</div>
                          <div className="text-xs text-muted-foreground">{activeMeta.caption}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">Focused view</Badge>
                    </div>
                    <div className="p-4 lg:max-h-[calc(100vh-225px)] lg:overflow-y-auto">
                      <ActiveInsightPanel analysis={analysis} activeInsight={activeInsight} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function TopBar({ analysis }: { analysis: PolicyAnalysis | null }) {
  return (
    <nav className="glass-panel flex items-center justify-between rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
          <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">GovPulse</div>
          <div className="text-xs text-muted-foreground">Policy pre-mortem simulator</div>
        </div>
      </div>
      <span className="sr-only">{analysis?.analysisMode === "live-api" ? "Live analysis mode" : "Fallback analysis mode"}</span>
    </nav>
  );
}

function HeroCopy() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex w-fit items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Civic-tech simulator
      </div>
      <h1 className="text-3xl font-semibold leading-tight text-white lg:text-4xl">
        Pressure-test policy before the public does.
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Paste a proposal, scan the launch risk, then explore one focused insight at a time.
      </p>
    </section>
  );
}

function PolicyInputCard({
  value,
  loading,
  jurisdiction,
  policyType,
  onChange,
  onJurisdictionChange,
  onPolicyTypeChange,
  onAnalyze,
  onLoadSample
}: {
  value: string;
  loading: boolean;
  jurisdiction: string;
  policyType: string;
  onChange: (value: string) => void;
  onJurisdictionChange: (value: string) => void;
  onPolicyTypeChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">Policy Input</span>
          </div>
          <Badge variant="secondary">Live sources</Badge>
        </div>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={DEMO_POLICY_TEXT}
          aria-label="Policy text"
          className="min-h-[132px] resize-none text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <SelectField label="Jurisdiction" value={jurisdiction} options={jurisdictions} onChange={onJurisdictionChange} />
          <SelectField label="Policy Type" value={policyType} options={policyTypes} onChange={onPolicyTypeChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onAnalyze} disabled={loading || value.trim().length < 12}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Analyze
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={onLoadSample} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          Load sample policy
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.csv,.json,.policy"
          onChange={handleFileUpload}
        />
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((item) => (
          <option key={item} value={item} className="bg-[#0b111a]">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusStrip({ notice, error }: { notice: string | null; error: string | null }) {
  if (!notice && !error) return null;

  return (
    <Card className={error ? "border-red-400/30" : ""}>
      <CardContent className={`flex gap-3 p-3 text-xs leading-5 ${error ? "text-red-200" : "text-muted-foreground"}`}>
        {error ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
        )}
        {error ?? notice}
      </CardContent>
    </Card>
  );
}

function EmptyAnalysisState({ loading }: { loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex min-h-[360px] items-center justify-center p-6 text-sm text-muted-foreground">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> : <Gauge className="mr-2 h-4 w-4 text-primary" />}
        {loading ? "Running policy simulation" : "Run an analysis to open the simulator"}
      </CardContent>
    </Card>
  );
}

function ScoreTile({ label, value, caption, tone }: { label: string; value: number; caption: string; tone: "risk" | "ready" }) {
  const barColor =
    tone === "ready"
      ? value >= 65
        ? "bg-emerald-400"
        : "bg-amber-400"
      : value >= 70
        ? "bg-amber-400"
        : value >= 45
          ? "bg-violet-400"
          : "bg-emerald-400";

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-semibold text-white">{value}</span>
        <span className="pb-1 text-xs text-muted-foreground">/100</span>
      </div>
      <Progress value={value} className="mt-2 h-1.5" indicatorClassName={barColor} />
      <div className="mt-2 text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}

function InsightSelectorCards({
  analysis,
  activeInsight,
  onSelect
}: {
  analysis: PolicyAnalysis;
  activeInsight: InsightKey;
  onSelect: (insight: InsightKey) => void;
}) {
  const topGroups = getTopSentimentGroups(analysis);
  const topIndustries = getTopIndustryEffects(analysis);
  const topFinanceRisks = getTopFinanceRisks(analysis);
  const topRedesignOptions = getTopRedesignOptions(analysis);
  const values: Record<InsightKey, string> = {
    sentiment: `${Math.max(1, topGroups.length)} top groups`,
    industry: `${topIndustries.length} sectors`,
    finance: `${topFinanceRisks.length} cost paths`,
    redesign: `${topRedesignOptions.length} changes`
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {(Object.keys(insightMeta) as InsightKey[]).map((key) => {
        const meta = insightMeta[key];
        const Icon = meta.icon;
        const active = activeInsight === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`group rounded-lg border p-3 text-left transition-all ${
              active
                ? "border-primary/50 bg-primary/12 shadow-[0_0_28px_rgba(53,213,238,0.12)]"
                : "border-white/10 bg-white/[0.03] hover:border-primary/35 hover:bg-white/[0.06]"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className={`rounded-md border p-2 ${active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-black/20"}`}>
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <Badge variant={active ? "default" : "secondary"}>{values[key]}</Badge>
            </div>
            <div className="text-sm font-semibold text-white">{meta.label}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">{meta.caption}</div>
          </button>
        );
      })}
    </div>
  );
}

function ActiveInsightPanel({ analysis, activeInsight }: { analysis: PolicyAnalysis; activeInsight: InsightKey }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeInsight}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {activeInsight === "sentiment" ? <PeopleSentimentPanel analysis={analysis} /> : null}
        {activeInsight === "industry" ? <IndustrialImpactPanel analysis={analysis} /> : null}
        {activeInsight === "finance" ? <FinancialImpactPanel analysis={analysis} /> : null}
        {activeInsight === "redesign" ? <LawRedesignPanel analysis={analysis} /> : null}
      </motion.div>
    </AnimatePresence>
  );
}

function PeopleSentimentPanel({ analysis }: { analysis: PolicyAnalysis }) {
  const groups = getTopSentimentGroups(analysis);
  const strongestSupport = [...groups].sort((left, right) => right.sentiment_score - left.sentiment_score)[0];
  const mostCautious = [...groups].sort((left, right) => left.sentiment_score - right.sentiment_score)[0];
  const topTrigger =
    mostCautious?.emotional_triggers[0] ??
    strongestSupport?.emotional_triggers[0] ??
    groups[0]?.emotional_triggers[0] ??
    "trust";
  const socialRisks = getTopSocialRisks(analysis, groups);

  return (
    <div className="space-y-3">
      <PanelHeader
        badge="Public Sentiment"
        title={`How the most affected people may react: ${analysis.peopleSentimentForecast.overall_sentiment_summary}`}
        action={sentimentCitation()}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <SmallCard>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Likely support base</div>
          <div className="mt-2 text-xl font-semibold text-emerald-300">{strongestSupport?.group_name ?? "Needs local signal"}</div>
          <MiniLine label="Why" value={strongestSupport?.support_drivers[0] ?? "Needs local listening"} />
        </SmallCard>
        <SmallCard>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Most cautious residents</div>
          <div className="mt-2 text-xl font-semibold text-amber-300">{mostCautious?.group_name ?? "Needs local signal"}</div>
          <MiniLine label="Concern" value={mostCautious?.opposition_drivers[0] ?? "Needs local listening"} />
        </SmallCard>
        <SmallCard>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top emotional trigger</div>
          <div className="mt-2 text-xl font-semibold text-primary">{topTrigger}</div>
          <MiniLine label="Risk" value="online signals are amplification, not representative opinion" />
        </SmallCard>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <SmallCard key={group.group_name}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-white">{group.group_name}</div>
              <Badge variant={sentimentVariant(group.likely_sentiment)}>{group.likely_sentiment}</Badge>
            </div>
            <Badge variant={group.sentiment_score >= 0 ? "success" : "warning"}>{formatSentimentTilt(group.sentiment_score)}</Badge>
            <MiniLine label="What they may feel" value={group.likely_quotes[0] ?? "Needs local signal"} />
            <MiniLine label="What they may like" value={group.support_drivers[0] ?? "Needs local signal"} />
            <MiniLine label="What they may doubt" value={group.opposition_drivers[0] ?? "Unclear"} />
            <MiniLine label="Cited" value={sentimentCitation()} />
          </SmallCard>
        ))}
      </div>
      <CompactDetails label="Backlash and confusion checks">
        <div className="grid gap-3 md:grid-cols-3">
          {(socialRisks ?? []).map((risk) => (
            <SmallCard key={risk.group_name}>
              <div className="font-semibold text-white">{risk.group_name}</div>
              <MiniLine label="Backlash signal" value={risk.protest_or_backlash_risk >= 65 ? "elevated" : risk.protest_or_backlash_risk >= 45 ? "watch" : "limited"} />
              <MiniLine label="Confusion signal" value={risk.misinformation_exposure_risk >= 65 ? "elevated" : risk.misinformation_exposure_risk >= 45 ? "watch" : "limited"} />
              <MiniLine label="Main concern" value={risk.main_concern} />
              <MiniLine label="Cited" value={sentimentCitation()} />
            </SmallCard>
          ))}
        </div>
      </CompactDetails>
    </div>
  );
}

function IndustrialImpactPanel({ analysis }: { analysis: PolicyAnalysis }) {
  const industries = getTopIndustryEffects(analysis);
  const stakeholders = getTopStakeholders(analysis).slice(0, 8);
  const leadIndustries = industries.slice(0, 3);

  return (
    <div className="space-y-3">
      <PanelHeader
        badge="Industrial Impact"
        title="Top exposed sectors, likely winners/losers, and stakeholder amplification."
        action="Cited: CrustData + economic sources"
      />
      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <StakeholderSpiderWeb stakeholders={stakeholders} />
        <SmallCard>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">Industry Exposure Numbers</div>
              <div className="text-xs text-muted-foreground">Ranges stay directional unless official data supports them.</div>
            </div>
            <Badge variant="secondary">Top {leadIndustries.length}</Badge>
          </div>
          <div className="space-y-2">
            {leadIndustries.map((industry) => (
              <div key={industry.industry_name} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-100">{industry.industry_name}</div>
                  <Badge variant={industryEffectVariant(industry.effect_type)}>{effectLabel(industry.effect_type)}</Badge>
                </div>
                <div className="mt-1 text-lg font-semibold text-primary">{industry.metric_value}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{truncate(industry.key_ripple_effect, 150)}</div>
                <MiniLine label="Cited" value={sourceCitation(industry.source_ids)} />
              </div>
            ))}
          </div>
        </SmallCard>
      </div>
      <CompactDetails label="Sector details">
        <div className="grid gap-3 md:grid-cols-2">
          {industries.map((industry) => (
            <SmallCard key={industry.industry_name}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-white">{industry.industry_name}</div>
                <Badge variant={industryEffectVariant(industry.effect_type)}>{effectLabel(industry.effect_type)}</Badge>
              </div>
              <MiniLine label="Effect" value={industry.simulated_effect} />
              <MiniLine label="Labor" value={industry.labor_effect} />
              <MiniLine label="Supply chain" value={industry.supply_demand_effect} />
              <MiniLine label="Cited" value={sourceCitation(industry.source_ids)} />
            </SmallCard>
          ))}
        </div>
      </CompactDetails>
      <CompactDetails label="CrustData stakeholder signals">
        <div className="grid gap-3 md:grid-cols-2">
          {stakeholders.slice(0, 6).map((stakeholder) => (
            <SmallCard key={stakeholder.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-white">{stakeholder.name}</div>
                <Badge variant="success">{stakeholderCitation(stakeholder)}</Badge>
              </div>
              <MiniLine label="Industry" value={stakeholder.industry ?? "Unknown"} />
              <MiniLine label="Exposure" value={stakeholder.exposureLevel} />
              <MiniLine label="Position" value={stakeholder.likelyPosition} />
              <MiniLine label="Cited" value={stakeholderCitation(stakeholder)} />
            </SmallCard>
          ))}
        </div>
      </CompactDetails>
    </div>
  );
}

function FinancialImpactPanel({ analysis }: { analysis: PolicyAnalysis }) {
  const risks = getTopFinanceRisks(analysis);
  const sourceBackedIndicators = analysis.economicExposure.key_indicators
    .filter((indicator) => /Census ACS|BLS|BEA|FRED/i.test(indicator.source))
    .slice(0, 3);
  const modeledIndicators = analysis.economicExposure.key_indicators
    .filter((indicator) => !/Census ACS|BLS|BEA|FRED/i.test(indicator.source))
    .slice(0, 2);
  const leadRisks = risks.slice(0, 3);

  return (
    <div className="space-y-3">
      <PanelHeader
        badge="Financial Impact"
        title="Budget, household, business, and insurance exposure without fake precision."
        action="Cited: ACS/BLS/BEA/FRED"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <SmallCard>
          <div className="text-sm font-semibold text-white">Household Burden</div>
          <MiniLine label="Signal" value={analysis.economicExposure.household_exposure} />
          <MiniLine label="Cited" value="Census ACS, BLS" />
        </SmallCard>
        <SmallCard>
          <div className="text-sm font-semibold text-white">Business Cost</div>
          <MiniLine label="Signal" value={analysis.economicExposure.business_exposure} />
          <MiniLine label="Cited" value="BLS, BEA, policy text" />
        </SmallCard>
        <SmallCard>
          <div className="text-sm font-semibold text-white">Equity Sensitivity</div>
          <MiniLine label="Signal" value={analysis.economicExposure.equity_sensitivity} />
          <MiniLine label="Cited" value="Census ACS" />
        </SmallCard>
      </div>
      {modeledIndicators.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {modeledIndicators.map((indicator) => (
            <SmallCard key={indicator.indicator_name}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-white">{indicator.indicator_name}</div>
                <Badge variant="secondary">{indicator.source}</Badge>
              </div>
              <div className="mt-2 text-lg font-semibold leading-6 text-primary">{indicator.value}</div>
              <MiniLine label="Cited" value={indicator.source} />
            </SmallCard>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {leadRisks.map((risk) => (
          <SmallCard key={risk.risk_name}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-white">{risk.risk_name}</div>
              <Badge variant="secondary">{risk.category.replaceAll("_", " ")}</Badge>
            </div>
            <MiniLine label="Metric" value={risk.metric_value} />
            <MiniLine label="Who bears it" value={risk.who_bears_the_risk} />
            <MiniLine label="Mitigation" value={risk.mitigation} />
            <MiniLine label="Cited" value={sourceCitation(risk.source_ids)} />
          </SmallCard>
        ))}
      </div>
      <CompactDetails label="Source indicators">
        <div className="grid gap-3 md:grid-cols-3">
          {sourceBackedIndicators.map((indicator) => (
            <SmallCard key={indicator.indicator_name}>
              <div className="font-semibold text-white">{indicator.indicator_name}</div>
              <div className="mt-2 text-base font-semibold leading-6 text-primary">{indicator.value}</div>
              <MiniLine label="Cited" value={indicator.source} />
            </SmallCard>
          ))}
        </div>
      </CompactDetails>
    </div>
  );
}

function LawRedesignPanel({ analysis }: { analysis: PolicyAnalysis }) {
  const redesign = analysis.redesignBrief;
  const options = getTopRedesignOptions(analysis);
  const consultation = getTopConsultationItems(analysis);

  return (
    <div className="space-y-3">
      <PanelHeader
        badge="Redesign the Law"
        title="Keep the policy goal, reduce launch friction, and improve adoption readiness."
        action="Cited: risk model + sources"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreTile
          label="Original Risk"
          value={redesign.before_after_scores.before_overall_policy_risk}
          caption="as written"
          tone="risk"
        />
        <ScoreTile
          label="Redesigned Risk"
          value={redesign.before_after_scores.after_expected_policy_risk}
          caption="expected"
          tone="risk"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {options.slice(0, 3).map((option) => (
          <SmallCard key={option.option_title}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="font-semibold text-white">{option.option_title}</div>
              <Badge variant="success">recommended</Badge>
            </div>
            <MiniLine label="Change" value={option.policy_change} />
            <MiniLine label="Improvement" value={option.expected_risk_change} />
            <MiniLine label="Cited" value="risk score, stakeholder map, economic exposure" />
          </SmallCard>
        ))}
      </div>
      <CompactDetails label="Stakeholder consultation plan">
        <div className="grid gap-3 md:grid-cols-3">
          {consultation.map((item) => (
            <SmallCard key={`${item.stakeholder}-${item.suggested_question}`}>
              <div className="font-semibold text-white">{item.stakeholder}</div>
              <MiniLine label="Ask" value={item.suggested_question} />
              <MiniLine label="Concern" value={item.expected_concern} />
              <MiniLine label="Cited" value="CrustData stakeholder intelligence" />
            </SmallCard>
          ))}
        </div>
      </CompactDetails>
    </div>
  );
}

function PanelHeader({ badge, title, action }: { badge: string; title: string; action: string }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <Badge variant="secondary">{badge}</Badge>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{truncate(title, 160)}</p>
      </div>
      <Badge variant="default">{action}</Badge>
    </div>
  );
}

function SmallCard({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">{children}</div>;
}

function StakeholderSpiderWeb({ stakeholders }: { stakeholders: Stakeholder[] }) {
  const plotted = stakeholders.slice(0, 8).map((stakeholder, index, array) => {
    const influence = stakeholderScore(stakeholder.influenceLevel);
    const exposure = stakeholderScore(stakeholder.exposureLevel);
    const radius = 72 + ((influence + exposure) / 2) * 0.88;
    const angle = -90 + (360 / Math.max(1, array.length)) * index;
    const point = polarPoint(320, 180, radius, angle);

    return {
      stakeholder,
      influence,
      exposure,
      radius,
      angle,
      point
    };
  });
  const polygon = plotted.map((item) => `${item.point.x},${item.point.y}`).join(" ");

  return (
    <SmallCard>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">Stakeholder Spider-Web</div>
          <div className="text-xs text-muted-foreground">Distance reflects combined exposure + influence.</div>
        </div>
        <Badge variant="success">Cited: CrustData</Badge>
      </div>
      <div className="rounded-md border border-white/10 bg-[#06111c]/80 p-2">
        <svg viewBox="0 0 640 360" role="img" aria-label="Stakeholder spider-web influence map" className="h-[320px] w-full">
          {[55, 110, 165].map((radius) => (
            <circle key={radius} cx="320" cy="180" r={radius} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
          ))}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const point = polarPoint(320, 180, 168, angle);
            return <line key={angle} x1="320" y1="180" x2={point.x} y2={point.y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />;
          })}
          {polygon ? <polygon points={polygon} fill="rgba(34,211,238,0.09)" stroke="rgba(34,211,238,0.58)" strokeWidth="2" /> : null}
          <circle cx="320" cy="180" r="34" fill="rgba(8,13,22,0.92)" stroke="rgba(34,211,238,0.5)" />
          <text x="320" y="176" textAnchor="middle" className="fill-white text-[14px] font-semibold">
            Policy
          </text>
          <text x="320" y="194" textAnchor="middle" className="fill-slate-400 text-[10px]">
            pressure
          </text>
          {plotted.map(({ stakeholder, point, influence, exposure }) => {
            const color = stakeholderPositionColor(stakeholder.likelyPosition);
            const labelPoint = polarPoint(320, 180, Math.min(170, Math.max(108, Math.hypot(point.x - 320, point.y - 180) + 24)), Math.atan2(point.y - 180, point.x - 320) * 180 / Math.PI);

            return (
              <g key={stakeholder.id}>
                <line x1="320" y1="180" x2={point.x} y2={point.y} stroke={color.line} strokeWidth="1.4" />
                <circle cx={point.x} cy={point.y} r={6 + Math.round(influence / 30)} fill={color.fill} stroke={color.stroke} strokeWidth="2" />
                <text x={labelPoint.x} y={labelPoint.y} textAnchor={labelPoint.x < 300 ? "end" : labelPoint.x > 340 ? "start" : "middle"} className="fill-slate-100 text-[11px] font-semibold">
                  {truncate(stakeholder.name, 22)}
                </text>
                <text x={labelPoint.x} y={labelPoint.y + 14} textAnchor={labelPoint.x < 300 ? "end" : labelPoint.x > 340 ? "start" : "middle"} className="fill-slate-400 text-[10px]">
                  I{Math.round(influence)} / E{Math.round(exposure)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <span><span className="text-emerald-300">●</span> may support</span>
        <span><span className="text-amber-300">●</span> mixed/unknown</span>
        <span><span className="text-red-300">●</span> may oppose</span>
      </div>
    </SmallCard>
  );
}

function MiniLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="mt-1 text-xs leading-5">
      <span className="font-semibold text-slate-300">{label}:</span>{" "}
      <span className="text-muted-foreground">{truncate(String(value ?? "Not available"), 118)}</span>
    </div>
  );
}

function sentimentCitation() {
  return "Cited: policy text, public signals";
}

function sourceCitation(sourceIds?: string[]) {
  const cleaned = Array.from(
    new Set(
      (sourceIds ?? [])
        .map((source) => source.replace(/^source:/i, "").replace(/_/g, " ").trim())
        .filter(Boolean)
    )
  );

  if (cleaned.length === 0 || cleaned.includes("assumption-labeled")) {
    return "policy text + source adapters";
  }

  return cleaned.slice(0, 3).join(", ");
}

function stakeholderCitation(stakeholder: Stakeholder) {
  if (stakeholder.source === "crustdata") return "CrustData";
  if (stakeholder.evidenceCardIds.length > 0) return "CrustData adapter";
  return "public source";
}

function CompactDetails({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-slate-200">
        {label}
        <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-white/10 p-3">{children}</div>
    </details>
  );
}

function getTopSentimentGroups(analysis: PolicyAnalysis, limit = 5): PublicGroup[] {
  const allGroups = analysis.peopleSentimentForecast.public_groups;
  const peopleGroups = allGroups.filter((group) => isPeopleSentimentCategory(group.group_name));
  const candidateGroups = peopleGroups.length > 0 ? peopleGroups : allGroups;

  return candidateGroups
    .slice()
    .sort((left, right) => sentimentRelevanceScore(analysis, right) - sentimentRelevanceScore(analysis, left))
    .slice(0, limit);
}

function sentimentRelevanceScore(analysis: PolicyAnalysis, group: PublicGroup) {
  const policyText = getUiPolicyText(analysis);
  const groupName = group.group_name.toLowerCase();
  const directMention = analysis.parsedPolicy.affectedParties.some((party) => labelsOverlap(party, group.group_name)) ? 36 : 0;
  const policyMention = labelsOverlap(policyText, group.group_name) ? 18 : 0;
  const peopleCategory = isPeopleSentimentCategory(group.group_name) ? 12 : 0;
  const intensity = Math.min(32, Math.abs(group.sentiment_score) * 0.42);
  const confidence = group.confidence * 16;
  const evidence = Math.min(8, group.evidence_card_ids.length * 2);

  if (/agency|vendor|company|trade group|consultant|platform/i.test(groupName) && !directMention) {
    return intensity + confidence - 18;
  }

  return directMention + policyMention + peopleCategory + intensity + confidence + evidence;
}

function getTopSocialRisks(analysis: PolicyAnalysis, selectedGroups: PublicGroup[]) {
  const selectedNames = selectedGroups.map((group) => group.group_name);

  return (
    analysis.socialDynamicsRisk?.groups
      .slice()
      .sort((left, right) => {
        const leftMatch = selectedNames.some((name) => labelsOverlap(name, left.group_name)) ? 25 : 0;
        const rightMatch = selectedNames.some((name) => labelsOverlap(name, right.group_name)) ? 25 : 0;
        const leftRisk = left.misinformation_exposure_risk + left.protest_or_backlash_risk + left.trust_sensitivity;
        const rightRisk = right.misinformation_exposure_risk + right.protest_or_backlash_risk + right.trust_sensitivity;
        return rightMatch + rightRisk - (leftMatch + leftRisk);
      })
      .slice(0, 3) ?? []
  );
}

function getTopIndustryEffects(analysis: PolicyAnalysis, limit = 5): IndustryEffect[] {
  return (
    analysis.industryRippleEffects?.industries
      .slice()
      .sort((left, right) => industryRelevanceScore(analysis, right) - industryRelevanceScore(analysis, left))
      .slice(0, limit) ?? []
  );
}

function industryRelevanceScore(analysis: PolicyAnalysis, industry: IndustryEffect) {
  const directMention = analysis.parsedPolicy.affectedParties.some((party) => labelsOverlap(party, industry.industry_name)) ? 18 : 0;
  const mechanismMention = analysis.parsedPolicy.mechanisms.some((mechanism) => labelsOverlap(mechanism, industry.industry_name)) ? 14 : 0;
  const effectWeight: Record<IndustryEffect["effect_type"], number> = {
    compliance_cost: 34,
    revenue_contraction: 32,
    demand_spike: 28,
    labor_displacement: 30,
    supply_chain_shift: 24,
    uncertain: 8,
    neutral: 0
  };

  return directMention + mechanismMention + effectWeight[industry.effect_type] + industry.confidence * 18 + metricSpecificityScore(industry.metric_value);
}

function getTopFinanceRisks(analysis: PolicyAnalysis, limit = 5): FinanceRisk[] {
  return (
    analysis.financeInsuranceRisk?.risk_categories
      .slice()
      .sort((left, right) => financeRelevanceScore(right) - financeRelevanceScore(left))
      .slice(0, limit) ?? []
  );
}

function financeRelevanceScore(risk: FinanceRisk) {
  const categoryWeight: Record<FinanceRisk["category"], number> = {
    public_budget: 30,
    business_credit: 28,
    procurement: 26,
    insurance: 22,
    trade_credit: 20,
    commodities: 16,
    municipal_bonds: 10,
    other: 18
  };
  const sourceWeight: Record<MetricSourceType, number> = {
    "source-backed": 20,
    "model-estimated": 14,
    "scenario-assumption": 9,
    "placeholder-demo-estimate": 4
  };

  return categoryWeight[risk.category] + sourceWeight[risk.metric_source_type] + risk.confidence * 18 + metricSpecificityScore(risk.metric_value);
}

function getTopRedesignOptions(analysis: PolicyAnalysis, limit = 4): RedesignOption[] {
  return analysis.redesignBrief.redesign_options
    .slice()
    .sort((left, right) => redesignRelevanceScore(right) - redesignRelevanceScore(left))
    .slice(0, limit);
}

function redesignRelevanceScore(option: RedesignOption) {
  return option.confidence * 50 + expectedRiskChangeScore(option.expected_risk_change) + option.affected_groups_helped.length * 2;
}

function getTopConsultationItems(analysis: PolicyAnalysis, limit = 4): ConsultationItem[] {
  return analysis.redesignBrief.stakeholder_consultation_plan
    .slice()
    .sort((left, right) => {
      const rightStakeholder = getStakeholderRows(analysis).find((stakeholder) => labelsOverlap(stakeholder.name, right.stakeholder));
      const leftStakeholder = getStakeholderRows(analysis).find((stakeholder) => labelsOverlap(stakeholder.name, left.stakeholder));
      return stakeholderRankScore(rightStakeholder) - stakeholderRankScore(leftStakeholder);
    })
    .slice(0, limit);
}

function getTopStakeholders(analysis: PolicyAnalysis) {
  return getStakeholderRows(analysis)
    .slice()
    .sort((left, right) => stakeholderRankScore(right) - stakeholderRankScore(left));
}

function getStakeholderRows(analysis: PolicyAnalysis): Stakeholder[] {
  if (analysis.stakeholderIntelligence.stakeholderObjects?.length) {
    return analysis.stakeholderIntelligence.stakeholderObjects;
  }

  return analysis.stakeholderIntelligence.stakeholders.map((stakeholder) => ({
    id: stakeholder.company_or_org_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: stakeholder.company_or_org_name,
    type: "company",
    category: stakeholder.stakeholder_type,
    industry: stakeholder.industry,
    location: stakeholder.location,
    likelyPosition:
      stakeholder.likely_position === "Supportive"
        ? "support"
        : stakeholder.likely_position === "Concerned" || stakeholder.likely_position === "Opposed"
          ? "oppose"
          : "mixed",
    influenceLevel: stakeholder.influence_level === "Very High" || stakeholder.influence_level === "High" ? "high" : "medium",
    exposureLevel: /direct|compliance|burden|demand/i.test(stakeholder.reason_affected) ? "high" : "medium",
    reasonAffected: stakeholder.reason_affected,
    signals: {
      headcount: stakeholder.size_signal,
      news: stakeholder.growth_signal
    },
    relevantPeople: stakeholder.relevant_people.map((person) => ({
      name: person.name,
      title: person.title,
      linkedinUrl: person.public_profile_url,
      reasonRelevant: person.relevance
    })),
    evidenceCardIds: stakeholder.evidence_cards.map((card) => card.id),
    source: stakeholder.evidence_cards.some((card) => card.raw_metadata.mode === "live-api") ? "crustdata" : "mock",
    confidence: stakeholder.confidence
  }));
}

function isPeopleSentimentCategory(groupName: string) {
  return !/regulated entities|implementing agenc|agency staff|government agency|chamber|vendor|company|consultant|advocacy organization|public-sector contractor|platform provider/i.test(groupName);
}

function getUiPolicyText(analysis: PolicyAnalysis) {
  return [
    analysis.policyText,
    analysis.parsedPolicy.policyName,
    analysis.parsedPolicy.mechanisms.join(" "),
    analysis.parsedPolicy.affectedParties.join(" ")
  ].join(" ");
}

function labelsOverlap(left: string, right: string) {
  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  return rightTokens.some((token) => leftTokens.includes(token)) || leftTokens.some((token) => rightTokens.includes(token));
}

function meaningfulTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !["policy", "public", "people", "groups", "using", "with", "from", "that", "this", "rule"].includes(token));
}

function metricSpecificityScore(value: string) {
  if (/\$|\d/.test(value)) return 12;
  if (/moderate|high|low|weak|directional/i.test(value)) return 5;
  return 0;
}

function expectedRiskChangeScore(value: string) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length > 0 ? Math.min(28, Math.max(...numbers)) : 8;
}

function stakeholderRankScore(stakeholder?: Stakeholder) {
  if (!stakeholder) return 0;
  return stakeholderScore(stakeholder.influenceLevel) + stakeholderScore(stakeholder.exposureLevel) + stakeholder.confidence * 20;
}

function formatSentimentTilt(score: number) {
  if (score > 35) return "supportive";
  if (score > 10) return "lean support";
  if (score >= -10) return "uncertain";
  if (score >= -35) return "cautious";
  return "resistant";
}

function stakeholderScore(value: string) {
  const normalized = value.toLowerCase();
  if (/very high/.test(normalized)) return 100;
  if (/high/.test(normalized)) return 82;
  if (/medium|mixed/.test(normalized)) return 56;
  if (/low/.test(normalized)) return 30;
  return 45;
}

function polarPoint(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.round((centerX + radius * Math.cos(angle)) * 10) / 10,
    y: Math.round((centerY + radius * Math.sin(angle)) * 10) / 10
  };
}

function stakeholderPositionColor(position: string) {
  const normalized = position.toLowerCase();
  if (/support/.test(normalized)) {
    return {
      fill: "rgba(52,211,153,0.9)",
      stroke: "rgba(167,243,208,0.9)",
      line: "rgba(52,211,153,0.45)"
    };
  }
  if (/oppose/.test(normalized)) {
    return {
      fill: "rgba(248,113,113,0.9)",
      stroke: "rgba(254,202,202,0.9)",
      line: "rgba(248,113,113,0.45)"
    };
  }
  return {
    fill: "rgba(251,191,36,0.9)",
    stroke: "rgba(253,230,138,0.9)",
    line: "rgba(251,191,36,0.42)"
  };
}

function sentimentVariant(sentiment: PublicSentimentLabel) {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "warning";
  return "secondary";
}

function industryEffectVariant(effect: string) {
  if (effect === "demand_spike") return "success";
  if (effect === "neutral") return "secondary";
  if (effect === "uncertain") return "default";
  return "warning";
}

function effectLabel(effect: string) {
  return effect.replaceAll("_", " ");
}

function truncate(value: string, max = 96) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}
