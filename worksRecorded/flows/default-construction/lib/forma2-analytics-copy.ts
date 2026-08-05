const COPY = {
	en: {
		title: "Analytics",
		description:
			"Import Forma 2, assign factual work and material spending, and reconcile the result.",
		importTitle: "Forma 2 document",
		importDescription:
			"Upload an XLS or XLSX file. AI extracts the positions, and nothing is saved until you confirm the reviewed result.",
		chooseFile: "Choose Forma 2",
		replaceFile: "Replace Forma 2",
		analyzing: "Analyzing Forma 2",
		uploadingAndAnalyzing: "Uploading and analyzing Forma 2",
		readingWorkbook: "Reading workbook",
		selectingWorksheets: "Finding Forma 2 worksheets",
		selectedWorksheets: (count: number) =>
			`Found ${count} worksheet${count === 1 ? "" : "s"} for AI analysis`,
		analyzingWorksheet: (sheetName: string, completed: number, total: number) =>
			`AI is analyzing “${sheetName}” (${completed}/${total} completed)`,
		receivingAiResult: (sheetName: string, completed: number, total: number) =>
			`Receiving extracted positions from “${sheetName}” (${completed}/${total} completed)`,
		finalizingExtraction: "Checking extracted positions",
		elapsedTime: (value: string) => `Elapsed ${value}`,
		longAiWait:
			"Large worksheets can take a few minutes. AI is still working; keep this page open.",
		savingPositions: "Saving Forma 2 and synchronizing Darbi options",
		assigningRecords: "Assigning work and material records",
		finishingImport: "Finishing import",
		detectedSheet: "Detected sheet",
		positions: "positions",
		import: "Import positions",
		importing: "Importing",
		imported: "Imported",
		clear: "Remove import",
		overview: "Overview",
		mapping: "Record mapping",
		results: "Forma 2 results",
		exportExcel: "Export to Excel",
		exportingExcel: "Exporting",
		exportError: "Could not export Forma 2 to Excel.",
		category: "Category",
		editContract: "Edit contract values",
		editContractTitle: "Edit Forma 2 contract values",
		editContractDescription:
			"Changing work, materials, or mechanisms recalculates the total; the total can also be adjusted directly.",
		plannedMechanisms: "Contract mechanisms",
		invalidContractValue:
			"Enter valid contract values and a non-negative quantity.",
		contractUpdated: "Forma 2 contract values updated.",
		cancel: "Cancel",
		save: "Save",
		saving: "Saving",
		planned: "Contract value",
		factual: "Factual spending",
		assigned: "Assigned spending",
		unassigned: "Unassigned spending",
		balance: "Remaining balance",
		coverage: "Mapping coverage",
		recordsAssigned: "records assigned",
		noDocument: "Upload and import Forma 2 to start mapping factual records.",
		mappingTitle: "Assign factual records",
		mappingDescription:
			"Work records map to work positions. Materials map to material rows, or to a parent work position when Forma 2 has no material breakdown.",
		search: "Search records",
		allTypes: "All types",
		allAssignments: "All assignments",
		assignedOnly: "Assigned",
		unassignedOnly: "Unassigned",
		filter: "Filter",
		applySuggestions: "Auto-assign unassigned records",
		applying: "Applying",
		source: "Factual record",
		type: "Type",
		quantity: "Quantity",
		actualCost: "Factual cost",
		position: "Forma 2 position",
		suggested: "Suggested",
		unassignedOption: "Unassigned",
		work: "Work",
		material: "Material",
		mechanism: "Mechanism",
		noRecords: "No matching records.",
		resultsDescription:
			"Contract costs come from Forma 2. Factual costs come only from assigned WorksRecorded records. Click a factual amount to see its calculation and included records.",
		codeAndName: "Position",
		unit: "Unit",
		contractQuantity: "Contract quantity",
		plannedWork: "Contract work",
		plannedMaterials: "Contract materials",
		plannedTotal: "Contract total",
		actualWork: "Factual work",
		actualMaterials: "Factual materials",
		actualTotal: "Factual total",
		remaining: "Remaining",
		total: "Total",
		unpricedWarning: "records do not yet have a calculable factual cost.",
		parseError: "Could not extract Forma 2 positions from this workbook.",
		importSuccess: "Forma 2 positions imported.",
		importAndAssignmentSuccess: (count: number) =>
			`Forma 2 imported; ${count} factual records were assigned automatically.`,
		assignmentWarning:
			"Forma 2 was imported, but automatic assignment did not finish. Records can still be assigned manually.",
		saveError: "Could not save the change.",
		clearConfirm:
			"Remove the imported Forma 2, all assignments, and associated Darbi options? Existing journal records will remain unchanged.",
		noSuggestions: "No confident suggestions are available on this page.",
		suggestionsApplied: (count: number) =>
			`Automatic assignment completed; ${count} additional records assigned.`,
		assignTitle: "Assign record",
		assignDescription: "Choose one compatible Forma 2 position.",
		positionSearch: "Search positions",
		previous: "Previous",
		next: "Next",
		showing: "Showing",
		of: "of",
	},
	lv: {
		title: "Analītika",
		description:
			"Importējiet Formu 2, piesaistiet faktiskās darbu un materiālu izmaksas un pārbaudiet rezultātu.",
		importTitle: "Forma 2 dokuments",
		importDescription:
			"Augšupielādējiet XLS vai XLSX failu. MI izvelk pozīcijas, un nekas netiek saglabāts, kamēr neapstiprināt pārskatīto rezultātu.",
		chooseFile: "Izvēlēties Formu 2",
		replaceFile: "Aizstāt Formu 2",
		analyzing: "Analizē Formu 2",
		uploadingAndAnalyzing: "Augšupielādē un analizē Formu 2",
		readingWorkbook: "Nolasa darbgrāmatu",
		selectingWorksheets: "Meklē Formas 2 darblapas",
		selectedWorksheets: (count: number) =>
			`MI analīzei atrastas ${count} darblapas`,
		analyzingWorksheet: (sheetName: string, completed: number, total: number) =>
			`MI analizē “${sheetName}” (${completed}/${total} pabeigtas)`,
		receivingAiResult: (sheetName: string, completed: number, total: number) =>
			`Saņem pozīcijas no “${sheetName}” (${completed}/${total} pabeigtas)`,
		finalizingExtraction: "Pārbauda iegūtās pozīcijas",
		elapsedTime: (value: string) => `Pagājis ${value}`,
		longAiWait:
			"Lielu darblapu analīze var ilgt dažas minūtes. MI turpina darbu; neaizveriet šo lapu.",
		savingPositions: "Saglabā Formu 2 un sinhronizē Darbi opcijas",
		assigningRecords: "Piesaista darbu un materiālu ierakstus",
		finishingImport: "Pabeidz importu",
		detectedSheet: "Atrasta lapa",
		positions: "pozīcijas",
		import: "Importēt pozīcijas",
		importing: "Importē",
		imported: "Importēts",
		clear: "Dzēst importu",
		overview: "Kopsavilkums",
		mapping: "Ierakstu piesaiste",
		results: "Formas 2 rezultāts",
		exportExcel: "Eksportēt uz Excel",
		exportingExcel: "Eksportē",
		exportError: "Neizdevās eksportēt Formu 2 uz Excel.",
		category: "Kategorija",
		editContract: "Labot līguma vērtības",
		editContractTitle: "Labot Formas 2 līguma vērtības",
		editContractDescription:
			"Mainot darbu, materiālu vai mehānismu summu, kopējā summa tiek pārrēķināta; kopējo summu var labot arī atsevišķi.",
		plannedMechanisms: "Līguma mehānismi",
		invalidContractValue:
			"Ievadiet derīgas līguma vērtības un nenegatīvu daudzumu.",
		contractUpdated: "Formas 2 līguma vērtības saglabātas.",
		cancel: "Atcelt",
		save: "Saglabāt",
		saving: "Saglabā",
		planned: "Līguma summa",
		factual: "Faktiskās izmaksas",
		assigned: "Piesaistītās izmaksas",
		unassigned: "Nepiesaistītās izmaksas",
		balance: "Atlikums",
		coverage: "Piesaistes pārklājums",
		recordsAssigned: "ieraksti piesaistīti",
		noDocument:
			"Augšupielādējiet un importējiet Formu 2, lai sāktu ierakstu piesaisti.",
		mappingTitle: "Faktisko ierakstu piesaiste",
		mappingDescription:
			"Darbu ierakstus piesaista darbu pozīcijām. Materiālus piesaista materiālu rindām vai darbu pamatpozīcijai, ja Formā 2 nav materiālu sadalījuma.",
		search: "Meklēt ierakstus",
		allTypes: "Visi tipi",
		allAssignments: "Visas piesaistes",
		assignedOnly: "Piesaistītie",
		unassignedOnly: "Nepiesaistītie",
		filter: "Filtrēt",
		applySuggestions: "Automātiski piesaistīt nepiesaistītos",
		applying: "Piesaista",
		source: "Faktiskais ieraksts",
		type: "Tips",
		quantity: "Daudzums",
		actualCost: "Faktiskās izmaksas",
		position: "Formas 2 pozīcija",
		suggested: "Ieteikts",
		unassignedOption: "Nav piesaistīts",
		work: "Darbs",
		material: "Materiāls",
		mechanism: "Mehānisms",
		noRecords: "Atbilstoši ieraksti nav atrasti.",
		resultsDescription:
			"Līguma izmaksas ir no Formas 2. Faktiskās izmaksas veido tikai piesaistītie WorksRecorded ieraksti. Noklikšķiniet uz faktiskās summas, lai redzētu aprēķinu un iekļautos ierakstus.",
		codeAndName: "Pozīcija",
		unit: "Mērv.",
		contractQuantity: "Līguma daudzums",
		plannedWork: "Līguma darbi",
		plannedMaterials: "Līguma materiāli",
		plannedTotal: "Līguma kopā",
		actualWork: "Faktiskie darbi",
		actualMaterials: "Faktiskie materiāli",
		actualTotal: "Faktiski kopā",
		remaining: "Atlikums",
		total: "Kopā",
		unpricedWarning: "ierakstiem vēl nav aprēķināmu faktisko izmaksu.",
		parseError: "No šīs darbgrāmatas neizdevās iegūt Formas 2 pozīcijas.",
		importSuccess: "Formas 2 pozīcijas importētas.",
		importAndAssignmentSuccess: (count: number) =>
			`Forma 2 importēta; automātiski piesaistīti ${count} faktiskie ieraksti.`,
		assignmentWarning:
			"Forma 2 tika importēta, bet automātisko piesaisti neizdevās pabeigt. Ierakstus joprojām var piesaistīt manuāli.",
		saveError: "Neizdevās saglabāt izmaiņas.",
		clearConfirm:
			"Dzēst importēto Formu 2, visas piesaistes un saistītās Darbi opcijas? Esošie būvdarbu žurnāla ieraksti netiks mainīti.",
		noSuggestions: "Šajā lapā nav drošu ieteikumu.",
		suggestionsApplied: (count: number) =>
			`Automātiskā piesaiste pabeigta; papildus piesaistīti ${count} ieraksti.`,
		assignTitle: "Piesaistīt ierakstu",
		assignDescription: "Izvēlieties vienu atbilstoša tipa Formas 2 pozīciju.",
		positionSearch: "Meklēt pozīcijas",
		previous: "Iepriekšējā",
		next: "Nākamā",
		showing: "Parādīti",
		of: "no",
	},
} as const;

export function getForma2AnalyticsCopy(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? COPY.lv
		: COPY.en;
}

export function getForma2AnalyticsLocale(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? "lv-LV"
		: "en-GB";
}
