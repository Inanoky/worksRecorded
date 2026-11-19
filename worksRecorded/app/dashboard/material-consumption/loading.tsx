export default function MaterialConsumptionLoading() {
	return (
		<div
			className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6"
			aria-busy="true"
		>
			<output className="sr-only">Ielādē materiālu patēriņu</output>
			<div className="h-9 w-64 max-w-full rounded-md bg-muted" />
			<div className="grid gap-4 sm:grid-cols-3">
				{[0, 1, 2].map((key) => (
					<div key={key} className="h-28 rounded-lg border bg-muted/40" />
				))}
			</div>
			<div className="h-24 rounded-lg border bg-muted/40" />
			<div className="h-80 rounded-lg border bg-muted/40" />
		</div>
	);
}
