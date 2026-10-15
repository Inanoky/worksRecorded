"use server";
import * as actions from "./actions";
import * as operations from "./operations";

const handlers = { ...actions, ...operations };
export async function fimaRpc(
	name: keyof typeof handlers,
	args: unknown[],
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
	if (!Object.hasOwn(handlers, name) || !Array.isArray(args))
		return { ok: false, error: "Nederīga FIMA darbība" };
	try {
		const handler = handlers[name] as (...args: unknown[]) => Promise<unknown>;
		return { ok: true, value: await handler(...args) };
	} catch (error) {
		const code = (error as { code?: string })?.code;
		if (code)
			return {
				ok: false,
				error:
					code === "P2021"
						? "FIMA reģistrs vēl nav aktivizēts. Administratoram jāpiemēro FIMA datubāzes migrācija."
						: code === "P2002"
							? "Šāda rinda vai BIS izveides operācija jau pastāv. Atjaunojiet pārskatu un pārbaudiet esošo ierakstu."
							: "Datus nevarēja saglabāt vai nolasīt. Atjaunojiet pārskatu un pārbaudiet operāciju žurnālu.",
			};
		const message =
			error instanceof Error ? error.message : "Darbība neizdevās";
		return {
			ok: false,
			error: message.startsWith("NEXT_")
				? "Sesija beigusies. Atjaunojiet lapu un piesakieties vēlreiz."
				: message,
		};
	}
}
