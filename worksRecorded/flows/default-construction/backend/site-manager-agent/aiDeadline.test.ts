import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
	getSiteManagerTimeoutReply,
	invokeSiteManagerModel,
	markSiteManagerSideEffectsStarted,
	SITE_MANAGER_AI_BUDGET_MS,
	SiteManagerAiTimeoutError,
	withSiteManagerAiBudget,
} from "./aiDeadline";

describe("site manager AI deadline", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("aborts a hung model and ignores a late response", async () => {
		let signal: AbortSignal | undefined;
		let resolveModel!: (value: string) => void;
		const save = jest.fn();
		const metadata = {};
		const result = invokeSiteManagerModel(
			(config) => {
				signal = config.signal;
				return new Promise<string>((resolve) => {
					resolveModel = resolve;
				});
			},
			{ metadata },
		).then(save);
		const assertion = expect(result).rejects.toBeInstanceOf(
			SiteManagerAiTimeoutError,
		);
		await jest.advanceTimersByTimeAsync(SITE_MANAGER_AI_BUDGET_MS);
		await assertion;
		expect(signal?.aborted).toBe(true);
		expect(metadata).toEqual({ siteManagerAiTimedOut: true });
		resolveModel("late model output");
		await Promise.resolve();
		expect(save).not.toHaveBeenCalled();
		expect(jest.getTimerCount()).toBe(0);
	});

	it("clears the deadline after a successful call", async () => {
		await expect(invokeSiteManagerModel(async () => "ok")).resolves.toBe("ok");
		expect(jest.getTimerCount()).toBe(0);
	});

	it("allows one healthy model call to take longer than 60 seconds", async () => {
		const result = invokeSiteManagerModel(
			() =>
				new Promise<string>((resolve) => {
					setTimeout(() => resolve("completed"), 120_000);
				}),
		);
		await jest.advanceTimersByTimeAsync(120_000);
		await expect(result).resolves.toBe("completed");
		expect(jest.getTimerCount()).toBe(0);
	});

	it("counts routing and preprocessing time from webhook arrival", async () => {
		const webhookStartedAtMs = Date.now() - 200_000;
		await runWithWhatsappSourceContext({ webhookStartedAtMs }, async () => {
			const result = invokeSiteManagerModel(() => new Promise(() => {}));
			const assertion = expect(result).rejects.toBeInstanceOf(
				SiteManagerAiTimeoutError,
			);
			await jest.advanceTimersByTimeAsync(40_000);
			await assertion;
		});
	});

	it("does not restart the deadline for another agent invocation in the same webhook", async () => {
		const webhookStartedAtMs = Date.now();
		await runWithWhatsappSourceContext({ webhookStartedAtMs }, async () => {
			await withSiteManagerAiBudget(() =>
				invokeSiteManagerModel(async () => "first"),
			);
			await jest.advanceTimersByTimeAsync(230_000);
			const result = withSiteManagerAiBudget(() =>
				invokeSiteManagerModel(() => new Promise(() => {})),
			);
			const assertion = expect(result).rejects.toBeInstanceOf(
				SiteManagerAiTimeoutError,
			);
			await jest.advanceTimersByTimeAsync(10_000);
			await assertion;
		});
	});

	it("does not start a model once the webhook AI deadline has passed", async () => {
		await runWithWhatsappSourceContext(
			{ webhookStartedAtMs: Date.now() - 241_000 },
			async () => {
				const invoke = jest.fn();
				await expect(invokeSiteManagerModel(invoke)).rejects.toBeInstanceOf(
					SiteManagerAiTimeoutError,
				);
				expect(invoke).not.toHaveBeenCalled();
			},
		);
	});

	it("shares the remaining time across successful extraction and a stalled checker", async () => {
		await withSiteManagerAiBudget(async () => {
			const extraction = invokeSiteManagerModel(
				() =>
					new Promise<string>((resolve) => {
						setTimeout(() => resolve("rows"), 150_000);
					}),
			);
			await jest.advanceTimersByTimeAsync(150_000);
			await expect(extraction).resolves.toBe("rows");
			const checker = invokeSiteManagerModel(() => new Promise(() => {}));
			const assertion = expect(checker).rejects.toBeInstanceOf(
				SiteManagerAiTimeoutError,
			);
			await jest.advanceTimersByTimeAsync(90_000);
			await assertion;
		});
	});

	it("shares the total budget across nested extraction and repair", async () => {
		await withSiteManagerAiBudget(async () => {
			await invokeSiteManagerModel(async () => "first");
			jest.setSystemTime(Date.now() + SITE_MANAGER_AI_BUDGET_MS - 10);
			await withSiteManagerAiBudget(async () => {
				const result = invokeSiteManagerModel(() => new Promise(() => {}));
				const assertion = expect(result).rejects.toBeInstanceOf(
					SiteManagerAiTimeoutError,
				);
				await jest.advanceTimersByTimeAsync(10);
				await assertion;
			});
			const retry = jest.fn();
			await expect(invokeSiteManagerModel(retry)).rejects.toBeInstanceOf(
				SiteManagerAiTimeoutError,
			);
			expect(retry).not.toHaveBeenCalled();
		});
	});

	it("honors parent cancellation without waiting for the timer", async () => {
		const parent = new AbortController();
		let signal: AbortSignal | undefined;
		const result = invokeSiteManagerModel(
			(config) => {
				signal = config.signal;
				return new Promise(() => {});
			},
			{ signal: parent.signal },
		);
		const error = new Error("request cancelled");
		const assertion = expect(result).rejects.toBe(error);
		parent.abort(error);
		await assertion;
		expect(signal?.aborted).toBe(true);
		expect(jest.getTimerCount()).toBe(0);
	});

	it("does not claim nothing was saved after side effects started", async () => {
		await withSiteManagerAiBudget(async () => {
			expect(getSiteManagerTimeoutReply("en")).toContain("wasn't saved");
			markSiteManagerSideEffectsStarted();
			expect(getSiteManagerTimeoutReply("en")).toContain(
				"check the site diary before",
			);
			expect(getSiteManagerTimeoutReply("lv")).toContain(
				"pārbaudiet būvdarbu žurnālu",
			);
			expect(getSiteManagerTimeoutReply("ru")).toContain(
				"проверьте журнал работ",
			);
		});
		await withSiteManagerAiBudget(async () => {
			expect(getSiteManagerTimeoutReply("en")).toContain("wasn't saved");
		});
	});

	it("normalizes the SDK timeout and prevents another model attempt", async () => {
		await withSiteManagerAiBudget(async () => {
			const error = new Error("provider timeout");
			error.name = "APIConnectionTimeoutError";
			await expect(
				invokeSiteManagerModel(async () => {
					throw error;
				}),
			).rejects.toBeInstanceOf(SiteManagerAiTimeoutError);
			const retry = jest.fn();
			await expect(invokeSiteManagerModel(retry)).rejects.toBeInstanceOf(
				SiteManagerAiTimeoutError,
			);
			expect(retry).not.toHaveBeenCalled();
		});
	});
});
