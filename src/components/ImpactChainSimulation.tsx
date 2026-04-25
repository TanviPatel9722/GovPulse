"use client";

import { useMemo, useState } from "react";
import { GitBranch, ShieldCheck } from "lucide-react";
import { FinanceInsuranceRisk } from "@/components/FinanceInsuranceRisk";
import { IndustryRippleEffects } from "@/components/IndustryRippleEffects";
import { SocialDynamicsRisk } from "@/components/SocialDynamicsRisk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FinanceInsuranceRisk as FinanceInsuranceRiskType,
  ImpactChainSimulation as ImpactChainSimulationType,
  IndustryRippleEffects as IndustryRippleEffectsType,
  SocialDynamicsRisk as SocialDynamicsRiskType
} from "@/lib/types";

type TabKey = "industry" | "social" | "finance" | "mitigation";

export function ImpactChainSimulation({
  simulation,
  industryRippleEffects,
  socialDynamicsRisk,
  financeInsuranceRisk
}: {
  simulation: ImpactChainSimulationType;
  industryRippleEffects: IndustryRippleEffectsType;
  socialDynamicsRisk: SocialDynamicsRiskType;
  financeInsuranceRisk: FinanceInsuranceRiskType;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("industry");
  const tabs = useMemo(
    () => [
      { key: "industry" as const, label: "Industry Ripple Effects" },
      { key: "social" as const, label: "People & Social Dynamics" },
      { key: "finance" as const, label: "Finance / Insurance Risk" },
      { key: "mitigation" as const, label: "Mitigation Pathways" }
    ],
    []
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Predictive Chain-Reaction Simulation
              </span>
            </div>
            <CardTitle>{simulation.policy_title}</CardTitle>
            <CardDescription>{simulation.overall_chain_reaction_summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">{simulation.simulation_horizon}</Badge>
            <Badge variant="secondary">scenario forecast</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Signal label="Highest-risk chain" value={simulation.highest_risk_chain} />
          <Signal label="Fastest-moving chain" value={simulation.fastest_moving_chain} />
          <Signal label="Most mitigatable" value={simulation.most_mitigatable_chain} />
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "industry" ? <IndustryRippleEffects effects={industryRippleEffects} /> : null}
        {activeTab === "social" ? <SocialDynamicsRisk risk={socialDynamicsRisk} /> : null}
        {activeTab === "finance" ? <FinanceInsuranceRisk risk={financeInsuranceRisk} /> : null}
        {activeTab === "mitigation" ? <MitigationPathways simulation={simulation} /> : null}

        {simulation.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
            {simulation.warnings.join(" ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function MitigationPathways({ simulation }: { simulation: ImpactChainSimulationType }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {simulation.impact_chains.map((chain) => (
        <div key={chain.chain_id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">{chain.policy_lever}</div>
              <div className="mt-1 text-xs text-muted-foreground">{chain.chain_id}</div>
            </div>
            <Badge variant="secondary">{Math.round(chain.confidence * 100)}% confidence</Badge>
          </div>
          <div className="space-y-2 text-xs leading-5 text-muted-foreground">
            <p>
              <span className="text-slate-200">First order:</span> {chain.first_order_effect}
            </p>
            <p>
              <span className="text-slate-200">Second order:</span> {chain.second_order_effect}
            </p>
            <p>
              <span className="text-slate-200">Third order:</span> {chain.third_order_effect}
            </p>
          </div>
          <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mitigation
            </div>
            {chain.mitigation_option}
          </div>
        </div>
      ))}
    </div>
  );
}
