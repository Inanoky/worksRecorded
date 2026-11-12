export async function bisActionResult<T>(run: () => Promise<T>) {
	try {
		return { ok: true as const, data: await run() };
	} catch (error) {
		return {
			ok: false as const,
			error:
				error instanceof Error && !error.name.startsWith("Prisma")
					? error.message
					: "Pieprasījums neizdevās. Mēģiniet vēlreiz.",
		};
	}
}
