export type OrganizationLanguage = "en" | "lv";

type DashboardMessages = {
  createProject: string;
  openProject: string;
  openingProject: string;
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
  viewWeatherForDay: string;
  weather: string;
  weatherFor: string;
  weatherLoading: string;
  weatherUnavailableForSite: string;
  weatherMissingGeofence: string;
  weatherNoDataForDay: string;
  weatherHour: string;
  weatherTemperature: string;
  weatherWind: string;
  weatherPrecipitation: string;
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
  searchDetailed: string;
  exportToExcel: string;
  noData: string;
  visibleRecords: string;
  workersListed: string;
  trackedHours: string;
  rowActionsHint: string;
  resultsSummary: string;
  previous: string;
  next: string;
  worker: string;
  role: string;
  date: string;
  location: string;
  works: string;
  clockIn: string;
  clockOut: string;
  hours: string;
  selectWorker: string;
  selectDate: string;
  selectLocation: string;
  workNotes: string;
  workNotesPlaceholder: string;
  editTimeRecord: string;
  editTimeRecordDescription: string;
  deleteTimeRecord: string;
  deleteTimeRecordDescription: string;
  thisWorker: string;
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
  firstName: string;
  lastName: string;
  onSite: string;
  lastWorkDate: string;
  lastWorkType: string;
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
  totalCost: string;
  refresh: string;
  status: string;
  all: string;
  sent: string;
  notSent: string;
  unsent: string;
  configPlaceholder: string;
  allConfigurations: string;
  sortBy: string;
  sortDefault: string;
  sortInvoiceNewest: string;
  sortInvoiceOldest: string;
  sortNameAz: string;
  sortHighestQty: string;
  selectAllRows: string;
  photo: string;
  material: string;
  bisMaterialConfiguration: string;
  costCode: string;
  deliveryDate: string;
  qty: string;
  unit: string;
  cost: string;
  invoice: string;
  invoiceDate: string;
  action: string;
  pickDate: string;
  unnamedMaterial: string;
  unknownType: string;
  submitting: string;
  editMaterial: string;
  materialName: string;
  units: string;
  pickDeliveryDate: string;
  pickInvoiceDate: string;
  declarationDocument: string;
  agreement: string;
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
  emailColumn: string;
  firstNameColumn: string;
  lastNameColumn: string;
  phoneColumn: string;
  roleColumn: string;
  statusColumn: string;
  reminderTimeColumn: string;
  remindersEnabledColumn: string;
  reminderTextColumn: string;
  reminderTextPlaceholder: string;
  previous: string;
  next: string;
};

type NavigationMessages = {
  projects: string;
  organizationSettings: string;
  siteDiary: string;
  timesheets: string;
  warehouse: string;
  settings: string;
};

type SiteSettingsMessages = {
  goBack: string;
  danger: string;
  dangerDescription: string;
  bisIntegration: string;
  bisDescription: string;
  connectionStatus: string;
  connected: string;
  disconnected: string;
  connectBis: string;
  disconnectBis: string;
  bisCaseForSite: string;
  selectBisCase: string;
  saveBisCase: string;
  noCases: string;
  connectFirst: string;
  disconnectNote: string;
  editSiteInfo: string;
  editSiteDescription: string;
  name: string;
  description: string;
  subdirectory: string;
  siteArea: string;
  siteAreaHint: string;
  saveChanges: string;
  saving: string;
  deleteEverything: string;
  deleteProjectQuestion: string;
  deleteProjectDescription: string;
  cancel: string;
  yesDelete: string;
  manualBisConnection: string;
  openBisAuthorizationStep: string;
  copyCodeStep: string;
  pasteCodeStep: string;
  setEnvCodeStep: string;
  exchangeCodeStep: string;
};

type SiteDiaryDialogMessages = {
  additionalWorks: string;
  clientDelay: string;
  internalDelay: string;
  note: string;
  otherWorks: string;
  recordDeleted: string;
  recordsSaved: string;
  loading: string;
  addTask: string;
  saveDiary: string;
  task: string;
  deleteTaskAria: string;
  createdBy: string;
  delete: string;
  unknown: string;
  select: string;
  noDateSelected: string;
  close: string;
  loadingPhotos: string;
  failedLoadPhotos: string;
  failedDeletePhoto: string;
  photosCount: string;
  noPhotosForDate: string;
  photo: string;
  deletePhoto: string;
  previous: string;
  next: string;
};

export function normalizeOrganizationLanguage(language?: string | null): OrganizationLanguage {
  return language === "lv" ? "lv" : "en";
}

const DASHBOARD_MESSAGES: Record<OrganizationLanguage, DashboardMessages> = {
  en: {
    createProject: "Create Project",
    openProject: "Open Project",
    openingProject: "Opening project...",
    yourSites: "Your Sites",
    emptyTitle: "You don't have any projects created",
    emptyDescription: "You currently don't have any projects. Please create one so you can see it here.",
  },
  lv: {
    createProject: "Izveidot projektu",
    openProject: "Atvērt projektu",
    openingProject: "Atver projektu...",
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
    viewWeatherForDay: "View weather for this day",
    weather: "Weather",
    weatherFor: "Weather for",
    weatherLoading: "Loading weather…",
    weatherUnavailableForSite: "Weather is available only for sites with geofence polygon.",
    weatherMissingGeofence: "This site has no geofence polygon, so weather cannot be loaded.",
    weatherNoDataForDay: "No weather data is available for this day.",
    weatherHour: "Hour",
    weatherTemperature: "Temperature (°C)",
    weatherWind: "Wind (m/s)",
    weatherPrecipitation: "Precipitation (mm)",
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
    viewWeatherForDay: "Skatīt šīs dienas laikapstākļus",
    weather: "Laikapstākļi",
    weatherFor: "Laikapstākļi datumam",
    weatherLoading: "Ielādē laikapstākļus...",
    weatherUnavailableForSite: "Laikapstākļi ir pieejami tikai objektiem ar geofence poligonu.",
    weatherMissingGeofence: "Šim objektam nav geofence poligona, tāpēc laikapstākļus nevar ielādēt.",
    weatherNoDataForDay: "Šai dienai nav pieejamu laikapstākļu datu.",
    weatherHour: "Stunda",
    weatherTemperature: "Temperatūra (°C)",
    weatherWind: "Vējš (m/s)",
    weatherPrecipitation: "Nokrišņi (mm)",
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
  en: {
    search: "Search...",
    searchDetailed: "Search by worker, location, work done...",
    exportToExcel: "Export to Excel",
    noData: "No data found.",
    visibleRecords: "Visible records",
    workersListed: "Workers listed",
    trackedHours: "Tracked hours",
    rowActionsHint: "Use row actions to edit or delete a time record.",
    resultsSummary: "results",
    previous: "Previous",
    next: "Next",
    worker: "Worker",
    role: "Role",
    date: "Date",
    location: "Location",
    works: "Work notes",
    clockIn: "Clock in",
    clockOut: "Clock out",
    hours: "Hours",
    selectWorker: "Select worker",
    selectDate: "Select date",
    selectLocation: "Select location",
    workNotes: "Work notes",
    workNotesPlaceholder: "Describe what was completed during this shift.",
    editTimeRecord: "Edit time record",
    editTimeRecordDescription: "Update the selected record details and save your changes.",
    deleteTimeRecord: "Delete time record?",
    deleteTimeRecordDescription: "This will permanently remove the selected entry for",
    thisWorker: "this worker",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
  },
  lv: {
    search: "Meklēt...",
    searchDetailed: "Meklēt pēc darbinieka, lokācijas, paveiktā darba...",
    exportToExcel: "Eksportēt uz Excel",
    noData: "Dati nav atrasti.",
    visibleRecords: "Redzamie ieraksti",
    workersListed: "Uzskaitītie darbinieki",
    trackedHours: "Uzskaitītās stundas",
    rowActionsHint: "Izmantojiet rindas darbības, lai rediģētu vai dzēstu laika ierakstu.",
    resultsSummary: "rezultāti",
    previous: "Iepriekšējā",
    next: "Nākamā",
    worker: "Darbinieks",
    role: "Loma",
    date: "Datums",
    location: "Lokācija",
    works: "Darba piezīmes",
    clockIn: "Ierašanās",
    clockOut: "Aiziešana",
    hours: "Stundas",
    selectWorker: "Izvēlieties darbinieku",
    selectDate: "Izvēlieties datumu",
    selectLocation: "Izvēlieties lokāciju",
    workNotes: "Darba piezīmes",
    workNotesPlaceholder: "Aprakstiet, kas tika paveikts šajā maiņā.",
    editTimeRecord: "Rediģēt laika ierakstu",
    editTimeRecordDescription: "Atjauniniet izvēlētā ieraksta datus un saglabājiet izmaiņas.",
    deleteTimeRecord: "Dzēst laika ierakstu?",
    deleteTimeRecordDescription: "Tas neatgriezeniski noņems izvēlēto ierakstu par",
    thisWorker: "šo darbinieku",
    actions: "Darbības",
    edit: "Rediģēt",
    delete: "Dzēst",
    save: "Saglabāt",
    cancel: "Atcelt",
  },
};

const WORKERS_UI_MESSAGES: Record<OrganizationLanguage, WorkersUiMessages> = {
  en: {
    workersOnSite: "Workers on site",
    workersDescription: "Create, update, and delete workers available for timesheets on this project.",
    addWorker: "Add worker",
    addWorkerDescription: "Create a new worker profile for this site.",
    totalWorkers: "Total workers",
    firstName: "First Name",
    lastName: "Last Name",
    onSite: "On site?",
    lastWorkDate: "Last Work Date",
    lastWorkType: "Last Work Type",
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
    firstName: "Vārds",
    lastName: "Uzvārds",
    onSite: "Objektā?",
    lastWorkDate: "Pēdējā darba diena",
    lastWorkType: "Pēdējais darba veids",
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
    totalCost: "Total cost",
    refresh: "Refresh",
    status: "Status",
    all: "All",
    sent: "Sent",
    notSent: "Not sent",
    unsent: "Unsent",
    configPlaceholder: "Warehouse material configuration",
    allConfigurations: "All configurations",
    sortBy: "Sort by",
    sortDefault: "Default order",
    sortInvoiceNewest: "Invoice date (newest)",
    sortInvoiceOldest: "Invoice date (oldest)",
    sortNameAz: "Name A–Z",
    sortHighestQty: "Highest quantity",
    selectAllRows: "Select all visible warehouse records",
    photo: "Photo",
    material: "Material",
    bisMaterialConfiguration: "BIS material configuration",
    costCode: "Cost code",
    deliveryDate: "Delivery date",
    qty: "Qty",
    unit: "Unit",
    cost: "Cost",
    invoice: "Invoice",
    invoiceDate: "Invoice date",
    action: "Action",
    pickDate: "Pick date",
    unnamedMaterial: "Unnamed material",
    unknownType: "Unknown type",
    submitting: "Submitting...",
    editMaterial: "Edit material",
    materialName: "Material name",
    units: "Units",
    pickDeliveryDate: "Pick delivery date",
    pickInvoiceDate: "Pick invoice date",
    declarationDocument: "Declaration document",
    agreement: "Agreement",
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
    totalCost: "Kopējās izmaksas",
    refresh: "Atjaunot",
    status: "Statuss",
    all: "Visi",
    sent: "Nosūtīti",
    notSent: "Nav nosūtīti",
    unsent: "Nenosūtīti",
    configPlaceholder: "Noliktavas materiāla konfigurācija",
    allConfigurations: "Visas konfigurācijas",
    sortBy: "Kārtot pēc",
    sortDefault: "Noklusējuma secība",
    sortInvoiceNewest: "Rēķina datums (jaunākie)",
    sortInvoiceOldest: "Rēķina datums (vecākie)",
    sortNameAz: "Nosaukums A–Z",
    sortHighestQty: "Lielākais daudzums",
    selectAllRows: "Atlasīt visus redzamos noliktavas ierakstus",
    photo: "Foto",
    material: "Materiāls",
    bisMaterialConfiguration: "BIS materiāla konfigurācija",
    costCode: "Izmaksu kods",
    deliveryDate: "Piegādes datums",
    qty: "Daudz.",
    unit: "Vienība",
    cost: "Izmaksas",
    invoice: "Rēķins",
    invoiceDate: "Rēķina datums",
    action: "Darbība",
    pickDate: "Izvēlēties datumu",
    unnamedMaterial: "Nenorādīts materiāls",
    unknownType: "Nezināms tips",
    submitting: "Nosūta...",
    editMaterial: "Rediģēt materiālu",
    materialName: "Materiāla nosaukums",
    units: "Vienības",
    pickDeliveryDate: "Izvēlieties piegādes datumu",
    pickInvoiceDate: "Izvēlieties rēķina datumu",
    declarationDocument: "Atbilstību apliecinošs dokuments",
    agreement: "Vienošanās",
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
    emailColumn: "Email",
    firstNameColumn: "First name",
    lastNameColumn: "Last name",
    phoneColumn: "Phone",
    roleColumn: "Role",
    statusColumn: "Status",
    reminderTimeColumn: "Reminder time",
    remindersEnabledColumn: "Reminder enabled",
    reminderTextColumn: "Reminder text",
    reminderTextPlaceholder: "e.g. Please submit your report",
    previous: "Previous",
    next: "Next",
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
    emailColumn: "E-pasts",
    firstNameColumn: "Vārds",
    lastNameColumn: "Uzvārds",
    phoneColumn: "Tālrunis",
    roleColumn: "Loma",
    statusColumn: "Statuss",
    reminderTimeColumn: "Atgādinājuma laiks",
    remindersEnabledColumn: "Atgādinājums ieslēgts",
    reminderTextColumn: "Atgādinājuma teksts",
    reminderTextPlaceholder: "piem. Lūdzu iesniedziet atskaiti",
    previous: "Iepriekšējā",
    next: "Nākamā",
  },
};

const NAVIGATION_MESSAGES: Record<OrganizationLanguage, NavigationMessages> = {
  en: {
    projects: "Projects",
    organizationSettings: "Organization settings",
    siteDiary: "Site Diary",
    timesheets: "Timesheets",
    warehouse: "Warehouse",
    settings: "Settings",
  },
  lv: {
    projects: "Projekti",
    organizationSettings: "Organizācijas iestatījumi",
    siteDiary: "Būvdarbu žurnāls",
    timesheets: "Darba laika uzskaites lapas",
    warehouse: "Noliktava",
    settings: "Iestatījumi",
  },
};

const SITE_SETTINGS_MESSAGES: Record<OrganizationLanguage, SiteSettingsMessages> = {
  en: {
    goBack: "Go Back",
    danger: "Danger",
    dangerDescription: "This will delete your site and all data associated with it. Click the button below to delete everything.",
    bisIntegration: "BIS integration",
    bisDescription: "Connect your BIS account, then lock this site to a single BIS case.",
    connectionStatus: "Connection status",
    connected: "BIS is connected for your user account.",
    disconnected: "BIS is not connected. BIS actions stay hidden until you connect and assign a case.",
    connectBis: "Connect BIS",
    disconnectBis: "Disconnect BIS",
    bisCaseForSite: "BIS case for this site",
    selectBisCase: "Select a BIS case",
    saveBisCase: "Save BIS case",
    noCases: "BIS is connected, but no authorized BIS cases were returned for this user.",
    connectFirst: "Connect BIS first to load cases for this site.",
    disconnectNote: "Disconnecting BIS only removes access tokens. Existing site diary and material records remain in the database.",
    editSiteInfo: "Edit Site Info",
    editSiteDescription: "Update your site's name, description, or subdirectory.",
    name: "Name",
    description: "Description",
    subdirectory: "Subdirectory",
    siteArea: "Site area",
    siteAreaHint: "Draw the permitted site area for location-based worker clock-in.",
    saveChanges: "Save Changes",
    saving: "Saving...",
    deleteEverything: "Delete Everything",
    deleteProjectQuestion: "Delete this project?",
    deleteProjectDescription: "This action cannot be undone. It will permanently delete this site and all related data.",
    cancel: "Cancel",
    yesDelete: "Yes, delete",
    manualBisConnection: "Manual BIS connection",
    openBisAuthorizationStep: "Open BIS authorization in a new tab and complete the consent flow.",
    copyCodeStep: "Copy the code value from the final redirected URL.",
    pasteCodeStep: "Either paste that code in the field below or set BIS_AUTHORIZATION_CODE in your environment.",
    setEnvCodeStep: "Set BIS_AUTHORIZATION_CODE in your environment.",
    exchangeCodeStep: "Click the button below to exchange the authorization code for BIS tokens for your current user.",
  },
  lv: {
    goBack: "Atpakaļ",
    danger: "Bīstami",
    dangerDescription: "Tas izdzēsīs jūsu objektu un visus ar to saistītos datus. Noklikšķiniet uz pogas zemāk, lai dzēstu visu.",
    bisIntegration: "BIS integrācija",
    bisDescription: "Pieslēdziet savu BIS kontu un piesaistiet šim objektam vienu BIS lietu.",
    connectionStatus: "Savienojuma statuss",
    connected: "BIS ir pieslēgts jūsu lietotāja kontam.",
    disconnected: "BIS nav pieslēgts. BIS darbības būs paslēptas līdz savienojuma izveidei un lietas piesaistei.",
    connectBis: "Pieslēgt BIS",
    disconnectBis: "Atvienot BIS",
    bisCaseForSite: "BIS lieta šim objektam",
    selectBisCase: "Izvēlieties BIS lietu",
    saveBisCase: "Saglabāt BIS lietu",
    noCases: "BIS ir pieslēgts, bet šim lietotājam netika atrastas autorizētas BIS lietas.",
    connectFirst: "Vispirms pieslēdziet BIS, lai ielādētu šī objekta lietas.",
    disconnectNote: "BIS atvienošana noņem tikai piekļuves tokenus. Esošie žurnāla un materiālu ieraksti datubāzē paliek.",
    editSiteInfo: "Rediģēt objekta informāciju",
    editSiteDescription: "Atjauniniet objekta nosaukumu, aprakstu vai apakšdomēnu.",
    name: "Nosaukums",
    description: "Apraksts",
    subdirectory: "Apakšdirektorija",
    siteArea: "Objekta teritorija",
    siteAreaHint: "Uzzīmējiet atļauto objekta teritoriju darbinieku lokācijai balstītai ierašanās atzīmei.",
    saveChanges: "Saglabāt izmaiņas",
    saving: "Saglabā...",
    deleteEverything: "Dzēst visu",
    deleteProjectQuestion: "Dzēst šo projektu?",
    deleteProjectDescription: "Šo darbību nevar atsaukt. Tā neatgriezeniski dzēsīs objektu un visus saistītos datus.",
    cancel: "Atcelt",
    yesDelete: "Jā, dzēst",
    manualBisConnection: "Manuāls BIS savienojums",
    openBisAuthorizationStep: "Atveriet BIS autorizāciju jaunā cilnē un pabeidziet piekrišanas procesu.",
    copyCodeStep: "Nokopējiet code vērtību no gala pāradresācijas URL.",
    pasteCodeStep: "Ielīmējiet šo kodu zemāk esošajā laukā vai iestatiet BIS_AUTHORIZATION_CODE savā vidē.",
    setEnvCodeStep: "Iestatiet BIS_AUTHORIZATION_CODE savā vidē.",
    exchangeCodeStep: "Noklikšķiniet uz zemāk esošās pogas, lai apmainītu autorizācijas kodu pret BIS tokeniem jūsu lietotājam.",
  },
};

const SITE_DIARY_DIALOG_MESSAGES: Record<OrganizationLanguage, SiteDiaryDialogMessages> = {
  en: {
    additionalWorks: "Additional works",
    clientDelay: "Client Delay (hindrance)",
    internalDelay: "Internal Delay",
    note: "Note",
    otherWorks: "Other Works",
    recordDeleted: "Record deleted!",
    recordsSaved: "Records saved!",
    loading: "Loading…",
    addTask: "Add task",
    saveDiary: "Save diary",
    task: "Task",
    deleteTaskAria: "Delete task",
    createdBy: "Created by",
    delete: "Delete",
    unknown: "Unknown",
    select: "Select…",
    noDateSelected: "No date selected",
    close: "Close",
    loadingPhotos: "Loading photos…",
    failedLoadPhotos: "Failed to load photos",
    failedDeletePhoto: "Failed to delete photo",
    photosCount: "photos",
    noPhotosForDate: "No photos for this date.",
    photo: "Photo",
    deletePhoto: "Delete photo",
    previous: "Previous",
    next: "Next",
  },
  lv: {
    additionalWorks: "Papildu darbi",
    clientDelay: "Klienta kavējums (traucējums)",
    internalDelay: "Iekšējā kavēšanās",
    note: "Piezīme",
    otherWorks: "Citi darbi",
    recordDeleted: "Ieraksts dzēsts!",
    recordsSaved: "Ieraksti saglabāti!",
    loading: "Ielādē...",
    addTask: "Pievienot uzdevumu",
    saveDiary: "Saglabāt žurnālu",
    task: "Uzdevums",
    deleteTaskAria: "Dzēst uzdevumu",
    createdBy: "Izveidoja",
    delete: "Dzēst",
    unknown: "Nezināms",
    select: "Izvēlēties…",
    noDateSelected: "Datums nav izvēlēts",
    close: "Aizvērt",
    loadingPhotos: "Ielādē foto...",
    failedLoadPhotos: "Neizdevās ielādēt foto",
    failedDeletePhoto: "Neizdevās dzēst foto",
    photosCount: "foto",
    noPhotosForDate: "Šim datumam nav foto.",
    photo: "Foto",
    deletePhoto: "Dzēst foto",
    previous: "Iepriekšējā",
    next: "Nākamā",
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

export function getNavigationMessages(language?: string | null) {
  return NAVIGATION_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getSiteSettingsMessages(language?: string | null) {
  return SITE_SETTINGS_MESSAGES[normalizeOrganizationLanguage(language)];
}

export function getSiteDiaryDialogMessages(language?: string | null) {
  return SITE_DIARY_DIALOG_MESSAGES[normalizeOrganizationLanguage(language)];
}
