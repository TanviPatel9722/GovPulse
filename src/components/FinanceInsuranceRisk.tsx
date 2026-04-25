import { Landmark, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricSourceBadge } from "@/components/IndustryRippleEffects";
import type { FinanceInsuranceRisk as FinanceInsuranceRiskType } from "@/lib/types";

export function FinanceInsuranceRisk({ risk }: { risk: FinanceInsuranceRiskType }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {risk.risk_categories.map((item) => (
        <div key={item.risk_name} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
                {item.risk_name}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{item.category.replaceAll("_", " ")}</Badge>
                <MetricSourceBadge sourceType={item.metric_source_type} />
              </div>
            </div>
            <div className="text-sm font-semibold text-white">{Math.round(item.confidence * 100)}%</div>
          </div>
          <p className="text-xs leading-5 text-slate-300">{item.simulated_effect}</p>
          <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Landmark className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {item.metric_value}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{item.monetized_risk_explanation}</p>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <InfoBlock title="Why created" text={item.why_policy_creates_this_risk} />
            <InfoBlock title="Who bears risk" text={item.who_bears_the_risk} />
          </div>
          <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            {item.mitigation}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <p className="mt-2 text-xs leading-5 text-slate-300">{text}</p>
    </div>
  );
}
