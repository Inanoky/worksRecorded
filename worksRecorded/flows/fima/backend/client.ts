import type * as actions from "./actions";
import type * as operations from "./operations";
import { fimaRpc } from "./rpc";

type Actions = typeof actions & typeof operations;
async function call<K extends keyof Actions>(
	name: K,
	args: Parameters<Actions[K]>,
): Promise<Awaited<ReturnType<Actions[K]>>> {
	const result = await fimaRpc(name, args);
	if (!result.ok) throw new Error(result.error);
	return result.value as Awaited<ReturnType<Actions[K]>>;
}
export const getFimaWorkspace = (
	...args: Parameters<Actions["getFimaWorkspace"]>
) => call("getFimaWorkspace", args);
export const importFimaRows = (
	...args: Parameters<Actions["importFimaRows"]>
) => call("importFimaRows", args);
export const saveFimaRecord = (
	...args: Parameters<Actions["saveFimaRecord"]>
) => call("saveFimaRecord", args);
export const addFimaRecord = (...args: Parameters<Actions["addFimaRecord"]>) =>
	call("addFimaRecord", args);
export const saveFimaTemplate = (
	...args: Parameters<Actions["saveFimaTemplate"]>
) => call("saveFimaTemplate", args);
export const getFimaHistory = (
	...args: Parameters<Actions["getFimaHistory"]>
) => call("getFimaHistory", args);
export const getFimaCaseResources = (
	...args: Parameters<Actions["getFimaCaseResources"]>
) => call("getFimaCaseResources", args);
export const searchFimaBisHistory = (
	...args: Parameters<Actions["searchFimaBisHistory"]>
) => call("searchFimaBisHistory", args);
export const searchFimaKuceHistory = (
	...args: Parameters<Actions["searchFimaKuceHistory"]>
) => call("searchFimaKuceHistory", args);
export const mergeFimaRows = (...args: Parameters<Actions["mergeFimaRows"]>) =>
	call("mergeFimaRows", args);
export const copyFimaCommonFields = (
	...args: Parameters<Actions["copyFimaCommonFields"]>
) => call("copyFimaCommonFields", args);
export const executeFimaBis = (
	...args: Parameters<Actions["executeFimaBis"]>
) => call("executeFimaBis", args);
export const refreshFimaBis = (
	...args: Parameters<Actions["refreshFimaBis"]>
) => call("refreshFimaBis", args);
export const linkFimaBis = (...args: Parameters<Actions["linkFimaBis"]>) =>
	call("linkFimaBis", args);
export const inspectFimaBis = (
	...args: Parameters<Actions["inspectFimaBis"]>
) => call("inspectFimaBis", args);
