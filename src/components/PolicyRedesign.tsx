import { GitPullRequestArrow, MoveRight, Route, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { PolicyRedesign as PolicyRedesignType, StakeholderConsultationPlanItem } from "@/lib/types";

export function PolicyRedesign({ brief }: { brief: PolicyRedesignType }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <GitPullRequestArrow className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Policy Redesign Engine</span>
            </div>
            <CardTitle>Improve adoption without weakening intent</CardTitle>
            <CardDescription>{brief.original_policy_risk_summary}</CardDescription>
          </div>
          <Badge variant="success">intent preserved</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <ScoreCard
            label="Overall policy risk"
            before={brief.before_after_scores.before_overall_policy_risk}
            after={brief.before_after_scores.after_expected_policy_risk}
            direction="down"
          />
          <ScoreCard
            label="Adoption readiness"
            before={brief.before_after_scores.before_adoption_readiness}
            after={brief.before_after_scores.after_expected_adoption_readiness}
            direction="up"
          />
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Route className="h-4 w-4" aria-hidden="true" />
            Recommended redesign
          </div>
          <p className="text-sm leading-6 text-slate-100">{brief.recommended_redesign}</p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {brief.redesign_options.map((option) => (
            <div key={option.option_title} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{option.option_title}</h3>
                <ConfidencePill value={option.confidence} />
              </div>
              <p className="text-sm leading-6 text-slate-300">{option.policy_change}</p>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
                <MoveRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {option.why_it_helps}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <MiniList title="Tradeoffs" items={option.tradeoffs} />
                <MiniList title="New risks created" items={option.new_risks_created} />
                <MiniList title="Groups helped" items={option.affected_groups_helped} />
                <MiniList title="Implementation steps" items={option.implementation_steps} />
              </div>
              <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                {option.expected_risk_change}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <PlanColumn title="Communication strategy" icon="route" items={brief.communication_strategy} />
          <PlanColumn title="Stakeholder consultation" icon="people" items={brief.stakeholder_consultation_plan} />
          <PlanColumn title="Validation questions" icon="route" items={brief.validation_questions} />
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCard({
  label,
  before,
  after,
  direction
}: {
  label: string;
  before: number;
  after: number;
  direction: "up" | "down";
}) {
  const delta = after - before;
  const good = direction === "down" ? delta < 0 : delta > 0;

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Before</div>
          <div className="text-3xl font-semibold text-white">{before}</div>
        </div>
        <MoveRight className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <div className="text-sm text-muted-foreground">After</div>
          <div className="text-3xl font-semibold text-white">{after}</div>
        </div>
        <Badge variant={good ? "success" : "warning"}>{delta > 0 ? "+" : ""}{delta}</Badge>
      </div>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-1 text-xs leading-5 text-slate-300">
        {items.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PlanColumn({
  title,
  icon,
  items
}: {
  title: string;
  icon: "route" | "people";
  items: string[] | StakeholderConsultationPlanItem[];
}) {
  const Icon = icon === "people" ? UsersRound : Route;

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={planItemKey(item)} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
            {renderPlanItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPlanItem(item: string | StakeholderConsultationPlanItem) {
  if (typeof item === "string") return item;

  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-200">{item.stakeholder}</div>
      <div>{item.reason_to_consult}</div>
      <div className="text-slate-300">Question: {item.suggested_question}</div>
      <div>Expected concern: {item.expected_concern}</div>
    </div>
  );
}

function planItemKey(item: string | StakeholderConsultationPlanItem) {
  return typeof item === "string" ? item : `${item.stakeholder}-${item.suggested_question}`;
}
