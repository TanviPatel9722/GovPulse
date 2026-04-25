"use client";

import { Activity, Gauge } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { ExplainableRiskScore, RiskBand, RiskScore } from "@/lib/types";

const riskDimensions: Array<{
  key: keyof Pick<
    RiskScore,
    | "public_reaction_risk"
    | "business_opposition_risk"
    | "economic_exposure_risk"
    | "implementation_complexity_risk"
    | "fraud_abuse_risk"
    | "legal_ambiguity_risk"
    | "misinformation_risk"
    | "mitigation_readiness"
    | "adoption_readiness"
  >;
  label: string;
  mode: "risk" | "readiness";
}> = [
  { key: "public_reaction_risk", label: "Public reaction", mode: "risk" },
  { key: "business_opposition_risk", label: "Business opposition", mode: "risk" },
  { key: "economic_exposure_risk", label: "Economic exposure", mode: "risk" },
  { key: "implementation_complexity_risk", label: "Implementation", mode: "risk" },
  { key: "fraud_abuse_risk", label: "Fraud/abuse", mode: "risk" },
  { key: "legal_ambiguity_risk", label: "Legal ambiguity", mode: "risk" },
  { key: "misinformation_risk", label: "Misinformation", mode: "risk" },
  { key: "mitigation_readiness", label: "Mitigation readiness", mode: "readiness" },
  { key: "adoption_readiness", label: "Adoption readiness", mode: "readiness" }
];

export function RiskScoreDashboard({ score }: { score: RiskScore }) {
  const radarData = riskDimensions.map((dimension) => ({
    category: dimension.label,
    score: score[dimension.key].score
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Gauge className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Policy Risk Score</span>
            </div>
            <CardTitle>Explainable weighted scenario score</CardTitle>
            <CardDescription>{score.explanation}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <RiskBandBadge band={score.overall_policy_risk.band} />
            <ConfidencePill value={score.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="h-[320px] rounded-md border border-white/10 bg-black/20 p-3">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.14)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0d141d",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#e2e8f0"
                  }}
                />
                <Radar dataKey="score" stroke="#35d5ee" fill="#35d5ee" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
            <div className="mb-2 text-xs font-semibold uppercase text-primary">Overall policy risk</div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-5xl font-semibold text-white">{score.overall_policy_risk.score}</div>
                <div className="mt-1 text-sm text-muted-foreground">0-100 scenario score</div>
              </div>
              <RiskBandBadge band={score.overall_policy_risk.band} />
            </div>
            <div className="mt-4 space-y-2">
              {score.overall_policy_risk.why.map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {riskDimensions.map((dimension) => (
            <RiskDimensionRow
              key={dimension.key}
              label={dimension.label}
              score={score[dimension.key]}
              mode={dimension.mode}
            />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 text-sm font-semibold text-white">Top risk drivers</div>
            <div className="space-y-2">
              {score.top_risk_drivers.map((driver) => (
                <div key={driver} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
                  {driver}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 text-sm font-semibold text-white">Scoring assumptions</div>
            <div className="space-y-2">
              {score.assumptions.map((assumption) => (
                <div key={assumption} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
                  {assumption}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDimensionRow({
  label,
  score,
  mode
}: {
  label: string;
  score: ExplainableRiskScore;
  mode: "risk" | "readiness";
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          <RiskBandBadge band={score.band} readiness={mode === "readiness"} />
          <span className="text-sm text-muted-foreground">{score.score}/100</span>
        </div>
      </div>
      <Progress value={score.score} indicatorClassName={barClass(score.score, mode)} />
      <div className="mt-2 space-y-1">
        {score.why.slice(0, 3).map((why) => (
          <p key={why} className="text-xs leading-5 text-muted-foreground">
            {why}
          </p>
        ))}
      </div>
    </div>
  );
}

function RiskBandBadge({ band, readiness = false }: { band: RiskBand; readiness?: boolean }) {
  const variant = readiness
    ? band === "Critical" || band === "High"
      ? "success"
      : "secondary"
    : band === "Critical" || band === "High"
      ? "warning"
      : band === "Low"
        ? "success"
        : "secondary";

  return <Badge variant={variant}>{band}</Badge>;
}

function barClass(score: number, mode: "risk" | "readiness") {
  if (mode === "readiness") {
    return score >= 61 ? "bg-emerald-400" : score >= 31 ? "bg-primary" : "bg-amber-400";
  }

  return score >= 61 ? "bg-amber-400" : score >= 31 ? "bg-violet-400" : "bg-emerald-400";
}
