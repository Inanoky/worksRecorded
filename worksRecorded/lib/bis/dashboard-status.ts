import {
	getSiteBisConfig,
	getUserBisTokenByUserId,
} from "@/server/actions/BIS/service";

export type DashboardBisStatus = { enabled: boolean; unavailable: boolean };

export async function getDashboardBisStatus(
	userId: string,
	siteId: string,
	supported: boolean,
): Promise<DashboardBisStatus> {
	if (!supported) return { enabled: false, unavailable: false };
	try {
		const config = await getSiteBisConfig(siteId);
		if (!config?.bisCaseId) return { enabled: false, unavailable: false };
		const token = await getUserBisTokenByUserId(userId);
		return { enabled: Boolean(token?.accessToken), unavailable: false };
	} catch (error) {
		const code =
			error &&
			typeof error === "object" &&
			"code" in error &&
			typeof error.code === "string"
				? error.code
				: "BIS_STATUS_UNAVAILABLE";
		if (code !== "BIS_REFRESH_COOLDOWN")
			console.warn("[BIS] Dashboard continues without BIS", {
				userId,
				siteId,
				code,
			});
		return { enabled: false, unavailable: true };
	}
}
