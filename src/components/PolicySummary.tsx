import { Building2, FileText, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { ParsedPolicy } from "@/lib/types";

export function PolicySummary({ policy }: { policy: ParsedPolicy }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{policy.policyName}</CardTitle>
            <CardDescription>{policy.jurisdiction} · {policy.likelySponsor}</CardDescription>
          </div>
          <ConfidencePill value={policy.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryBlock icon={FileText} title="Mechanisms" items={policy.mechanisms} />
          <SummaryBlock icon={Building2} title="Affected parties" items={policy.affectedParties.slice(0, 4)} />
          <SummaryBlock icon={ListChecks} title="Compliance triggers" items={policy.complianceTriggers} />
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-white">Parsed policy</span>
            <Badge variant="secondary">{policy.likelyTimeline}</Badge>
          </div>
          <p className="text-sm leading-6 text-slate-300">{policy.policyText}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Assumptions</div>
            <ul className="space-y-2 text-sm leading-5 text-slate-300">
              {policy.assumptions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evidence</div>
            <div className="space-y-2">
              {policy.sources.map((source) => (
                <div key={source.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-sm font-medium text-slate-100">{source.label}</div>
                  <div className="text-xs leading-5 text-muted-foreground">{source.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBlock({
  icon: Icon,
  title,
  items
}: {
  icon: typeof FileText;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
