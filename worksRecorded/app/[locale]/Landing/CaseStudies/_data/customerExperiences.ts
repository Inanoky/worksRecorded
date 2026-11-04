import type { StaticImageData } from "next/image";
import TgemLogo from "@/lib/images/tgem-logo.png";

type ExperienceLocale = "lv" | "en" | "ru";

type ExperienceCopy = {
	title: string;
	excerpt: string;
	context: string;
	solution: string;
	features: string[];
	outcome: string;
	tags: string[];
};

type CustomerExperience = {
	slug: string;
	company: string;
	logo: string | StaticImageData;
	translations: Record<ExperienceLocale, ExperienceCopy>;
};

const customerExperiences: CustomerExperience[] = [
	{
		slug: "Limeni",
		company: "Līmenī",
		logo: "/logos/limeni.svg",
		translations: {
			lv: {
				title: "Digitāls atbalsts būvniecības ikdienai",
				excerpt:
					"Uzņēmuma vajadzībām pielāgots risinājums, kas palīdz sakārtot ikdienas informāciju un uzlabot pārskatāmību.",
				context:
					"Būvniecības komandām nepieciešama skaidra un pieejama informācija, lai koordinētu ikdienas darbu.",
				solution:
					"Līmenī vajadzībām pielāgojām WorksRecorded risinājumu, koncentrējoties uz ērtu lietošanu un uzņēmuma darba organizāciju.",
				features: [
					"Apkopot ikdienas informāciju vienuviet.",
					"Ērti pārskatīt darba aktualitātes.",
					"Izmantot uzņēmuma vajadzībām pielāgotu digitālu darba vidi.",
				],
				outcome:
					"Sakārtota informācija un pārskatāma darba vide palīdz komandai koordinēt ikdienas darbus.",
				tags: ["Digitalizācija", "Darba organizācija"],
			},
			en: {
				title: "Digital support for everyday construction work",
				excerpt:
					"A solution tailored to the company's needs, helping organize everyday information and improve visibility.",
				context:
					"Construction teams need clear, accessible information to coordinate their daily work.",
				solution:
					"We tailored WorksRecorded to Līmenī's needs, focusing on ease of use and the company's way of organizing work.",
				features: [
					"Bring everyday information together in one place.",
					"Review current work with ease.",
					"Use a digital workspace tailored to the company's needs.",
				],
				outcome:
					"Organized information and a clear workspace help the team coordinate everyday work.",
				tags: ["Digitalization", "Work organization"],
			},
			ru: {
				title: "Цифровая поддержка повседневной работы",
				excerpt:
					"Решение под задачи компании, которое помогает упорядочить повседневную информацию и сделать её более наглядной.",
				context:
					"Строительным командам нужна понятная и доступная информация для координации повседневной работы.",
				solution:
					"Мы адаптировали WorksRecorded под потребности Līmenī, уделяя внимание удобству использования и организации работы компании.",
				features: [
					"Собирать повседневную информацию в одном месте.",
					"Удобно просматривать текущие рабочие задачи.",
					"Использовать цифровую рабочую среду под задачи компании.",
				],
				outcome:
					"Упорядоченная информация и понятная рабочая среда помогают команде координировать повседневную работу.",
				tags: ["Цифровизация", "Организация работы"],
			},
		},
	},
	{
		slug: "FIMA",
		company: "FIMA",
		logo: "/logos/fima-official.svg",
		translations: {
			lv: {
				title: "Atbalsts būvniecības dokumentācijas pārvaldībai",
				excerpt:
					"FIMA vajadzībām pielāgots digitāls atbalsts dokumentācijas sakārtošanai un komandas sadarbībai.",
				context:
					"Būvniecības dokumentācijai jābūt pārskatāmai un ērti pieejamai atbildīgajai komandai.",
				solution:
					"FIMA vajadzībām pielāgojām risinājumu ikdienas dokumentācijas pārskatīšanai un darba organizācijai.",
				features: [
					"Apkopot ar darbu saistīto informāciju vienuviet.",
					"Pārskatīt dokumentus un aktuālos uzdevumus.",
					"Koordinēt komandas darbu dokumentācijas sagatavošanā.",
				],
				outcome:
					"Komanda var ērtāk orientēties dokumentācijā un koordinēt turpmākos darbus.",
				tags: ["Dokumentācija", "Sadarbība"],
			},
			en: {
				title: "Support for construction documentation management",
				excerpt:
					"Digital support tailored to FIMA for organizing documentation and team collaboration.",
				context:
					"Construction documentation needs to be clear and readily accessible to the responsible team.",
				solution:
					"For FIMA, we tailored a solution for reviewing everyday documentation and organizing work.",
				features: [
					"Keep work information together in one place.",
					"Review documents and current tasks.",
					"Coordinate the team's documentation work.",
				],
				outcome:
					"The team can navigate documentation more easily and coordinate the next steps.",
				tags: ["Documentation", "Collaboration"],
			},
			ru: {
				title: "Поддержка управления строительной документацией",
				excerpt:
					"Цифровая поддержка для FIMA в организации документации и совместной работе команды.",
				context:
					"Строительная документация должна быть понятной и доступной ответственной команде.",
				solution:
					"Для FIMA мы адаптировали решение для просмотра повседневной документации и организации работы.",
				features: [
					"Собирать рабочую информацию в одном месте.",
					"Просматривать документы и текущие задачи.",
					"Координировать работу команды над документацией.",
				],
				outcome:
					"Команда может легче ориентироваться в документации и координировать дальнейшую работу.",
				tags: ["Документация", "Сотрудничество"],
			},
		},
	},
	{
		slug: "TGEM",
		company: "TGEM",
		logo: TgemLogo,
		translations: {
			lv: {
				title: "Rēķins no saņemšanas līdz saskaņošanai",
				excerpt:
					"Rēķinu datu nolasīšana, piesaiste projektiem, izmaksu kodi un secīga saskaņošana ar lēmumu vēsturi.",
				context:
					"Saņemtam rēķinam jāatrod pareizais projekts, izmaksu kategorija un atbildīgie saskaņotāji. Viens dokuments var attiekties uz vairākiem projektiem, tāpēc arī sadalījumam jābūt pārbaudāmam.",
				solution:
					"TGEM izveidojām rēķinu apstrādes un saskaņošanas plūsmu. Dokumentus var saņemt WhatsApp, e-pastā vai augšupielādēt platformā. MI nolasa rēķina laukus un pozīcijas, kuras komanda pārbauda pirms tālākas saskaņošanas.",
				features: [
					"PDF un attēlu apstrāde ar sākotnējā dokumenta priekšskatījumu.",
					"Rēķinu piesaiste projektiem un izmaksu kodiem.",
					"Rēķina pozīciju vai apjomu sadalīšana starp projektiem ar summu pārbaudi.",
					"Saskaņotāju secība, lomas un summu sliekšņi, lēmumu vēsture un reģistra eksports Excel.",
				],
				outcome:
					"Atbildīgie redz, kurā saskaņošanas posmā atrodas rēķins, kam jārīkojas tālāk un kā tā izmaksas sadalītas pa projektiem.",
				tags: ["Rēķini", "Saskaņošana", "Izmaksu kontrole"],
			},
			en: {
				title: "An invoice from receipt to approval",
				excerpt:
					"Invoice extraction, project allocation, cost codes and sequential approvals with a decision history.",
				context:
					"An incoming invoice needs the correct project, cost category and reviewers. One document can cover several projects, so its allocation also needs to be verifiable.",
				solution:
					"For TGEM, we built an invoice processing and approval workflow. Documents can arrive through WhatsApp, email or an upload in the platform. AI reads invoice fields and line items, which the team reviews before proceeding with approval.",
				features: [
					"Processing of PDFs and images alongside a preview of the original document.",
					"Allocation of invoices to projects and cost codes.",
					"Splitting invoice lines or quantities between projects with total reconciliation.",
					"Approval sequences, roles and amount thresholds, decision history and Excel register export.",
				],
				outcome:
					"The team can see each invoice's approval stage, who needs to act next and how its cost is allocated across projects.",
				tags: ["Invoices", "Approvals", "Cost control"],
			},
			ru: {
				title: "Счёт от получения до согласования",
				excerpt:
					"Распознавание счетов, распределение по проектам, коды затрат и последовательное согласование с историей решений.",
				context:
					"Для входящего счёта нужно определить проект, категорию затрат и ответственных за согласование. Один документ может относиться к нескольким проектам, поэтому распределение тоже должно быть проверяемым.",
				solution:
					"Для TGEM мы создали процесс обработки и согласования счетов. Документы поступают через WhatsApp, электронную почту или загрузку на платформе. ИИ распознаёт поля и позиции счёта, которые команда проверяет перед согласованием.",
				features: [
					"Обработка PDF и изображений с просмотром исходного документа.",
					"Привязка счетов к проектам и кодам затрат.",
					"Распределение позиций или объёмов счёта между проектами с проверкой итоговых сумм.",
					"Порядок согласования, роли и пороги сумм, история решений и экспорт реестра в Excel.",
				],
				outcome:
					"Ответственные видят текущий этап согласования, следующего участника процесса и распределение затрат счёта по проектам.",
				tags: ["Счета", "Согласование", "Контроль затрат"],
			},
		},
	},
	{
		slug: "StoneAndTree",
		company: "Stone & Tree",
		logo: "/logos/stone-and-tree.svg",
		translations: {
			lv: {
				title: "Objekta ikdiena vienā būvdarbu žurnālā",
				excerpt:
					"WhatsApp piezīmes un foto sakārtoti pa projektiem, datumiem un darbiem ar pārskatāmu ikdienas uzskaiti.",
				context:
					"Bruģēšanas, labiekārtošanas un zemes darbos ikdienas informācija rodas tieši objektā. Darbu aprakstiem, apjomiem un foto jāpaliek kopā, lai projekta vadītājs varētu pārskatīt notikušo arī vēlāk.",
				solution:
					"Stone & Tree nodrošinājām būvdarbu žurnālu ar WhatsApp informācijas apstrādi. Objekta teksta un balss piezīmes un pievienotie foto tiek sakārtoti projekta ierakstos, kurus komanda var pārskatīt un precizēt.",
				features: [
					"Darbu ieraksti ar datumu, aprakstu, apjomu un mērvienību.",
					"Foto galerija un attēli pie attiecīgās dienas darbiem.",
					"Projekta vēstures pārskatīšana sarakstā un kalendārā.",
					"Ierakstu labošana, filtrēšana un eksports Excel turpmākai atskaitīšanai.",
				],
				outcome:
					"Projekta vadītājs var atvērt konkrēto dienu, pārskatīt uzskaitītos darbus un to foto, kā arī sagatavot pārskatu no saglabātajiem ierakstiem.",
				tags: ["Būvdarbu žurnāls", "WhatsApp", "Foto uzskaite"],
			},
			en: {
				title: "Daily site activity in one work diary",
				excerpt:
					"WhatsApp notes and photos organized by project, date and work item for a clear daily record.",
				context:
					"Paving, landscaping and earthworks produce daily information directly on site. Work descriptions, quantities and photos need to stay together so the project manager can review events later.",
				solution:
					"For Stone & Tree, we provided a construction diary with WhatsApp information processing. Site text and voice notes and attached photos are organized into project records that the team can review and correct.",
				features: [
					"Work records with a date, description, quantity and unit.",
					"A photo gallery and images alongside the relevant day's work.",
					"Project history in list and calendar views.",
					"Record editing, filtering and Excel export for further reporting.",
				],
				outcome:
					"The project manager can open a specific day, review the recorded works and photos, and prepare a report from the saved records.",
				tags: ["Site diary", "WhatsApp", "Photo records"],
			},
			ru: {
				title: "Повседневная работа объекта в одном журнале",
				excerpt:
					"Заметки и фото из WhatsApp распределены по проектам, датам и работам для понятного ежедневного учёта.",
				context:
					"При мощении, благоустройстве и земляных работах ежедневная информация появляется прямо на объекте. Описания работ, объёмы и фото должны храниться вместе, чтобы руководитель мог вернуться к ним позже.",
				solution:
					"Для Stone & Tree мы предоставили журнал строительных работ с обработкой информации из WhatsApp. Текстовые и голосовые заметки с объекта и приложенные фото упорядочиваются в записи проекта, которые команда может проверить и уточнить.",
				features: [
					"Записи работ с датой, описанием, объёмом и единицей измерения.",
					"Фотогалерея и изображения рядом с работами соответствующего дня.",
					"История проекта в списке и календаре.",
					"Редактирование записей, фильтры и экспорт в Excel для дальнейшей отчётности.",
				],
				outcome:
					"Руководитель может открыть нужный день, проверить записанные работы и фотографии и подготовить отчёт на основе сохранённых записей.",
				tags: ["Журнал работ", "WhatsApp", "Фотоучёт"],
			},
		},
	},
];

const pageCopy = {
	lv: {
		title: "Klientu pieredze un ceļveži",
		description:
			"Līmenī, FIMA, TGEM un Stone & Tree pieredze ar WorksRecorded. Uzņēmumu vajadzībām pielāgoti digitāli risinājumi un MI atbalsts ikdienas darbam.",
		back: "Atpakaļ uz klientu pieredzi",
		context: "Darba uzdevums",
		solution: "Ko izveidojām",
		features: "Ko komanda var darīt",
		outcome: "Rezultāts ikdienā",
		cta: "Pārrunāt risinājumu savam uzņēmumam",
	},
	en: {
		title: "Customer experience and guides",
		description:
			"Līmenī, FIMA, TGEM and Stone & Tree experiences with WorksRecorded. Tailored digital solutions and AI support for everyday work.",
		back: "Back to customer experience",
		context: "The task",
		solution: "What we built",
		features: "What the team can do",
		outcome: "Day to day result",
		cta: "Discuss a solution for your business",
	},
	ru: {
		title: "Опыт клиентов и руководства",
		description:
			"Опыт Līmenī, FIMA, TGEM и Stone & Tree с WorksRecorded. Цифровые решения под задачи компаний и поддержка ИИ в повседневной работе.",
		back: "Вернуться к опыту клиентов",
		context: "Задача",
		solution: "Что мы создали",
		features: "Что может делать команда",
		outcome: "Результат в повседневной работе",
		cta: "Обсудить решение для вашей компании",
	},
};

function experienceLocale(locale: string): ExperienceLocale {
	return locale === "lv" || locale === "ru" ? locale : "en";
}

export function getExperiencePageCopy(locale: string) {
	return pageCopy[experienceLocale(locale)];
}

export function getCustomerExperiences(locale: string) {
	return customerExperiences.map(({ translations, ...experience }) => ({
		...experience,
		...translations[experienceLocale(locale)],
	}));
}
