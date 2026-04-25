import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatConfidence } from "@/lib/utils";

export function ConfidencePill({ value }: { value: number }) {
  return (
    <Badge variant="secondary" className="gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
      {formatConfidence(value)}
    </Badge>
  );
}
