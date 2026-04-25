"use client";

import { BarChart3, DollarSign, Landmark, Scale } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { EconomicExposure as EconomicExposureType } from "@/lib/types";

export function EconomicExposure({ exposure }: { exposure: EconomicExposureType }) {
  const chartData = [
    { label: "Household", score: scoreExposureText(exposure.household_exposure) },
    { label: "Business", score: scoreExposureText(exposure.business_exposure) },
    { label: "Labor", score: scoreExposureText(exposure.labor_market_exposure) },
    { label: "Industry", score: scoreExposureText(exposure.industry_exposure) },
    { label: "Cost of living", score: scoreExposureText(exposure.cost_of_living_sensitivity) },
    { label: "Equity", score: scoreExposureText(exposure.equity_sensitivity) }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Economic Exposure</span>
            </div>
            <CardTitle>Material pressure behind sentiment</CardTitle>
            <CardDescription>
              Costs, benefits, burdens, and macro context that may shape public and stakeholder reaction.
            </CardDescription>
          </div>
          <ConfidencePill value={exposure.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <ExposureBlock icon={DollarSign} title="Household exposure" body={exposure.household_exposure} />
          <ExposureBlock icon={Landmark} title="Business exposure" body={exposure.business_exposure} />
          <ExposureBlock icon={BarChart3} title="Labor market exposure" body={exposure.labor_market_exposure} />
          <ExposureBlock icon={Scale} title="Industry exposure" body={exposure.industry_exposure} />
          <ExposureBlock icon={DollarSign} title="Cost of living sensitivity" body={exposure.cost_of_living_sensitivity} />
          <ExposureBlock icon={Scale} title="Equity sensitivity" body={exposure.equity_sensitivity} />
        </div>

        <div className="h-[260px] rounded-md border border-white/10 bg-black/20 p-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 34, right: 8, top: 10, bottom: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={112} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0d141d",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="score" name="Pressure signal" fill="#a78bfa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Regional economic context</div>
          <p className="text-sm leading-6 text-slate-300">{exposure.regional_economic_context}</p>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">Key indicators</div>
            <Badge variant="secondary">{exposure.key_indicators.length} indicators</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {exposure.key_indicators.map((indicator) => (
              <div key={indicator.evidence_card_id + indicator.indicator_name} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{indicator.indicator_name}</span>
                  <Badge variant="secondary">{indicator.source}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-300">{indicator.value}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {indicator.geography} · evidence {indicator.evidence_card_id}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Limitations</div>
            <div className="space-y-2">
              {exposure.limitations.map((limitation) => (
                <div key={limitation} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
                  {limitation}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Assumptions</div>
            <div className="space-y-2">
              {exposure.assumptions.map((assumption) => (
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

function ExposureBlock({
  icon: Icon,
  title,
  body
}: {
  icon: typeof DollarSign;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <p className="text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function scoreExposureText(text: string) {
  let score = 42;
  if (/cost|burden|pressure|sensitive|friction|delays?|compliance/i.test(text)) score += 18;
  if (/small|poverty|housing|low-income|vulnerable|equity/i.test(text)) score += 16;
  if (/audit|legal|vendor|contract|workflow/i.test(text)) score += 12;
  if (/benefit|improve|trust|access/i.test(text)) score -= 5;
  return Math.max(0, Math.min(100, score));
}
