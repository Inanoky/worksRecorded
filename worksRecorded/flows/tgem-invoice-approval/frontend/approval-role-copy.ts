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
			person: "Site or project manager",
			description:
				"Checks that the invoice belongs to the project and that extracted quantities, prices, and totals match the document.",
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
			description: "Reviews the commercial and budget context for the invoice.",
		},
		senior_approval: {
			title: "Senior approval",
			person: "Managing director, owner, or board member",
			description:
				"Provides the final management decision when this is the last configured step.",
		},
	},
	lv: {
		project_review: {
			title: "Projekta pārbaude",
			person: "Būvdarbu vai projekta vadītājs",
			description:
				"Pārbauda, vai rēķins attiecas uz projektu un vai atpazītie apjomi, cenas un kopsummas atbilst dokumentam.",
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
			description: "Pārbauda rēķina komerciālo un budžeta kontekstu.",
		},
		senior_approval: {
			title: "Vadības apstiprinājums",
			person: "Uzņēmuma vadītājs, īpašnieks vai valdes loceklis",
			description:
				"Pieņem gala vadības lēmumu, ja šis ir pēdējais iestatītais solis.",
		},
	},
	ru: {
		project_review: {
			title: "Проверка проекта",
			person: "Руководитель участка или проекта",
			description:
				"Проверяет принадлежность счета проекту и соответствие распознанных объемов, цен и итогов документу.",
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
			description: "Проверяет коммерческий и бюджетный контекст счета.",
		},
		senior_approval: {
			title: "Согласование руководства",
			person: "Директор, владелец или член правления",
			description:
				"Принимает финальное управленческое решение, если это последний настроенный шаг.",
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
