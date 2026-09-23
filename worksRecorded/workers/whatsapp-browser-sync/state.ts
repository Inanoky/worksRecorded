import {
	mkdir,
	open,
	readFile,
	rename,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";

export type BrowserSyncState = {
	processedSourceIds: string[];
	updatedAt: string;
};

const EMPTY_STATE: BrowserSyncState = {
	processedSourceIds: [],
	updatedAt: new Date(0).toISOString(),
};

export async function readBrowserSyncState(filePath: string) {
	try {
		const parsed = JSON.parse(
			await readFile(filePath, "utf8"),
		) as BrowserSyncState;
		if (!Array.isArray(parsed.processedSourceIds)) return EMPTY_STATE;
		return parsed;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_STATE;
		throw error;
	}
}

export async function writeBrowserSyncState(
	filePath: string,
	state: BrowserSyncState,
) {
	await mkdir(path.dirname(filePath), { recursive: true });
	const temporaryPath = `${filePath}.${process.pid}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
	await rename(temporaryPath, filePath);
}

export async function acquireWorkerLock(lockPath: string) {
	await mkdir(path.dirname(lockPath), { recursive: true });
	try {
		return await open(lockPath, "wx");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		const lockStat = await stat(lockPath).catch(() => null);
		if (!lockStat || Date.now() - lockStat.mtimeMs <= 2 * 60 * 60 * 1_000) {
			throw new Error(
				"Another WhatsApp browser sync process is already running",
			);
		}
		await unlink(lockPath);
		return open(lockPath, "wx");
	}
}

export async function releaseWorkerLock(
	handle: Awaited<ReturnType<typeof open>>,
	lockPath: string,
) {
	await handle.close();
	await unlink(lockPath).catch(() => undefined);
}
