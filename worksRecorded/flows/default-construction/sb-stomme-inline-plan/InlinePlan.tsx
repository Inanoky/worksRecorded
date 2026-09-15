"use client";

import { Check, Loader2, MoreHorizontal, X } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSbStommePlanRow } from "@/server/actions/sb-stomme-inline-plan";
import { SB_PLAN_LABELS, type SbPlanField, type SbPlanValues } from "./model";

type Selection = {
	recordId: string;
	expected: SbPlanValues;
	draft: SbPlanValues;
};
const fields: SbPlanField[] = ["weather", "plannedWork", "plannedAmount"];
const Context = createContext<{
	store: Record<string, SbPlanValues>;
	open: (recordId: string) => void;
	selection: Selection | null;
	busy: boolean;
	dirty: boolean;
	error: string;
	edit: (field: SbPlanField, value: string) => void;
	save: () => Promise<void>;
	close: () => void;
	blocked: boolean;
} | null>(null);

function usePlan() {
	const value = useContext(Context);
	if (!value) throw new Error("SB STOMME plan provider missing");
	return value;
}

export function SbPlanProvider({
	records,
	children,
}: {
	records: Array<{ id: string; values: SbPlanValues }>;
	children: ReactNode;
}) {
	const [store, setStore] = useState<Record<string, SbPlanValues>>(() =>
		Object.fromEntries(records.map((record) => [record.id, record.values])),
	);
	const [selection, setSelection] = useState<Selection | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const saving = useRef(false);
	const dirty =
		selection !== null &&
		fields.some(
			(field) =>
				(selection.draft[field] ?? "") !== (selection.expected[field] ?? ""),
		);
	const blocked = busy || dirty;
	useEffect(() => {
		if (!blocked) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		const navigate = (event: MouseEvent) => {
			const link =
				event.target instanceof Element
					? event.target.closest("a[href]")
					: null;
			if (
				link &&
				link.getAttribute("aria-disabled") !== "true" &&
				!window.confirm("Ir nesaglabātas izmaiņas. Atstāt lapu?")
			) {
				event.preventDefault();
				event.stopPropagation();
			}
		};
		window.addEventListener("beforeunload", warn);
		document.addEventListener("click", navigate, true);
		return () => {
			window.removeEventListener("beforeunload", warn);
			document.removeEventListener("click", navigate, true);
		};
	}, [blocked]);

	function close() {
		if (!saving.current) {
			setSelection(null);
			setError("");
		}
	}

	async function save() {
		if (!selection || saving.current || !dirty) return;
		saving.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await saveSbStommePlanRow({
				recordId: selection.recordId,
				values: selection.draft,
				expected: selection.expected,
			});
			if (result.ok) {
				setStore((current) => ({
					...current,
					[selection.recordId]: result.values,
				}));
				setSelection(null);
			} else setError(result.error);
		} catch {
			setError("Neizdevās saglabāt. Mēģiniet vēlreiz.");
		} finally {
			saving.current = false;
			setBusy(false);
		}
	}

	return (
		<Context.Provider
			value={{
				store,
				blocked,
				selection,
				busy,
				dirty,
				error,
				save,
				close,
				edit: (field, value) => {
					if (saving.current) return;
					setError("");
					setSelection(
						(current) =>
							current && {
								...current,
								draft: { ...current.draft, [field]: value },
							},
					);
				},
				open: (recordId) => {
					if (selection || saving.current) return;
					setError("");
					setSelection({
						recordId,
						expected: { ...store[recordId] },
						draft: { ...store[recordId] },
					});
				},
			}}
		>
			{children}
		</Context.Provider>
	);
}

export function SbPlanText({
	recordId,
	field,
	unit,
	showLabel = false,
}: {
	recordId: string;
	field: SbPlanField;
	unit?: string | null;
	showLabel?: boolean;
}) {
	const { store, selection, busy, error, edit, save, close } = usePlan();
	const id = useId();
	if (selection?.recordId === recordId) {
		const props = {
			id,
			"aria-label": SB_PLAN_LABELS[field],
			"aria-invalid": Boolean(error),
			"aria-describedby":
				error && field === "plannedWork" ? `${id}-error` : undefined,
			value: selection.draft[field] ?? "",
			disabled: busy,
			className: "w-full min-w-0 bg-background text-sm",
			onChange: (
				event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
			) => edit(field, event.target.value),
			onKeyDown: (
				event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
			) => {
				if (event.nativeEvent.isComposing) return;
				if (event.key === "Escape") {
					event.preventDefault();
					close();
				}
				if (
					event.key === "Enter" &&
					(field !== "plannedWork" || event.ctrlKey || event.metaKey)
				) {
					event.preventDefault();
					void save();
				}
			},
		};
		return (
			<div className="min-w-0 space-y-1 whitespace-normal text-left">
				{showLabel ? (
					<label htmlFor={id} className="text-xs text-muted-foreground">
						{SB_PLAN_LABELS[field]}
					</label>
				) : null}
				{field === "plannedWork" ? (
					<Textarea {...props} maxLength={200} rows={2} />
				) : (
					<Input
						{...props}
						maxLength={field === "weather" ? 200 : 40}
						inputMode={field === "plannedAmount" ? "decimal" : "text"}
					/>
				)}
				{field === "plannedAmount" && unit ? (
					<span className="text-xs text-muted-foreground">{unit}</span>
				) : null}
				{field === "plannedWork" && error ? (
					<p
						id={`${id}-error`}
						role="alert"
						className="break-words text-xs text-destructive"
					>
						{error}
					</p>
				) : null}
			</div>
		);
	}
	const value = store[recordId][field];
	const text =
		value?.trim() && !(field === "plannedAmount" && Number(value) === 0)
			? `${value}${field === "plannedAmount" && unit ? ` ${unit}` : ""}`
			: "—";
	return (
		<div className="min-w-0 whitespace-pre-wrap break-words">
			{showLabel ? (
				<div className="text-xs text-muted-foreground">
					{SB_PLAN_LABELS[field]}
				</div>
			) : null}
			<span>{text}</span>
		</div>
	);
}

export function SbRowActions({
	recordId,
	label,
}: {
	recordId: string;
	label: string;
}) {
	const { open, selection, busy, dirty, save, close } = usePlan();
	if (selection?.recordId === recordId) {
		return (
			<fieldset
				className="flex flex-col items-center gap-1"
				aria-label={`Rediģēšana: ${label}`}
			>
				<Button
					type="button"
					size="icon"
					className="h-8 w-8"
					disabled={busy || !dirty}
					aria-label={busy ? "Saglabā..." : "Saglabāt"}
					title="Saglabāt"
					onClick={() => void save()}
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Check className="h-4 w-4" />
					)}
				</Button>
				<Button
					type="button"
					size="icon"
					variant="outline"
					className="h-8 w-8"
					disabled={busy}
					aria-label="Atcelt"
					title="Atcelt"
					onClick={close}
				>
					<X className="h-4 w-4" />
				</Button>
			</fieldset>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Darbības: ${label}`}
					disabled={selection !== null}
					title={
						selection
							? "Vispirms saglabājiet vai atceliet pašreizējās rindas izmaiņas."
							: undefined
					}
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => open(recordId)}>
					Rediģēt
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function SbExportLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	const { blocked } = usePlan();
	return (
		<Button asChild variant="outline" size="sm">
			<a
				href={href}
				aria-disabled={blocked}
				className={blocked ? "opacity-50" : ""}
				onClick={(event) => {
					if (blocked) event.preventDefault();
				}}
			>
				{children}
			</a>
		</Button>
	);
}
