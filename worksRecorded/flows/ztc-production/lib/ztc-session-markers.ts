export const ZTC_CANCELLED_SESSION_PREFIX = "__ZTC_CANCELLED__";

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
