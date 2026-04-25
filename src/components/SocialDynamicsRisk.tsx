import { RadioTower, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricSourceBadge } from "@/components/IndustryRippleEffects";
import type { SocialDynamicsRisk as SocialDynamicsRiskType } from "@/lib/types";

export function SocialDynamicsRisk({ risk }: { risk: SocialDynamicsRiskType }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {risk.groups.map((group) => (
        <div key={group.group_name} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-white">
                <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
                {group.group_name}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{group.simulated_effect}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={group.likely_sentiment === "positive" ? "success" : group.likely_sentiment === "negative" ? "warning" : "secondary"}>
                {group.likely_sentiment}
              </Badge>
              <MetricSourceBadge sourceType={group.metric_source_type} />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <MiniMetric label="Misinformation" value={group.misinformation_exposure_risk} />
            <MiniMetric label="Backlash" value={group.protest_or_backlash_risk} />
            <MiniMetric label="Trust sensitivity" value={group.trust_sensitivity} />
            <MiniMetric label="Cost burden" value={group.cost_burden_sensitivity} />
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Main concern</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">{group.main_concern}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Support driver</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">{group.main_support_driver}</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
            <RadioTower className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {group.contagion_or_ripple_impact}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-white/10">
        <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
