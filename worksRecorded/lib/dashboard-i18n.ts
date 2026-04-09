export type OrganizationLanguage = "en" | "lv";

type DashboardMessages = {
  createProject: string;
  openProject: string;
  yourSites: string;
  emptyTitle: string;
  emptyDescription: string;
};

type WarehousePageMessages = { title: string; description: string };

type TimesheetsPageMessages = {
  title: string;
  description: string;
  timeRecordsTitle: string;
  timeRecordsDescription: string;
};

type SiteDiaryListMessages = {
  daysOfWeek: string[];
  title: string;
  subtitle: string;
  tabList: string;
  tabCalendar: string;
  tabGallery: string;
  recordViaWhatsApp: string;
  recordViaWhatsAppShort: string;
  exportToExcel: string;
  refreshing: string;
  refreshBisSync: string;
  filters: string;
  fromDate: string;
  toDate: string;
  filterByWorks: string;
  allWorks: string;
  filterByFloorLocation: string;
  allFloorsLocations: string;
  clearFilters: string;
  loading: string;
  noRecords: string;
  taskSingular: string;
  taskPlural: string;
  viewPhotosForDay: string;
  pdfReport: string;
  generating: string;
  openDiary: string;
  noLocation: string;
  noWorksRecorded: string;
  workers: string;
  hours: string;
  noComments: string;
  bisApproved: string;
  bisPending: string;
  bisDraft: string;
  sentToBis: string;
  sending: string;
  sendToBis: string;
  approved: string;
  sentForApproval: string;
  sendForApproval: string;
  copyToDate: string;
  openInBis: string;
  time: string;
  status: string;
  action: string;
  source: string;
  copy: string;
  performedWorkDetails: string;
  bisEventDate: string;
  pickBisEventDate: string;
  worksDescription: string;
  bisMeasurementUnit: string;
  attachments: string;
  materialsFromCurrentBisCase: string;
  noBisMaterialsAvailable: string;
  material: string;
  unit: string;
  total: string;
  used: string;
  available: string;
  sendQty: string;
  selectedGalleryAttachments: string;
  noAttachmentsSelected: string;
  targetDate: string;
  noGalleryPhotos: string;
  previous: string;
  next: string;
  done: string;
  noDateSelected: string;
  attachmentsOptionalHelp: string;
  addManageAttachments: string;
  remove: string;
  cancel: string;
};

type TimesheetsUiMessages = {
  search: string;
  exportToExcel: string;
  noData: string;
  actions: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
};

type WorkersUiMessages = {
  workersOnSite: string;
  workersDescription: string;
  addWorker: string;
  addWorkerDescription: string;
  totalWorkers: string;
  editWorker: string;
  updateWorkerInformation: string;
  name: string;
  surname: string;
  phone: string;
  countryCode: string;
  saveChanges: string;
  cancel: string;
};

type WarehouseUiMessages = {
  searchMaterials: string;
  refresh: string;
  status: string;
  all: string;
  sent: string;
  unsent: string;
  noRows: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  approved: string;
  sentForApproval: string;
};

type SettingsUiMessages = {
  organizationLanguage: string;
  organizationLanguageHelp: string;
  memberUpdated: string;
  updateFailed: string;
  search: string;
  exportToExcel: string;
  addUser: string;
  inviteUser: string;
  emailRequired: string;
  invitationSent: string;
  sendInvite: string;
  saveChanges: string;
  cancel: string;
  actions: string;
  edit: string;
  noDataFound: string;
};

export function normalizeOrganizationLanguage(language?: string | null): OrganizationLanguage {
  return language === "lv" ? "lv" : "en";
}

const DASHBOARD_MESSAGES: Record<OrganizationLanguage, DashboardMessages> = {
  en: {
    createProject: "Create Project",
    openProject: "Open Project",
    yourSites: "Your Sites",
    emptyTitle: "You don't have any projects created",
    emptyDescription: "You currently don't have any projects. Please create one so you can see it here.",
  },
  lv: {
    createProject: "Izveidot projektu",
    openProject: "Atvērt projektu",
    yourSites: "Jūsu projekti",
    emptyTitle: "Jums vēl nav izveidotu projektu",
    emptyDescription: "Pašlaik jums nav projektu. Lūdzu, izveidojiet projektu, lai tas tiktu parādīts šeit.",
  },
};

const WAREHOUSE_PAGE_MESSAGES: Record<OrganizationLanguage, WarehousePageMessages> = {
  en: { title: "Warehouse", description: "Send delivery note/invoice note to WhatsApp WorksRecorded. Line items will appear here." },
  lv: { title: "Noliktava", description: "Nosūtiet piegādes pavadzīmi/rēķinu uz WhatsApp WorksRecorded. Pozīcijas parādīsies šeit." },
};

const TIMESHEETS_PAGE_MESSAGES: Record<OrganizationLanguage, TimesheetsPageMessages> = {
  en: {
    title: "Timesheets",
    description: "Review time records and keep your worker list up to date.",
    timeRecordsTitle: "Time records",
    timeRecordsDescription: "All logged entries for this site. Search, edit, and export.",
  },
  lv: {
    title: "Darba laika uzskaites lapas",
    description: "Pārskatiet laika ierakstus un uzturiet darbinieku sarakstu aktuālu.",
    timeRecordsTitle: "Laika ieraksti",
    timeRecordsDescription: "Visi šī objekta ieraksti. Meklējiet, rediģējiet un eksportējiet.",
  },
};

const SITE_DIARY_LIST_MESSAGES: Record<OrganizationLanguage, SiteDiaryListMessages> = {
  en: {
    daysOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    title: "Site Diary",
    subtitle: "Switch between calendar, list and gallery views.",
    tabList: "List",
    tabCalendar: "Calendar",
    tabGallery: "Gallery",
    recordViaWhatsApp: "Record site work via WhatsApp",
    recordViaWhatsAppShort: "Record via WhatsApp",
    exportToExcel: "Export to Excel",
    refreshing: "Refreshing...",
    refreshBisSync: "Refresh BIS sync",
    filters: "Filters",
    fromDate: "From date",
    toDate: "To date",
    filterByWorks: "Filter by works",
    allWorks: "All works",
    filterByFloorLocation: "Filter by floor/location",
    allFloorsLocations: "All floors / locations",
    clearFilters: "Clear filters",
    loading: "Loading…",
    noRecords: "No site diary records match your filters.",
    taskSingular: "task",
    taskPlural: "tasks",
    viewPhotosForDay: "View photos for this day",
    pdfReport: "PDF report",
    generating: "Generating…",
    openDiary: "Open diary",
    noLocation: "No location",
    noWorksRecorded: "No works recorded",
    workers: "Workers",
    hours: "Hours",
    noComments: "No comments",
    bisApproved: "BIS approved",
    bisPending: "BIS pending",
    bisDraft: "BIS draft",
    sentToBis: "Sent to BIS",
    sending: "Sending...",
    sendToBis: "Send to BIS",
    approved: "Approved",
    sentForApproval: "Sent for approval",
    sendForApproval: "Send for approval",
    copyToDate: "Copy to date",
    openInBis: "Open in BIS",
    time: "Time",
    status: "Status",
    action: "Action",
    source: "Source",
    copy: "Copy",
    performedWorkDetails: "Performed work details",
    bisEventDate: "BIS event date",
    pickBisEventDate: "Pick BIS event date",
    worksDescription: "Works description",
    bisMeasurementUnit: "BIS measurement unit",
    attachments: "Attachments",
    materialsFromCurrentBisCase: "Materials from current BIS case",
    noBisMaterialsAvailable: "No BIS materials available in this case.",
    material: "Material",
    unit: "Unit",
    total: "Total",
    used: "Used",
    available: "Available",
    sendQty: "Send qty",
    selectedGalleryAttachments: "Selected gallery attachments",
    noAttachmentsSelected: "No attachments selected. This is optional.",
    targetDate: "Target date",
    noGalleryPhotos: "No gallery photos available for this site.",
    previous: "Previous",
    next: "Next",
    done: "Done",
    noDateSelected: "No date selected",
    attachmentsOptionalHelp: "Attachments are optional. Add them only if you want photo evidence in BIS.",
    addManageAttachments: "Add / manage attachments",
    remove: "Remove",
    cancel: "Cancel",
  },
  lv: {
    daysOfWeek: ["Sv", "Pr", "Ot", "Tr", "Ce", "Pk", "Se"],
    title: "Būvdarbu žurnāls",
    subtitle: "Pārslēdzieties starp kalendāra, saraksta un galerijas skatu.",
    tabList: "Saraksts",
    tabCalendar: "Kalendārs",
    tabGallery: "Galerija",
    recordViaWhatsApp: "Reģistrēt būvdarbus WhatsApp",
    recordViaWhatsAppShort: "Reģistrēt WhatsApp",
    exportToExcel: "Eksportēt uz Excel",
    refreshing: "Atjauno...",
    refreshBisSync: "Atjaunot BIS sinhronizāciju",
    filters: "Filtri",
    fromDate: "Datums no",
    toDate: "Datums līdz",
    filterByWorks: "Filtrēt pēc darbiem",
    allWorks: "Visi darbi",
    filterByFloorLocation: "Filtrēt pēc stāva/lokācijas",
    allFloorsLocations: "Visi stāvi / lokācijas",
    clearFilters: "Notīrīt filtrus",
    loading: "Ielādē...",
    noRecords: "Neviens būvdarbu žurnāla ieraksts neatbilst izvēlētajiem filtriem.",
    taskSingular: "uzdevums",
    taskPlural: "uzdevumi",
    viewPhotosForDay: "Skatīt šīs dienas foto",
    pdfReport: "PDF atskaite",
    generating: "Ģenerē...",
    openDiary: "Atvērt žurnālu",
    noLocation: "Nav lokācijas",
    noWorksRecorded: "Nav reģistrētu darbu",
    workers: "Darbinieki",
    hours: "Stundas",
    noComments: "Nav komentāru",
    bisApproved: "BIS apstiprināts",
    bisPending: "BIS gaida apstiprinājumu",
    bisDraft: "BIS melnraksts",
    sentToBis: "Nosūtīts uz BIS",
    sending: "Sūta...",
    sendToBis: "Sūtīt uz BIS",
    approved: "Apstiprināts",
    sentForApproval: "Nosūtīts apstiprināšanai",
    sendForApproval: "Sūtīt apstiprināšanai",
    copyToDate: "Kopēt uz datumu",
    openInBis: "Atvērt BIS",
    time: "Laiks",
    status: "Statuss",
    action: "Darbība",
    source: "Avots",
    copy: "Kopēt",
    performedWorkDetails: "Veikto darbu informācija",
    bisEventDate: "BIS notikuma datums",
    pickBisEventDate: "Izvēlieties BIS notikuma datumu",
    worksDescription: "Darbu apraksts",
    bisMeasurementUnit: "BIS mērvienība",
    attachments: "Pielikumi",
    materialsFromCurrentBisCase: "Materiāli no pašreizējās BIS lietas",
    noBisMaterialsAvailable: "Šajā lietā nav pieejamu BIS materiālu.",
    material: "Materiāls",
    unit: "Vienība",
    total: "Kopā",
    used: "Izlietots",
    available: "Pieejams",
    sendQty: "Sūtāmais daudzums",
    selectedGalleryAttachments: "Atlasītie galerijas pielikumi",
    noAttachmentsSelected: "Nav atlasītu pielikumu. Tas nav obligāti.",
    targetDate: "Mērķa datums",
    noGalleryPhotos: "Šim objektam nav galerijas foto.",
    previous: "Iepriekšējā",
    next: "Nākamā",
    done: "Gatavs",
    noDateSelected: "Datums nav izvēlēts",
    attachmentsOptionalHelp: "Pielikumi nav obligāti. Pievienojiet tos tikai tad, ja BIS nepieciešami foto pierādījumi.",
    addManageAttachments: "Pievienot / pārvaldīt pielikumus",
    remove: "Noņemt",
    cancel: "Atcelt",
  },
};

const TIMESHEETS_UI_MESSAGES: Record<OrganizationLanguage, TimesheetsUiMessages> = {
  en: { search: "Search...", exportToExcel: "Export to Excel", noData: "No data found.", actions: "Actions", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel" },
  lv: { search: "Meklēt...", exportToExcel: "Eksportēt uz Excel", noData: "Dati nav atrasti.", actions: "Darbības", edit: "Rediģēt", delete: "Dzēst", save: "Saglabāt", cancel: "Atcelt" },
};

const WORKERS_UI_MESSAGES: Record<OrganizationLanguage, WorkersUiMessages> = {
  en: {
    workersOnSite: "Workers on site",
    workersDescription: "Create, update, and delete workers available for timesheets on this project.",
    addWorker: "Add worker",
    addWorkerDescription: "Create a new worker profile for this site.",
    totalWorkers: "Total workers",
    editWorker: "Edit worker",
    updateWorkerInformation: "Update worker information.",
    name: "Name",
    surname: "Surname",
    phone: "Phone",
    countryCode: "Country code",
    saveChanges: "Save changes",
    cancel: "Cancel",
  },
  lv: {
    workersOnSite: "Objektā esošie darbinieki",
    workersDescription: "Izveidojiet, rediģējiet un dzēsiet darbiniekus, kas pieejami darba laika uzskaitei šajā projektā.",
    addWorker: "Pievienot darbinieku",
    addWorkerDescription: "Izveidojiet jaunu darbinieka profilu šim objektam.",
    totalWorkers: "Kopā darbinieki",
    editWorker: "Rediģēt darbinieku",
    updateWorkerInformation: "Atjauniniet darbinieka informāciju.",
    name: "Vārds",
    surname: "Uzvārds",
    phone: "Tālrunis",
    countryCode: "Valsts kods",
    saveChanges: "Saglabāt izmaiņas",
    cancel: "Atcelt",
  },
};

const WAREHOUSE_UI_MESSAGES: Record<OrganizationLanguage, WarehouseUiMessages> = {
  en: {
    searchMaterials: "Search materials...",
    refresh: "Refresh",
    status: "Status",
    all: "All",
    sent: "Sent",
    unsent: "Unsent",
    noRows: "No materials found.",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    approved: "Approved",
    sentForApproval: "Sent for approval",
  },
  lv: {
    searchMaterials: "Meklēt materiālus...",
    refresh: "Atjaunot",
    status: "Statuss",
    all: "Visi",
    sent: "Nosūtīti",
    unsent: "Nenosūtīti",
    noRows: "Materiāli nav atrasti.",
    edit: "Rediģēt",
    delete: "Dzēst",
    save: "Saglabāt",
    cancel: "Atcelt",
    approved: "Apstiprināts",
    sentForApproval: "Nosūtīts apstiprināšanai",
  },
};

const SETTINGS_UI_MESSAGES: Record<OrganizationLanguage, SettingsUiMessages> = {
  en: {
    organizationLanguage: "Organization language",
    organizationLanguageHelp: "Choose which language is used for shared organization UI text.",
    memberUpdated: "Member updated",
    updateFailed: "Update failed",
    search: "Search...",
    exportToExcel: "Export to Excel",
    addUser: "Add user",
    inviteUser: "Invite user",
    emailRequired: "Email is required",
    invitationSent: "Invitation email sent",
    sendInvite: "Send invite",
    saveChanges: "Save changes",
    cancel: "Cancel",
    actions: "Actions",
    edit: "Edit",
    noDataFound: "No data found.",
  },
  lv: {
    organizationLanguage: "Organizācijas valoda",
    organizationLanguageHelp: "Izvēlieties valodu, kas tiks izmantota koplietotajam organizācijas saskarnes tekstam.",
    memberUpdated: "Dalībnieks atjaunināts",
    updateFailed: "Atjaunināšana neizdevās",
    search: "Meklēt...",
    exportToExcel: "Eksportēt uz Excel",
    addUser: "Pievienot lietotāju",
    inviteUser: "Uzaicināt lietotāju",
    emailRequired: "E-pasts ir obligāts",
    invitationSent: "Uzaicinājuma e-pasts nosūtīts",
    sendInvite: "Sūtīt uzaicinājumu",
    saveChanges: "Saglabāt izmaiņas",
    cancel: "Atcelt",
    actions: "Darbības",
    edit: "Rediģēt",
    noDataFound: "Dati nav atrasti.",
  },
};

export function getDashboardMessages(language?: string | null) {
  return DASHBOARD_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getWarehousePageMessages(language?: string | null) {
  return WAREHOUSE_PAGE_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getTimesheetsPageMessages(language?: string | null) {
  return TIMESHEETS_PAGE_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getSiteDiaryListMessages(language?: string | null) {
  return SITE_DIARY_LIST_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getTimesheetsUiMessages(language?: string | null) {
  return TIMESHEETS_UI_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getWorkersUiMessages(language?: string | null) {
  return WORKERS_UI_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getWarehouseUiMessages(language?: string | null) {
  return WAREHOUSE_UI_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getSettingsUiMessages(language?: string | null) {
  return SETTINGS_UI_MESSAGES[normalizeOrganizationLanguage(language)];
}
