import type { TgemApprovalRoleKey } from "@/lib/tgem-invoice-approval/approval";

type RoleCopy = {
	title: string;
	person: string;
	description: string;
};

const ROLE_COPY: Record<
	"en" | "lv" | "ru",
	Record<TgemApprovalRoleKey, RoleCopy>
> = {
	en: {
		project_review: {
			title: "Project review",
			person: "Project manager",
			description:
				"Confirms delivery, quantities, project, and budget ownership.",
		},
		financial_review: {
			title: "Financial review",
			person: "Accountant or financial controller",
			description:
				"Checks supplier details, duplicates, VAT, totals, dates, and cost codes.",
		},
		budget_approval: {
			title: "Budget approval",
			person: "Commercial, operations, or finance manager",
			description:
				"Authorizes the expense within the manager's spending responsibility.",
		},
		senior_approval: {
			title: "Senior approval",
			person: "Managing director, owner, or board member",
			description:
				"Authorizes high-value invoices that exceed the configured threshold.",
		},
	},
	lv: {
		project_review: {
			title: "Projekta pārbaude",
			person: "Projekta vadītājs",
			description:
				"Apstiprina piegādi, apjomus, projektu un budžeta atbildību.",
		},
		financial_review: {
			title: "Finanšu pārbaude",
			person: "Grāmatvedis vai finanšu kontrolieris",
			description:
				"Pārbauda piegādātāju, dublikātus, PVN, summas, datumus un izmaksu kodus.",
		},
		budget_approval: {
			title: "Budžeta apstiprinājums",
			person: "Komercdirektors, operāciju vai finanšu vadītājs",
			description: "Apstiprina izdevumus savas budžeta atbildības ietvaros.",
		},
		senior_approval: {
			title: "Vadības apstiprinājums",
			person: "Uzņēmuma vadītājs, īpašnieks vai valdes loceklis",
			description: "Apstiprina lielas vērtības rēķinus virs noteiktā sliekšņa.",
		},
	},
	ru: {
		project_review: {
			title: "Проверка проекта",
			person: "Руководитель проекта",
			description:
				"Подтверждает поставку, объемы, проект и ответственность за бюджет.",
		},
		financial_review: {
			title: "Финансовая проверка",
			person: "Бухгалтер или финансовый контролер",
			description:
				"Проверяет поставщика, дубликаты, НДС, суммы, даты и коды затрат.",
		},
		budget_approval: {
			title: "Согласование бюджета",
			person: "Коммерческий, операционный или финансовый руководитель",
			description:
				"Разрешает расход в пределах своей бюджетной ответственности.",
		},
		senior_approval: {
			title: "Согласование руководства",
			person: "Директор, владелец или член правления",
			description: "Согласует счета выше заданного порога.",
		},
	},
};

export function getTgemApprovalRoleCopy(language?: string | null) {
	return ROLE_COPY[language === "lv" || language === "ru" ? language : "en"];
}

export function getTgemApprovalRoleTitle(
	roleKey: TgemApprovalRoleKey,
	customLabel: string | null,
	language?: string | null,
) {
	return customLabel || getTgemApprovalRoleCopy(language)[roleKey].title;
}
