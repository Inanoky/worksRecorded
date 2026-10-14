export class BisRefreshCooldown {
	private failures = new Map<string, { version: string; retryAt: number }>();
	constructor(
		private durationMs = 60_000,
		private limit = 1000,
	) {}
	get(userId: string, version: string) {
		const failure = this.failures.get(userId);
		if (!failure) return null;
		if (failure.retryAt <= Date.now()) {
			this.failures.delete(userId);
			return null;
		}
		if (failure.version !== version) return null;
		return failure.retryAt;
	}
	fail(userId: string, version: string) {
		for (const [id, failure] of this.failures)
			if (failure.retryAt <= Date.now()) this.failures.delete(id);
		this.failures.delete(userId);
		if (this.failures.size >= this.limit) {
			const oldest = this.failures.keys().next().value;
			if (oldest) this.failures.delete(oldest);
		}
		this.failures.set(userId, {
			version,
			retryAt: Date.now() + this.durationMs,
		});
	}
	clear(userId: string) {
		this.failures.delete(userId);
	}
}
