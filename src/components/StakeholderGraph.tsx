"use client";

import { Network, SearchCheck } from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { StakeholderInfluenceLevel, StakeholderIntelligence, StakeholderPosition } from "@/lib/types";

const influenceScores: Record<StakeholderInfluenceLevel, number> = {
  Low: 35,
  Medium: 58,
  High: 76,
  "Very High": 88
};

const positionReadiness: Record<StakeholderPosition, number> = {
  Opposed: 25,
  Concerned: 42,
  Conditional: 63,
  Supportive: 82
};

export function StakeholderGraph({ intelligence }: { intelligence: StakeholderIntelligence }) {
  const data = intelligence.stakeholders.map((stakeholder) => ({
    ...stakeholder,
    x: influenceScores[stakeholder.influence_level],
    y: positionReadiness[stakeholder.likely_position],
    z: 90 + stakeholder.evidence_cards.length * 45
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Network className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">CrustData Stakeholder Intelligence</span>
            </div>
            <CardTitle>Influence versus likely position</CardTitle>
            <CardDescription>{intelligence.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{intelligence.dataMode}</Badge>
            <ConfidencePill value={intelligence.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="h-[300px] rounded-md border border-white/10 bg-black/20 p-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <ScatterChart margin={{ left: -10, right: 18, top: 12, bottom: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Influence"
                domain={[20, 95]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Position readiness"
                domain={[15, 90]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[80, 280]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const item = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="max-w-[300px] rounded-md border border-white/10 bg-[#0d141d] p-3 text-sm text-slate-200 shadow-civic">
                      <div className="font-semibold text-white">{item.company_or_org_name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.industry}</div>
                      <div className="mt-2 text-xs">Influence: {item.influence_level}</div>
                      <div className="text-xs">Likely position: {item.likely_position}</div>
                      <div className="text-xs">Cited: CrustData</div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason_affected}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={data} fill="#35d5ee" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {intelligence.stakeholders.slice(0, 4).map((stakeholder) => (
            <div
              key={stakeholder.company_or_org_name}
              className="rounded-md border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-white">{stakeholder.company_or_org_name}</div>
                <Badge variant={badgeVariantForPosition(stakeholder.likely_position)}>
                  {stakeholder.likely_position}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-300">{stakeholder.reason_affected}</p>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
                <SearchCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {stakeholder.influence_level} influence · {stakeholder.evidence_cards.length} evidence cards ·{" "}
                  {Math.round(stakeholder.confidence * 100)}% confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function badgeVariantForPosition(position: StakeholderPosition) {
  if (position === "Supportive") return "success";
  if (position === "Concerned" || position === "Opposed") return "warning";
  return "secondary";
}
