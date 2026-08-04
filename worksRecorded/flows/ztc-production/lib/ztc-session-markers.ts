export const ZTC_CANCELLED_SESSION_PREFIX = "__ZTC_CANCELLED__";
export const ZTC_DRAWING_CONTEXT_SUPERSEDED_PREFIX =
  "__ZTC_DRAWING_CONTEXT_SUPERSEDED_BY_ADDITIONAL_WORK__";

export function buildZtcNotCancelledWhere() {
  return {
    OR: [
      { Comments_Custom_1: null },
      {
        NOT: {
          Comments_Custom_1: { startsWith: ZTC_CANCELLED_SESSION_PREFIX },
        },
      },
    ],
  };
}
