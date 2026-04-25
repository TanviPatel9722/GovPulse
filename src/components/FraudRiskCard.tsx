import { AlertTriangle, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { FraudRiskAssessment } from "@/lib/types";

export function FraudRiskCard({ risk }: { risk: FraudRiskAssessment }) {
  const averageConfidence =
    risk.abuse_vectors.reduce((sum, vector) => sum + vector.confidence, 0) / Math.max(1, risk.abuse_vectors.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Fraud and Abuse Pre-Mortem</span>
            </div>
            <CardTitle>Policy design abuse incentives</CardTitle>
            <CardDescription>
              This does not accuse any company or person of fraud. It identifies how a policy design could be
              exploited before launch.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <FraudRiskBadge level={risk.overall_fraud_risk} />
            <ConfidencePill value={averageConfidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-2">
          {risk.abuse_vectors.map((vector) => (
            <div key={vector.name} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  {vector.name}
                </div>
                <ConfidencePill value={vector.confidence} />
              </div>
              <p className="text-sm leading-6 text-slate-300">{vector.description}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <MiniPanel title="Who could exploit" items={vector.who_could_exploit} />
                <MiniPanel title="Warning signals" items={vector.warning_signals} />
              </div>
              <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-slate-200">Design cause:</span> {vector.policy_design_cause}
              </div>
              <div className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
                <span className="font-semibold">Mitigation:</span> {vector.mitigation}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ControlColumn title="Verification controls" items={risk.verification_controls} />
          <ControlColumn title="Audit recommendations" items={risk.audit_recommendations} />
          <ControlColumn title="Data needed for detection" items={risk.data_needed_for_detection} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evidence cards</div>
            <div className="flex flex-wrap gap-2">
              {risk.evidence_card_ids.map((id) => (
                <Badge key={id} variant="secondary">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Limitations</div>
            <div className="space-y-2">
              {risk.limitations.map((limitation) => (
                <div key={limitation} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
                  {limitation}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FraudRiskBadge({ level }: { level: FraudRiskAssessment["overall_fraud_risk"] }) {
  const variant = level === "high" ? "warning" : level === "low" ? "success" : "secondary";
  return <Badge variant={variant}>{level} risk</Badge>;
}

function MiniPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-1 text-xs leading-5 text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ControlColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
