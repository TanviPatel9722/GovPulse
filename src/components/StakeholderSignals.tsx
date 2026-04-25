import { Activity, Building2, MessageSquareText, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StakeholderIntelligence } from "@/lib/types";

export function StakeholderSignals({ intelligence }: { intelligence: StakeholderIntelligence }) {
  const status = intelligence.crustDataStatus;
  const stakeholders = intelligence.stakeholderObjects ?? [];
  const topPeople = stakeholders.flatMap((stakeholder) =>
    (stakeholder.relevantPeople ?? []).slice(0, 2).map((person) => ({
      ...person,
      stakeholder: stakeholder.name
    }))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">CrustData Signals</span>
            </div>
            <CardTitle>Company, people, and public activity signals</CardTitle>
            <CardDescription>
              CrustData powers stakeholder and company intelligence. It does not represent full public sentiment.
            </CardDescription>
          </div>
          <Badge variant={status?.usedLiveData ? "success" : "secondary"}>
            {status?.usedLiveData ? "CrustData Live" : "Mock Data"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 xl:grid-cols-3">
        <SignalStat icon="company" label="Companies" value={status?.companiesFound ?? intelligence.stakeholders.length} />
        <SignalStat icon="people" label="Decision-makers" value={status?.peopleFound ?? topPeople.length} />
        <SignalStat icon="posts" label="Posts/signals" value={status?.postsFound ?? 0} />

        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 xl:col-span-3">
          <div className="mb-3 text-sm font-semibold text-white">Relevant decision-makers</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {topPeople.slice(0, 6).map((person) => (
              <div key={`${person.stakeholder}-${person.name}-${person.title}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="text-sm font-semibold text-slate-100">{person.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{person.title ?? "Relevant leader"}</div>
                <div className="mt-2 text-xs leading-5 text-primary">{person.stakeholder}</div>
              </div>
            ))}
          </div>
          {status?.warnings?.length ? (
            <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              {status.warnings.slice(0, 2).join(" ")}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SignalStat({ icon, label, value }: { icon: "company" | "people" | "posts"; label: string; value: number }) {
  const Icon = icon === "company" ? Building2 : icon === "people" ? UsersRound : MessageSquareText;

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {label}
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}
