import { revalidateTag } from "next/cache";

export function revalidateUserSitesCache(userId: string) {
  revalidateTag(`dashboard:user:${userId}:sites`);
}

export function revalidateSiteCache(siteId: string) {
  revalidateTag(`dashboard:site:${siteId}:core`);
  revalidateTag(`dashboard:site:${siteId}:invoices`);
  revalidateTag(`dashboard:site:${siteId}:documents`);
  revalidateTag(`dashboard:site:${siteId}:analytics`);
  revalidateTag(`dashboard:site:${siteId}:timesheets`);
}
