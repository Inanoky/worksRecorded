import { AsyncLocalStorage } from "node:async_hooks";
import type { RunnableConfig } from "@langchain/core/runnables";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import type { SupportedReplyLanguage } from "./fastPath";

export const SITE_MANAGER_AI_BUDGET_MS = 240_000;

type AiBudget = {
	deadline: number;
	timeout?: SiteManagerAiTimeoutError;
	sideEffectsStarted: boolean;
};

const budgets = new AsyncLocalStorage<AiBudget>();

export class SiteManagerAiTimeoutError extends Error {
	constructor() {
		super("Site manager AI processing deadline exceeded");
		this.name = "SiteManagerAiTimeoutError";
	}
}

export function withSiteManagerAiBudget<T>(work: () => Promise<T>): Promise<T> {
	if (budgets.getStore()) return work();
	const now = Date.now();
	const receivedAt = getWhatsappSourceContext().webhookStartedAtMs;
	const startedAt =
		typeof receivedAt === "number" && Number.isFinite(receivedAt)
			? Math.min(now, receivedAt)
			: now;
	return budgets.run(
		{
			deadline: startedAt + SITE_MANAGER_AI_BUDGET_MS,
			sideEffectsStarted: false,
		},
		work,
	);
}

export function markSiteManagerSideEffectsStarted() {
	const budget = budgets.getStore();
	if (budget) budget.sideEffectsStarted = true;
}

export function getSiteManagerAiTimeout() {
	return budgets.getStore()?.timeout;
}

export function getSiteManagerTimeoutReply(language: SupportedReplyLanguage) {
	if (budgets.getStore()?.sideEffectsStarted) {
		return language === "lv"
			? "Apstrāde aizņēma pārāk ilgu laiku. Neizdevās apstiprināt rezultātu. Pirms atkārtotas nosūtīšanas, lūdzu, pārbaudiet būvdarbu žurnālu."
			: language === "ru"
				? "Обработка заняла слишком много времени. Не удалось подтвердить результат. Перед повторной отправкой проверьте журнал работ."
				: "Processing took too long and we could not confirm the result. Please check the site diary before sending your message again.";
	}
	return language === "lv"
		? "Kaut kas nogāja greizi, un ziņojums netika saglabāts. Lūdzu, nosūtiet ziņojumu vēlreiz."
		: language === "ru"
			? "Что-то пошло не так, и сообщение не было сохранено. Пожалуйста, отправьте сообщение ещё раз."
			: "Something went wrong and your message wasn't saved. Please send your message again.";
}

export async function invokeSiteManagerModel<T>(
	invoke: (config: RunnableConfig) => Promise<T>,
	config: RunnableConfig = {},
): Promise<T> {
	return withSiteManagerAiBudget(async () => {
		const budget = budgets.getStore();
		if (!budget) throw new Error("Site manager AI budget is unavailable");
		if (budget.timeout) throw budget.timeout;
		const timeoutMs = budget.deadline - Date.now();
		const markTimeout = () => {
			budget.timeout = new SiteManagerAiTimeoutError();
			if (config.metadata) config.metadata.siteManagerAiTimedOut = true;
			return budget.timeout;
		};
		if (timeoutMs <= 0) throw markTimeout();
		config.signal?.throwIfAborted();
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;
		let onAbort: (() => void) | undefined;
		const deadline = new Promise<never>((_, reject) => {
			onAbort = () => {
				const error = config.signal?.reason ?? new Error("AI request aborted");
				reject(error);
				controller.abort(error);
			};
			config.signal?.addEventListener("abort", onAbort, { once: true });
			timer = setTimeout(() => {
				const error = markTimeout();
				reject(error);
				controller.abort(error);
			}, timeoutMs);
		});
		try {
			return await Promise.race([
				deadline,
				invoke({ ...config, signal: controller.signal }),
			]);
		} catch (error) {
			if (
				error instanceof Error &&
				error.name === "APIConnectionTimeoutError"
			) {
				throw markTimeout();
			}
			throw error;
		} finally {
			clearTimeout(timer);
			if (onAbort) config.signal?.removeEventListener("abort", onAbort);
		}
	});
}
