jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	},
}));

jest.mock("@/lib/observability/perf", () => ({
	logPerfEvent: jest.fn(),
}));

import { prisma } from "@/lib/utils/db";
import { logPerfEvent } from "@/lib/observability/perf";
import { sendFirstProjectWelcomeTemplateForUserIfNeeded } from "./send-first-project-welcome-template";

const originalEnv = process.env;
const logPerfEventMock = jest.mocked(logPerfEvent);

describe("sendFirstProjectWelcomeTemplateForUserIfNeeded", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env = {
			...originalEnv,
			META_ACCESS_TOKEN: "meta-token",
			META_PHONE_NUMBER_ID: "phone-number-id",
		};
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: "OK",
			text: jest.fn().mockResolvedValue("{}"),
		}) as jest.Mock;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it("skips users who already received the welcome template", async () => {
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			phone: "+371 20000000",
			userTour: { whatsappWelcomeSent: true },
			organization: { orgLanguage: "lv" },
		} as never);

		const result = await sendFirstProjectWelcomeTemplateForUserIfNeeded({
			userId: "user-1",
			siteId: "site-1",
			projectName: "Objekts A",
		});

		expect(result).toEqual({ ok: true, skipped: true, reason: "already-sent" });
		expect(global.fetch).not.toHaveBeenCalled();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("sends the welcome template and marks it sent", async () => {
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			phone: "+371 20000000",
			userTour: { onboardingLanguageSelected: true },
			organization: { orgLanguage: "lv" },
		} as never);

		const result = await sendFirstProjectWelcomeTemplateForUserIfNeeded({
			userId: "user-1",
			siteId: "site-1",
			projectName: "Objekts A",
		});

		expect(result).toEqual({ ok: true, skipped: false, reason: "sent" });
		expect(global.fetch).toHaveBeenCalledWith(
			"https://graph.facebook.com/v18.0/phone-number-id/messages",
			expect.objectContaining({
				method: "POST",
				headers: {
					Authorization: "Bearer meta-token",
					"Content-Type": "application/json",
				},
			}),
		);
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: {
				userTour: {
					onboardingLanguageSelected: true,
					whatsappWelcomeSent: true,
				},
				lastSelectedSiteIdforWhatsapp: "site-1",
			},
		});
	});

	it("logs missing phone skips as onboarding action events", async () => {
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			phone: null,
			userTour: { onboardingLanguageSelected: true },
			organization: { orgLanguage: "lv" },
		} as never);

		const result = await sendFirstProjectWelcomeTemplateForUserIfNeeded({
			userId: "user-1",
			siteId: "site-1",
			projectName: "Objekts A",
		});

		expect(result).toEqual({
			ok: false,
			skipped: true,
			reason: "missing-phone",
		});
		expect(logPerfEventMock).toHaveBeenCalledWith({
			route: "onboarding-whatsapp-welcome",
			category: "action",
			userId: "user-1",
			siteId: "site-1",
			status: 202,
			extra: {
				event: "onboarding_whatsapp_skip",
				reason: "missing-phone",
			},
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("logs invalid phone skips without the raw phone number", async () => {
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			phone: "123",
			userTour: { onboardingLanguageSelected: true },
			organization: { orgLanguage: "lv" },
		} as never);

		const result = await sendFirstProjectWelcomeTemplateForUserIfNeeded({
			userId: "user-1",
			siteId: "site-1",
			projectName: "Objekts A",
		});

		expect(result).toEqual({
			ok: false,
			skipped: true,
			reason: "invalid-phone",
		});
		expect(logPerfEventMock).toHaveBeenCalledWith({
			route: "onboarding-whatsapp-welcome",
			category: "action",
			userId: "user-1",
			siteId: "site-1",
			status: 202,
			extra: {
				event: "onboarding_whatsapp_skip",
				reason: "invalid-phone",
				phoneDigitsLength: 3,
			},
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("logs missing Meta environment skips", async () => {
		process.env = {
			...originalEnv,
			META_ACCESS_TOKEN: "",
			META_PHONE_NUMBER_ID: "",
		};
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			phone: "+371 20000000",
			userTour: { onboardingLanguageSelected: true },
			organization: { orgLanguage: "lv" },
		} as never);

		const result = await sendFirstProjectWelcomeTemplateForUserIfNeeded({
			userId: "user-1",
			siteId: "site-1",
			projectName: "Objekts A",
		});

		expect(result).toEqual({
			ok: false,
			skipped: true,
			reason: "missing-meta-env",
		});
		expect(logPerfEventMock).toHaveBeenCalledWith({
			route: "onboarding-whatsapp-welcome",
			category: "action",
			userId: "user-1",
			siteId: "site-1",
			status: 202,
			extra: {
				event: "onboarding_whatsapp_skip",
				reason: "missing-meta-env",
				hasAccessToken: false,
				hasPhoneNumberId: false,
			},
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
