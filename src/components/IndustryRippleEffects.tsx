import { Factory, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IndustryRippleEffects as IndustryRippleEffectsType, MetricSourceType } from "@/lib/types";

export function IndustryRippleEffects({ effects }: { effects: IndustryRippleEffectsType }) {
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-semibold">Affected Industry</th>
            <th className="px-3 py-3 font-semibold">Simulated Effect</th>
            <th className="px-3 py-3 font-semibold">Ripple Impact</th>
            <th className="px-3 py-3 font-semibold">Labor / Supply</th>
            <th className="px-3 py-3 font-semibold">Confidence</th>
            <th className="px-3 py-3 font-semibold">Source Type</th>
          </tr>
        </thead>
        <tbody>
          {effects.industries.map((industry) => (
            <tr key={industry.industry_name} className="border-t border-white/10 align-top">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Factory className="h-4 w-4 text-primary" aria-hidden="true" />
                  {industry.industry_name}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {industry.effect_type.replaceAll("_", " ")}
                </Badge>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">
                  {industry.affected_companies_or_segments.slice(0, 3).join(", ")}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="max-w-[260px] text-xs leading-5 text-slate-300">{industry.simulated_effect}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {industry.metric_value}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="max-w-[280px] text-xs leading-5 text-slate-300">{industry.key_ripple_effect}</div>
              </td>
              <td className="px-3 py-3">
                <div className="max-w-[280px] text-xs leading-5 text-muted-foreground">{industry.labor_effect}</div>
                <div className="mt-2 max-w-[280px] text-xs leading-5 text-muted-foreground">
                  {industry.supply_demand_effect}
                </div>
              </td>
              <td className="px-3 py-3 text-sm font-semibold text-white">
                {Math.round(industry.confidence * 100)}%
              </td>
              <td className="px-3 py-3">
                <MetricSourceBadge sourceType={industry.metric_source_type} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricSourceBadge({ sourceType }: { sourceType: MetricSourceType }) {
  const label: Record<MetricSourceType, string> = {
    "source-backed": "Source-backed",
    "model-estimated": "Model-estimated",
    "scenario-assumption": "Scenario assumption",
    "placeholder-demo-estimate": "Demo estimate"
  };

  const variant: Record<MetricSourceType, "success" | "default" | "warning" | "secondary"> = {
    "source-backed": "success",
    "model-estimated": "default",
    "scenario-assumption": "warning",
    "placeholder-demo-estimate": "secondary"
  };

  return <Badge variant={variant[sourceType]}>{label[sourceType]}</Badge>;
}
