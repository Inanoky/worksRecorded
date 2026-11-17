import "server-only";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function getHomeDestination(locale = "lv") {
  const landing = `/${["lv", "en", "ru"].includes(locale) ? locale : "lv"}/Landing`;
  try {
    const session = getKindeServerSession();
    const [accessToken, idToken] = await Promise.all([
      session.getAccessToken(),
      session.getIdToken(),
    ]);
    const now = Math.floor(Date.now() / 1000);
    return accessToken?.sub &&
      accessToken.sub === idToken?.sub &&
      accessToken.exp > now &&
      idToken.exp > now
      ? "/dashboard"
      : landing;
  } catch {
    return landing;
  }
}
