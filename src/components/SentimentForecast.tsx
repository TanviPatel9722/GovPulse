"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MessageSquareQuote, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { PublicSentimentGroup, SentimentForecast as SentimentForecastJson } from "@/lib/types";

export function SentimentForecast({ forecast }: { forecast: SentimentForecastJson }) {
  const chartData = forecast.public_groups.map((group) => ({
    ...group,
    displayScore: group.sentiment_score
  }));
  const averageConfidence =
    forecast.public_groups.reduce((sum, group) => sum + group.confidence, 0) /
    Math.max(1, forecast.public_groups.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">People Sentiment Forecast</span>
            </div>
            <CardTitle>Likely public sentiment scenarios</CardTitle>
            <CardDescription>{forecast.overall_sentiment_summary}</CardDescription>
          </div>
          <ConfidencePill value={averageConfidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          Public sentiment and loud online sentiment are tracked separately. Online narratives can amplify risk, but
          they are not treated as representative public opinion without stronger evidence.
        </div>
        <div className="h-[300px] rounded-md border border-white/10 bg-black/20 p-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ left: -18, right: 8, top: 12, bottom: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="group_name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} height={70} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[-100, 100]} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#0d141d",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="displayScore" name="Sentiment score" fill="#35d5ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {forecast.public_groups.map((group) => (
            <SentimentGroupCard key={group.group_name} group={group} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SentimentGroupCard({ group }: { group: PublicSentimentGroup }) {
  const normalizedScore = (group.sentiment_score + 100) / 2;

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-white">{group.group_name}</div>
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant(group.likely_sentiment)}>{group.likely_sentiment}</Badge>
          <ConfidencePill value={group.confidence} />
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Scenario sentiment</span>
            <span>{group.sentiment_score}</span>
          </div>
          <Progress
            value={normalizedScore}
            indicatorClassName={
              group.sentiment_score >= 35 ? "bg-emerald-400" : group.sentiment_score <= -25 ? "bg-amber-400" : "bg-primary"
            }
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <MiniList title="Support drivers" items={group.support_drivers} />
          <MiniList title="Opposition drivers" items={group.opposition_drivers} />
          <MiniList title="Fairness concerns" items={group.fairness_concerns} />
          <MiniList title="Trust concerns" items={group.trust_concerns} />
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{group.likely_quotes[0]}</span>
      </div>
      <div className="mt-3 text-xs leading-5 text-muted-foreground">
        Cited: {group.evidence_card_ids.length > 0 ? group.evidence_card_ids.slice(0, 3).join(", ") : "policy text"}
      </div>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-1 text-xs leading-5 text-slate-300">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function badgeVariant(sentiment: PublicSentimentGroup["likely_sentiment"]) {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "warning";
  if (sentiment === "uncertain") return "secondary";
  return "default";
}
