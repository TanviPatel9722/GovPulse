import { Banknote, Gauge, Landmark, ShieldAlert, UsersRound, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PolicyAnalysis } from "@/lib/types";

export function AnalysisDashboard({ analysis }: { analysis: PolicyAnalysis }) {
  const metrics = [
    {
      label: "Overall Policy Risk",
      value: analysis.riskScore.overall_policy_risk.score,
      detail: analysis.riskScore.overall_policy_risk.band,
      icon: Gauge,
      tone: "risk"
    },
    {
      label: "Adoption Readiness",
      value: analysis.riskScore.adoption_readiness.score,
      detail: analysis.riskScore.adoption_readiness.band,
      icon: Landmark,
      tone: "ready"
    },
    {
      label: "Public Sentiment",
      value: analysis.riskScore.public_reaction_risk.score,
      detail: "reaction risk",
      icon: UsersRound,
      tone: "risk"
    },
    {
      label: "Economic Exposure",
      value: analysis.riskScore.economic_exposure_risk.score,
      detail: `${analysis.economicExposure.key_indicators.length} indicators`,
      icon: Banknote,
      tone: "risk"
    },
    {
      label: "Fraud/Abuse Risk",
      value: analysis.riskScore.fraud_abuse_risk.score,
      detail: analysis.fraudAbuseRisk.overall_fraud_risk,
      icon: ShieldAlert,
      tone: "risk"
    },
    {
      label: "Implementation Complexity",
      value: analysis.riskScore.implementation_complexity_risk.score,
      detail: analysis.implementationRisk.overallLevel,
      icon: Workflow,
      tone: "risk"
    }
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Analysis Dashboard</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Policy launch posture</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Explainable scores across sentiment, stakeholder, economic, integrity, and implementation risk.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-semibold text-white">{metric.value}</span>
                      <span className="pb-1 text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.05] p-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <Progress
                  value={metric.value}
                  className="mt-4"
                  indicatorClassName={
                    metric.tone === "ready"
                      ? metric.value > 65
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                      : metric.value > 70
                        ? "bg-amber-400"
                        : metric.value > 45
                          ? "bg-violet-400"
                          : "bg-emerald-400"
                  }
                />
                <div className="mt-3 text-xs text-muted-foreground">{metric.detail}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
