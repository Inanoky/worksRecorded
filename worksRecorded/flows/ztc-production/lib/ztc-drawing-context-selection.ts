import {
  readZtcAdditionalWorkContext,
  shouldReuseZtcDrawingContextFromAdditionalWork,
} from "@/flows/ztc-production/lib/ztc-additional-work-context";
import {
  ZTC_CANCELLED_SESSION_PREFIX,
  ZTC_DRAWING_CONTEXT_SUPERSEDED_PREFIX,
} from "@/flows/ztc-production/lib/ztc-session-markers";

export type ZtcDrawingContextCandidate = {
  Comments_Custom_1?: string | null;
  Comments_Custom_2?: string | null;
  Location?: string | null;
  Works_Custom_1?: string | null;
};

export function selectLatestReusableZtcDrawingContext<
  T extends ZtcDrawingContextCandidate,
>(candidates: T[]) {
  for (const candidate of candidates) {
    if (
      candidate.Comments_Custom_1?.startsWith(
        ZTC_DRAWING_CONTEXT_SUPERSEDED_PREFIX,
      )
    ) {
      return null;
    }

    const additionalContext = readZtcAdditionalWorkContext(
      candidate.Comments_Custom_2,
    );
    if (shouldReuseZtcDrawingContextFromAdditionalWork(additionalContext)) {
      return candidate;
    }
    if (additionalContext?.origin === "active_drawing") continue;
    if (candidate.Comments_Custom_1?.startsWith(ZTC_CANCELLED_SESSION_PREFIX)) {
      return null;
    }
    if (
      candidate.Location === "Papilddarbi" ||
      candidate.Works_Custom_1 === "Papilddarbi" ||
      candidate.Works_Custom_1 === "Papilddetāļas"
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}
