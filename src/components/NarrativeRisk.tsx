import { AlertTriangle, Newspaper, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SentimentForecast } from "@/lib/types";

export function NarrativeRisk({ forecast }: { forecast: SentimentForecast }) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Newspaper className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase">Narrative Risk</span>
        </div>
        <CardTitle>Public narrative, confusion, and media framing</CardTitle>
        <CardDescription>
          Scenario language only: these are likely narrative pathways, not deterministic predictions.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <NarrativeColumn title="Support narratives" tone="success" items={forecast.support_narratives} />
        <NarrativeColumn title="Opposition narratives" tone="warning" items={forecast.opposition_narratives} />
        <NarrativeColumn
          title="Misinformation or confusion risks"
          tone="warning"
          items={forecast.misinformation_or_confusion_risks}
          icon="confusion"
        />
        <NarrativeColumn title="Media framing risks" tone="secondary" items={forecast.media_framing_risks} />
        <div className="xl:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
            Validation questions
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {forecast.validation_questions.map((question) => (
              <div key={question} className="rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
                {question}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NarrativeColumn({
  title,
  tone,
  items,
  icon
}: {
  title: string;
  tone: "success" | "warning" | "secondary";
  items: string[];
  icon?: "confusion";
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          {icon === "confusion" ? (
            <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />
          ) : (
            <Newspaper className="h-4 w-4 text-primary" aria-hidden="true" />
          )}
          {title}
        </div>
        <Badge variant={tone}>{items.length} signals</Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
