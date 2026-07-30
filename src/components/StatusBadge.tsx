import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { MatchStatus } from "@/lib/types";

const config: Record<MatchStatus, { tone: BadgeTone; label: string }> = {
  match: { tone: "ok", label: "Match" },
  partial: { tone: "warn", label: "Partial match" },
  structural: { tone: "warn", label: "No counterpart" },
  mismatch: { tone: "danger", label: "Mismatch" },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const { tone, label } = config[status];
  return <Badge tone={tone}>{label}</Badge>;
}
