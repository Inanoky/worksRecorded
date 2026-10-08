import { refreshBisAccessToken } from "@/server/actions/BIS/service";

export async function refreshToken(userId: string) {
  return refreshBisAccessToken(userId);
}
