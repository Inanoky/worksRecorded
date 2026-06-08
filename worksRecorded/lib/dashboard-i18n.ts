export type OrganizationLanguage = "en" | "lv";

type DashboardMessages = {
  createProject: string;
  openProject: string;
  openingProject: string;
  yourSites: string;
  emptyTitle: string;
  emptyDescription: string;
  logOut: string;
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
  keywordSearchPlaceholder: string;
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
  edit: string;
  selectBisMaterialsDialogTitle: string;
  selectBisMaterialsDialogDescription: string;
  performedWorkDetails: string;
  bisEventDate: string;
  pickBisEventDate: string;
  multipleDayJob: string;
  bisEventDateTo: string;
  pickBisEventDateTo: string;
  bisEventDateToMustBeAfterStart: string;
  worksDescription: string;
  worksDescriptionLimit: string;
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
  selectAttachmentsFromGalleryTitle: string;
  previous: string;
  next: string;
  done: string;
  noDateSelected: string;
  attachmentsOptionalHelp: string;
  addManageAttachments: string;
  remove: string;
  cancel: string;
  sendSiteDiaryForApprovalTitle: string;
  sendSiteDiaryForApprovalDescription: string;
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
  workersSettings: string;
  workersDescription: string;
  addWorker: string;
  addWorkerDescription: string;
  createWorkerAndSetProjectAssignment: string;
  totalWorkers: string;
  firstName: string;
  lastName: string;
  worker: string;
  onSite: string;
  project: string;
  noProject: string;
  lastWorkDate: string;
  lastWorkType: string;
  reminderTime: string;
  reminderEnabled: string;
  reminderText: string;
  actions: string;
  editWorker: string;
  updateWorkerInformation: string;
  allWorkerEditsDoneInThisModal: string;
  name: string;
  surname: string;
  phone: string;
  countryCode: string;
  saveChanges: string;
  cancel: string;
  unnamed: string;
  enabled: string;
  disabled: string;
  edit: string;
  sendNow: string;
  delete: string;
  deleteWorkerConfirm: string;
};

type WarehouseMaterialConfigSelectMessages = {
  materialKindRequired: string;
  measurementRequired: string;
  materialTypeRequired: string;
  manufacturerRequired: string;
  createdAndSelected: string;
  cleared: string;
  updated: string;
  updateFailed: string;
  createFailed: string;
  searchMaterialPlaceholder: string;
  noConfiguration: string;
  createConfigurationOption: string;
  createDialogTitle: string;
  createDialogDescription: string;
  materialKind: string;
  materialKindPlaceholder: string;
  measurement: string;
  selectMeasurement: string;
  materialType: string;
  selectMaterialType: string;
  manufacturer: string;
  manufacturerPlaceholder: string;
  declaration: string;
  filesSelected: (count: number) => string;
  bisSourceLabel: string;
  organizationTemplateSourceLabel: string;
  templateCreatedAndSelected: string;
  templateCreateFailed: string;
  chooseOrganizationTemplate: string;
  selectOrganizationTemplate: string;
  cancel: string;
  create: string;
  creating: string;
};

type WarehouseUiMessages = {
  searchMaterials: string;
  totalCost: string;
  refresh: string;
  exportToExcel: string;
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
  sendToBis: string;
  openInBis: string;
  statusWorksRecorded: string;
  statusBisDraft: string;
  statusBisApproved: string;
  statusBisPending: string;
  selectConfiguration: string;
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
  sendForApproval: string;
  sendRecordForApprovalTitle: string;
  selectApproversForApprovalDescription: string;
  noBisApprovers: string;
  member: string;
  level: string;
  recordSentForApproval: string;
  failedToSendRecordForApproval: string;
  copy: string;
  copying: string;
  copied: string;
  copyFailed: string;
  materialConfigSelect: WarehouseMaterialConfigSelectMessages;
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
  openBisAuthorization: string;
  disconnectBis: string;
  bisCaseForSite: string;
  selectBisCase: string;
  saveBisCase: string;
  constructionRound: string;
  selectConstructionRound: string;
  saveConstructionRound: string;
  constructionRoundSaved: string;
  selectedConstructionRound: string;
  noConstructionRounds: string;
  constructionRoundMissing: string;
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
  bisTutorialTitle: string;
  bisTutorialDescription: string;
  continue: string;
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
  manageOptions: string;
  manageLocationsTitle: string;
  manageWorksTitle: string;
  searchOption: string;
  addNewOption: string;
  add: string;
  save: string;
  cancel: string;
  saveOption: string;
  cancelEditingOption: string;
  editOption: string;
  deleteOption: string;
  noOptionsFound: string;
  optionCannotBeEmpty: string;
  optionAlreadyExists: string;
  optionMaxLength: (maxLength: number) => string;
  atLeastOneOptionRequired: string;
  eachOptionMaxLength: (maxLength: number) => string;
  dropdownOptionsUpdated: string;
  failedUpdateDropdownOptions: string;
  unitLabels: Record<string, string>;
};

type ToastMessages = {
  savedSuccessfully: string;
  workerCreated: string;
  failedCreateWorker: string;
  workerDeleted: string;
  failedDeleteWorker: string;
  workerUpdated: string;
  failedUpdateWorker: string;
  nameSurnameRequired: string;
  phoneTooShort: string;
  phoneTooLong: string;
  phoneAlreadyUsed: string;
  internationalPhoneWithCountryCodeRequired: string;
  failedAddWorker: string;
  languageUpdated: string;
  organizationLanguageUpdated: string;
  failedUpdateOrganizationLanguage: string;
  correctForm: string;
  fieldRequired: (field: string) => string;
  failedUpdateTimeRecord: string;
  timeRecordUpdated: string;
  timeRecordDeleted: string;
  failedDeleteTimeRecord: string;
  reminderSent: string;
  failedSendReminder: string;
  failedSendInvite: string;
  failedDeleteUser: string;
  userDeleted: string;
  imageUploaded: string;
  uploadNoUrl: string;
  somethingWentWrong: string;
  uploadImageFirst: string;
  noRecordsSelected: string;
  deletedRecords: (count: number) => string;
  deletedRecordsPartial: (count: number, failed: number) => string;
  failedDeleteSelectedRecords: string;
  recordCannotBeSentNoId: string;
  missingSiteId: string;
  failedLoadBisOptions: string;
  sendSiteDiaryToBisFirst: string;
  failedLoadBisApprovers: string;
  noRecordSelectedForApproval: string;
  selectAtLeastOneApprover: string;
  siteDiarySubmittedForApproval: string;
  failedSubmitApproval: string;
  selectRecordAndTargetDate: string;
  recordCopiedLocally: string;
  failedCopyRecord: string;
  recordDeleted: string;
  failedDeleteRecord: string;
  bisLinksRemoved: (count: number) => string;
  bisSyncNoDeletedRecords: string;
  failedSyncBisRecords: string;
  missingSelectedRecordId: string;
  selectResponsiblePerson: string;
  siteDiarySentToBis: string;
  failedSendSiteDiaryToBis: string;
  recordNotSentToBisYet: string;
  bisUrlUnavailable: string;
  failedOpenRecordInBis: string;
  validationError: (path: string, message: string) => string;
  rowAmountsMax: (row: string, max: number) => string;
  rowHoursMax: (row: string, max: number) => string;
  rowWorkersMax: (row: string, max: number) => string;
  diaryRowDeleted: string;
  unsavedRowRemoved: string;
  updateDiaryRowFailed: (id: string, message: string) => string;
  createDiaryRowsFailed: (message: string) => string;
  diarySaved: (updated: number, created: number) => string;
  sentSuccessfully: string;
  failedSendToBis: string;
  selectCertificateFile: string;
  certificateAttachedSendAgain: string;
  failedAttachCertificate: string;
  materialNameRequired: string;
  materialNameMax: (max: number) => string;
  quantityRange: (max: number) => string;
  costRange: (max: number) => string;
  unitsMax: (max: number) => string;
  materialConfirmedAndSent: string;
  materialUpdated: string;
  failedSaveMaterial: string;
  recordsDeleted: (count: number) => string;
  someBisRecordsOnlyDeletedLocally: string;
  failedDeleteRecords: string;
  changesSaved: string;
  failedSaveChanges: string;
  costCodeCannotBeEmpty: string;
  costCodeAlreadyExists: string;
  atLeastOneCostCodeRequired: string;
  costCodesUpdated: string;
  failedUpdateCostCodes: string;
  costCodeUpdated: string;
  costCodeCleared: string;
  failedUpdateCostCode: string;
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
    logOut: "Log out",
  },
  lv: {
    createProject: "Izveidot projektu",
    openProject: "Atvērt projektu",
    openingProject: "Atver projektu...",
    yourSites: "Jūsu projekti",
    emptyTitle: "Jums vēl nav izveidotu projektu",
    emptyDescription: "Pašlaik jums nav projektu. Lūdzu, izveidojiet projektu, lai tas tiktu parādīts šeit.",
    logOut: "Izrakstīties",
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
    keywordSearchPlaceholder: "Search keyword…",
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
    edit: "Edit",
    selectBisMaterialsDialogTitle: "Select BIS materials and attachments",
    selectBisMaterialsDialogDescription:
      "Select approved materials, adjust diary data to send, and optionally attach gallery images.",
    performedWorkDetails: "Performed work details",
    bisEventDate: "BIS event date",
    pickBisEventDate: "Pick BIS event date",
    multipleDayJob: "Multiple day job",
    bisEventDateTo: "BIS event date to",
    pickBisEventDateTo: "Pick BIS event date to",
    bisEventDateToMustBeAfterStart: "BIS event date to must be after the start date.",
    worksDescription: "Works description",
    worksDescriptionLimit: "Max 200 characters",
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
    selectAttachmentsFromGalleryTitle: "Select attachments from gallery",
    previous: "Previous",
    next: "Next",
    done: "Done",
    noDateSelected: "No date selected",
    attachmentsOptionalHelp: "Attachments are optional. Add them only if you want photo evidence in BIS.",
    addManageAttachments: "Add / manage attachments",
    remove: "Remove",
    cancel: "Cancel",
    sendSiteDiaryForApprovalTitle: "Send site diary record for approval",
    sendSiteDiaryForApprovalDescription:
      "Select one or more approvers before submitting this BIS record for approval.",
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
    keywordSearchPlaceholder: "Meklēt pēc atslēgvārda…",
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
    sentForApproval: "Apstiprināšana",
    sendForApproval: "Sūtīt apstiprināšanai",
    copyToDate: "Kopēt uz datumu",
    openInBis: "Atvērt BIS",
    time: "Laiks",
    status: "Statuss",
    action: "Darbība",
    source: "Avots",
    copy: "Kopēt",
    edit: "Rediģēt",
    selectBisMaterialsDialogTitle: "Atlasiet BIS materiālus un pielikumus",
    selectBisMaterialsDialogDescription:
      "Atlasiet apstiprinātos materiālus, pielāgojiet nosūtāmos žurnāla datus un pēc izvēles pievienojiet galerijas attēlus.",
    performedWorkDetails: "Veikto darbu informācija",
    bisEventDate: "BIS notikuma datums",
    pickBisEventDate: "Izvēlieties BIS notikuma datumu",
    multipleDayJob: "Vairāku dienu darbs",
    bisEventDateTo: "BIS notikuma datums līdz",
    pickBisEventDateTo: "Ievadīt",
    bisEventDateToMustBeAfterStart: "BIS notikuma beigu datumam jābūt pēc sākuma datuma.",
    worksDescription: "Darbu apraksts",
    worksDescriptionLimit: "Maks. 200 rakstzīmes",
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
    selectAttachmentsFromGalleryTitle: "Atlasiet pielikumus no galerijas",
    previous: "Iepriekšējā",
    next: "Nākamā",
    done: "Gatavs",
    noDateSelected: "Datums nav izvēlēts",
    attachmentsOptionalHelp: "Pielikumi nav obligāti. Pievienojiet tos tikai tad, ja BIS nepieciešami foto pierādījumi.",
    addManageAttachments: "Pievienot / pārvaldīt pielikumus",
    remove: "Noņemt",
    cancel: "Atcelt",
    sendSiteDiaryForApprovalTitle: "Sūtīt būvdarbu žurnāla ierakstu apstiprināšanai",
    sendSiteDiaryForApprovalDescription:
      "Atlasiet vienu vai vairākus apstiprinātājus, pirms iesniedzat šo BIS ierakstu apstiprināšanai.",
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
    workersSettings: "Workers settings",
    workersDescription: "Create, update, and delete workers available for timesheets on this project.",
    addWorker: "Add worker",
    addWorkerDescription: "Create a new worker profile for this site.",
    createWorkerAndSetProjectAssignment: "Create worker and set project assignment.",
    totalWorkers: "Total workers",
    firstName: "First Name",
    lastName: "Last Name",
    worker: "Worker",
    onSite: "On site?",
    project: "Project",
    noProject: "No project",
    lastWorkDate: "Last Work Date",
    lastWorkType: "Last Work Type",
    reminderTime: "Reminder time",
    reminderEnabled: "Reminder enabled",
    reminderText: "Reminder text",
    actions: "Actions",
    editWorker: "Edit worker",
    updateWorkerInformation: "Update worker information.",
    allWorkerEditsDoneInThisModal: "All worker edits are done in this modal.",
    name: "Name",
    surname: "Surname",
    phone: "Phone",
    countryCode: "Country code",
    saveChanges: "Save changes",
    cancel: "Cancel",
    unnamed: "Unnamed",
    enabled: "Enabled",
    disabled: "Disabled",
    edit: "Edit",
    sendNow: "Send now",
    delete: "Delete",
    deleteWorkerConfirm: "Delete this worker? This action cannot be undone.",
  },
  lv: {
    workersOnSite: "Objektā esošie darbinieki",
    workersSettings: "Darbinieku iestatījumi",
    workersDescription: "Izveidojiet, rediģējiet un dzēsiet darbiniekus, kas pieejami darba laika uzskaitei šajā projektā.",
    addWorker: "Pievienot darbinieku",
    addWorkerDescription: "Izveidojiet jaunu darbinieka profilu šim objektam.",
    createWorkerAndSetProjectAssignment: "Izveidojiet darbinieku un piesaistiet projektu.",
    totalWorkers: "Kopā darbinieki",
    firstName: "Vārds",
    lastName: "Uzvārds",
    worker: "Darbinieks",
    onSite: "Objektā?",
    project: "Projekts",
    noProject: "Nav projekta",
    lastWorkDate: "Pēdējā darba diena",
    lastWorkType: "Pēdējais darba veids",
    reminderTime: "Atgādinājuma laiks",
    reminderEnabled: "Atgādinājums ieslēgts",
    reminderText: "Atgādinājuma teksts",
    actions: "Darbības",
    editWorker: "Rediģēt darbinieku",
    updateWorkerInformation: "Atjauniniet darbinieka informāciju.",
    allWorkerEditsDoneInThisModal: "Visas darbinieka izmaiņas tiek veiktas šajā logā.",
    name: "Vārds",
    surname: "Uzvārds",
    phone: "Tālrunis",
    countryCode: "Valsts kods",
    saveChanges: "Saglabāt izmaiņas",
    cancel: "Atcelt",
    unnamed: "Bez vārda",
    enabled: "Ieslēgts",
    disabled: "Izslēgts",
    edit: "Rediģēt",
    sendNow: "Nosūtīt tagad",
    delete: "Dzēst",
    deleteWorkerConfirm: "Dzēst šo darbinieku? Šo darbību nevar atsaukt.",
  },
};

const WAREHOUSE_UI_MESSAGES: Record<OrganizationLanguage, WarehouseUiMessages> = {
  en: {
    searchMaterials: "Search materials...",
    totalCost: "Total cost",
    refresh: "Refresh",
    exportToExcel: "Export to Excel",
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
    sendToBis: "Send to BIS",
    openInBis: "Open in BIS",
    statusWorksRecorded: "WorksRecorded",
    statusBisDraft: "BIS draft",
    statusBisApproved: "BIS approved",
    statusBisPending: "BIS pending",
    selectConfiguration: "Select configuration",
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
    sendForApproval: "Send for approval",
    sendRecordForApprovalTitle: "Send record for approval",
    selectApproversForApprovalDescription: "Select one or more approvers for this warehouse record before sending it into the BIS approval flow.",
    noBisApprovers: "No BIS approvers were returned for this record.",
    member: "Member",
    level: "Level",
    recordSentForApproval: "Record sent for approval",
    failedToSendRecordForApproval: "Failed to send record for approval",
    copy: "Copy",
    copying: "Copying...",
    copied: "Material copied",
    copyFailed: "Failed to copy material",
    materialConfigSelect: {
      materialKindRequired: "Material kind is required",
      measurementRequired: "Measurement is required",
      materialTypeRequired: "Material type is required",
      manufacturerRequired: "Manufacturer is required",
      createdAndSelected: "Material configuration created and selected",
      cleared: "BIS material configuration cleared",
      updated: "BIS material configuration updated",
      updateFailed: "Failed to update BIS material configuration",
      createFailed: "Failed to create material configuration",
      searchMaterialPlaceholder: "Search material...",
      noConfiguration: "— No configuration —",
      createConfigurationOption: "+ Create material configuration",
      createDialogTitle: "Create BIS material configuration",
      createDialogDescription: "Create a new configuration and attach supporting files before sending it to BIS.",
      materialKind: "Material kind",
      materialKindPlaceholder: "E.g. Concrete C30/37",
      measurement: "Measurement",
      selectMeasurement: "Select measurement",
      materialType: "Material type",
      selectMaterialType: "Select material type",
      manufacturer: "Manufacturer",
      manufacturerPlaceholder: "Enter manufacturer",
      declaration: "Declaration",
      filesSelected: (count) => `${count} file(s) selected`,
      bisSourceLabel: "BIS",
      organizationTemplateSourceLabel: "Organization template",
      templateCreatedAndSelected: "Organization template created in BIS and selected",
      templateCreateFailed: "Failed to create BIS configuration from organization template",
      chooseOrganizationTemplate: "Organization template",
      selectOrganizationTemplate: "Select organization template",
      cancel: "Cancel",
      create: "Create",
      creating: "Creating...",
    },
  },
  lv: {
    searchMaterials: "Meklēt materiālus...",
    totalCost: "Kopējās izmaksas",
    refresh: "Atjaunot",
    exportToExcel: "Eksportēt uz Excel",
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
    sendToBis: "Sūtīt uz BIS",
    openInBis: "Atvērt BIS",
    statusWorksRecorded: "WorksRecorded",
    statusBisDraft: "BIS melnraksts",
    statusBisApproved: "BIS apstiprināts",
    statusBisPending: "BIS gaida apstiprinājumu",
    selectConfiguration: "Izvēlēties konfigurāciju",
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
    sentForApproval: "Apstiprināšana",
    sendForApproval: "Sūtīt apstiprināšanai",
    sendRecordForApprovalTitle: "Sūtīt ierakstu apstiprināšanai",
    selectApproversForApprovalDescription: "Izvēlieties vienu vai vairākus apstiprinātājus šim noliktavas ierakstam pirms nosūtīšanas BIS apstiprināšanas plūsmā.",
    noBisApprovers: "Šim ierakstam BIS apstiprinātāji netika atrasti.",
    member: "Dalībnieks",
    level: "Līmenis",
    recordSentForApproval: "Ieraksts nosūtīts apstiprināšanai",
    failedToSendRecordForApproval: "Neizdevās nosūtīt ierakstu apstiprināšanai",
    copy: "Kopēt",
    copying: "Kopē...",
    copied: "Materiāls nokopēts",
    copyFailed: "Neizdevās kopēt materiālu",
    materialConfigSelect: {
      materialKindRequired: "Materiāla veids ir obligāts",
      measurementRequired: "Mērvienība ir obligāta",
      materialTypeRequired: "Materiāla tips ir obligāts",
      manufacturerRequired: "Ražotājs ir obligāts",
      createdAndSelected: "Materiāla konfigurācija izveidota un izvēlēta",
      cleared: "BIS materiāla konfigurācija notīrīta",
      updated: "BIS materiāla konfigurācija atjaunināta",
      updateFailed: "Neizdevās atjaunināt BIS materiāla konfigurāciju",
      createFailed: "Neizdevās izveidot materiāla konfigurāciju",
      searchMaterialPlaceholder: "Meklēt materiālu...",
      noConfiguration: "— Nav konfigurācijas —",
      createConfigurationOption: "+ Izveidot materiāla konfigurāciju",
      createDialogTitle: "Izveidot BIS materiāla konfigurāciju",
      createDialogDescription: "Izveidojiet jaunu konfigurāciju un pievienojiet apliecinošos failus pirms nosūtīšanas uz BIS.",
      materialKind: "Materiāla veids",
      materialKindPlaceholder: "Piem., Betons C30/37",
      measurement: "Mērvienība",
      selectMeasurement: "Izvēlieties mērvienību",
      materialType: "Materiāla tips",
      selectMaterialType: "Izvēlieties materiāla tipu",
      manufacturer: "Ražotājs",
      manufacturerPlaceholder: "Ievadiet ražotāju",
      declaration: "Deklarācija",
      filesSelected: (count) => `Izvēlēti faili: ${count}`,
      bisSourceLabel: "BIS",
      organizationTemplateSourceLabel: "Organizācijas veidne",
      templateCreatedAndSelected: "Organizācijas veidne izveidota BIS un izvēlēta",
      templateCreateFailed: "Neizdevās izveidot BIS konfigurāciju no organizācijas veidnes",
      chooseOrganizationTemplate: "Organizācijas veidne",
      selectOrganizationTemplate: "Izvēlieties organizācijas veidni",
      cancel: "Atcelt",
      create: "Izveidot",
      creating: "Izveido...",
    },
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
    openBisAuthorization: "Open BIS authorization",
    disconnectBis: "Disconnect BIS",
    bisCaseForSite: "BIS case for this site",
    selectBisCase: "Select a BIS case",
    saveBisCase: "Save BIS case",
    constructionRound: "Construction round",
    selectConstructionRound: "Select construction round",
    saveConstructionRound: "Save construction round",
    constructionRoundSaved: "BIS construction round saved.",
    selectedConstructionRound: "Selected",
    noConstructionRounds: "No construction rounds were returned for this BIS case.",
    constructionRoundMissing: "BIS records will not include a construction round until one is selected.",
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
    bisTutorialTitle: "BIS authentication tutorial",
    bisTutorialDescription: "Please review the tutorial before continuing to BIS authentication.",
    continue: "Continue",
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
    openBisAuthorization: "Atvērt BIS autorizāciju",
    disconnectBis: "Atvienot BIS",
    bisCaseForSite: "BIS lieta šim objektam",
    selectBisCase: "Izvēlieties BIS lietu",
    saveBisCase: "Saglabāt BIS lietu",
    constructionRound: "Būvniecības kārta",
    selectConstructionRound: "Izvēlieties būvniecības kārtu",
    saveConstructionRound: "Saglabāt būvniecības kārtu",
    constructionRoundSaved: "BIS būvniecības kārta saglabāta.",
    selectedConstructionRound: "Izvēlēts",
    noConstructionRounds: "Šai BIS lietai netika atgrieztas būvniecības kārtas.",
    constructionRoundMissing: "BIS ieraksti netiks piesaistīti būvniecības kārtai, kamēr tā nav izvēlēta.",
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
    bisTutorialTitle: "BIS autentifikācijas pamācība",
    bisTutorialDescription: "Pirms turpināt BIS autentifikāciju, lūdzu, apskatiet pamācību.",
    continue: "Turpināt",
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
    manageOptions: "Manage options…",
    manageLocationsTitle: "Manage locations",
    manageWorksTitle: "Manage works",
    searchOption: "Search option",
    addNewOption: "Add new option",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    saveOption: "Save option",
    cancelEditingOption: "Cancel editing option",
    editOption: "Edit option",
    deleteOption: "Delete option",
    noOptionsFound: "No options found.",
    optionCannotBeEmpty: "Option cannot be empty",
    optionAlreadyExists: "Option already exists",
    optionMaxLength: (maxLength) => `Option cannot exceed ${maxLength} characters`,
    atLeastOneOptionRequired: "At least one option is required",
    eachOptionMaxLength: (maxLength) => `Each option must be ${maxLength} characters or less`,
    dropdownOptionsUpdated: "Dropdown options updated",
    failedUpdateDropdownOptions: "Failed to update dropdown options",
    unitLabels: {
      m: "m",
      m2: "m2",
      m3: "m3",
      tn: "tn",
      kg: "kg",
      pcs: "pcs",
      package: "package",
      project: "project",
      hour: "hour",
      set: "set",
      minute: "minute",
      lifts: "lifts",
    },
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
    manageOptions: "Pārvaldīt opcijas…",
    manageLocationsTitle: "Pārvaldīt lokācijas",
    manageWorksTitle: "Pārvaldīt darbus",
    searchOption: "Meklēt opciju",
    addNewOption: "Pievienot jaunu opciju",
    add: "Pievienot",
    save: "Saglabāt",
    cancel: "Atcelt",
    saveOption: "Saglabāt opciju",
    cancelEditingOption: "Atcelt opcijas rediģēšanu",
    editOption: "Rediģēt opciju",
    deleteOption: "Dzēst opciju",
    noOptionsFound: "Opcijas nav atrastas.",
    optionCannotBeEmpty: "Opcija nedrīkst būt tukša",
    optionAlreadyExists: "Opcija jau pastāv",
    optionMaxLength: (maxLength) => `Opcija nedrīkst pārsniegt ${maxLength} rakstzīmes`,
    atLeastOneOptionRequired: "Nepieciešama vismaz viena opcija",
    eachOptionMaxLength: (maxLength) => `Katrai opcijai jābūt ${maxLength} rakstzīmēm vai mazāk`,
    dropdownOptionsUpdated: "Nolaižamās izvēlnes opcijas atjauninātas",
    failedUpdateDropdownOptions: "Neizdevās atjaunināt nolaižamās izvēlnes opcijas",
    unitLabels: {
      m: "m",
      m2: "m²",
      m3: "m³",
      tn: "tn",
      kg: "kg",
      pcs: "gab.",
      package: "iepakojums",
      project: "projekts",
      hour: "stunda",
      set: "komplekts",
      minute: "minūte",
      lifts: "pacēlieni",
    },
  },
};

const TOAST_MESSAGES: Record<OrganizationLanguage, ToastMessages> = {
  en: {
    savedSuccessfully: "Saved successfully",
    workerCreated: "Worker created",
    failedCreateWorker: "Failed to create worker",
    workerDeleted: "Worker deleted",
    failedDeleteWorker: "Failed to delete worker",
    workerUpdated: "Worker updated",
    failedUpdateWorker: "Failed to update worker",
    nameSurnameRequired: "Name and surname are required",
    phoneTooShort: "Phone number is too short",
    phoneTooLong: "Phone number is too long",
    phoneAlreadyUsed: "Phone number already used",
    internationalPhoneWithCountryCodeRequired:
      "Enter the full phone number with country code, for example +371 24885690.",
    failedAddWorker: "Failed to add worker",
    languageUpdated: "Language updated",
    organizationLanguageUpdated: "Organization language updated",
    failedUpdateOrganizationLanguage: "Failed to update organization language",
    correctForm: "Please correct the form.",
    fieldRequired: (field) => `${field} is required.`,
    failedUpdateTimeRecord: "Failed to update time record.",
    timeRecordUpdated: "Time record updated.",
    timeRecordDeleted: "Time record deleted.",
    failedDeleteTimeRecord: "Failed to delete time record.",
    reminderSent: "Reminder sent",
    failedSendReminder: "Failed to send reminder",
    failedSendInvite: "Failed to send invite",
    failedDeleteUser: "Failed to delete user",
    userDeleted: "User deleted",
    imageUploaded: "Image has been uploaded",
    uploadNoUrl: "Upload finished but no URL was returned",
    somethingWentWrong: "Something went wrong",
    uploadImageFirst: "Please upload an image first",
    noRecordsSelected: "No records selected.",
    deletedRecords: (count) => `Deleted ${count} record(s).`,
    deletedRecordsPartial: (count, failed) => `Deleted ${count} record(s), ${failed} failed.`,
    failedDeleteSelectedRecords: "Failed to delete selected records.",
    recordCannotBeSentNoId: "This record cannot be sent because it has no id.",
    missingSiteId: "Missing site id.",
    failedLoadBisOptions: "Failed to load BIS material or attachment options.",
    sendSiteDiaryToBisFirst: "Send this site diary record to BIS first.",
    failedLoadBisApprovers: "Failed to load BIS approvers.",
    noRecordSelectedForApproval: "No record selected for approval.",
    selectAtLeastOneApprover: "Select at least one approver.",
    siteDiarySubmittedForApproval: "Site diary record submitted for BIS approval.",
    failedSubmitApproval: "Failed to submit approval.",
    selectRecordAndTargetDate: "Select a record and target date.",
    recordCopiedLocally: "Record copied locally. Submit it to BIS again if needed.",
    failedCopyRecord: "Failed to copy record.",
    recordDeleted: "Record deleted",
    failedDeleteRecord: "Failed to delete record.",
    bisLinksRemoved: (count) => `${count} BIS link(s) were removed because records were deleted in BIS.`,
    bisSyncNoDeletedRecords: "BIS sync completed. No deleted BIS records found.",
    failedSyncBisRecords: "Failed to sync BIS records.",
    missingSelectedRecordId: "Missing selected record id.",
    selectResponsiblePerson: "Please select a responsible person for BIS submission.",
    siteDiarySentToBis: "Site diary record sent to BIS.",
    failedSendSiteDiaryToBis: "Failed to send site diary record to BIS.",
    recordNotSentToBisYet: "This record has not been sent to BIS yet.",
    bisUrlUnavailable: "BIS URL is not available for this record.",
    failedOpenRecordInBis: "Failed to open record in BIS.",
    validationError: (path, message) => `Validation error in "${path}": ${message}`,
    rowAmountsMax: (row, max) => `Row ${row}: Amounts must be <= ${max}`,
    rowHoursMax: (row, max) => `Row ${row}: Hours must be <= ${max}`,
    rowWorkersMax: (row, max) => `Row ${row}: Workers must be an integer <= ${max}`,
    diaryRowDeleted: "Diary row deleted successfully.",
    unsavedRowRemoved: "Unsaved row removed.",
    updateDiaryRowFailed: (id, message) => `Could not update existing diary row (${id}). ${message}`,
    createDiaryRowsFailed: (message) => `Could not create new diary rows. ${message}`,
    diarySaved: (updated, created) => `Diary saved: ${updated} updated, ${created} created.`,
    sentSuccessfully: "Sent successfully",
    failedSendToBis: "Failed to send to BIS",
    selectCertificateFile: "Please select a certificate file.",
    certificateAttachedSendAgain: "Certificate attached. Please click Send to BIS again.",
    failedAttachCertificate: "Failed to attach certificate.",
    materialNameRequired: "Material name is required.",
    materialNameMax: (max) => `Material name must be ${max} characters or fewer.`,
    quantityRange: (max) => `Quantity must be a number between 0 and ${max}.`,
    costRange: (max) => `Cost must be a number between 0 and ${max}.`,
    unitsMax: (max) => `Units must be ${max} characters or fewer.`,
    materialConfirmedAndSent: "Material confirmed and sent to BIS",
    materialUpdated: "Material updated",
    failedSaveMaterial: "Failed to save material",
    recordsDeleted: (count) => (count === 1 ? "Record deleted" : `${count} records deleted`),
    someBisRecordsOnlyDeletedLocally: "Some deleted records were already sent to BIS. They were removed only from WorksRecorded and stay in BIS.",
    failedDeleteRecords: "Failed to delete records",
    changesSaved: "Changes saved",
    failedSaveChanges: "Failed to save changes",
    costCodeCannotBeEmpty: "Cost code cannot be empty",
    costCodeAlreadyExists: "Cost code already exists",
    atLeastOneCostCodeRequired: "At least one cost code is required",
    costCodesUpdated: "Cost codes updated",
    failedUpdateCostCodes: "Failed to update cost codes",
    costCodeUpdated: "Cost code updated",
    costCodeCleared: "Cost code cleared",
    failedUpdateCostCode: "Failed to update cost code",
  },
  lv: {
    savedSuccessfully: "Saglabāts veiksmīgi",
    workerCreated: "Darbinieks izveidots",
    failedCreateWorker: "Neizdevās izveidot darbinieku",
    workerDeleted: "Darbinieks dzēsts",
    failedDeleteWorker: "Neizdevās dzēst darbinieku",
    workerUpdated: "Darbinieks atjaunināts",
    failedUpdateWorker: "Neizdevās atjaunināt darbinieku",
    nameSurnameRequired: "Vārds un uzvārds ir obligāti",
    phoneTooShort: "Tālruņa numurs ir pārāk īss",
    phoneTooLong: "Tālruņa numurs ir pārāk garš",
    phoneAlreadyUsed: "Tālruņa numurs jau tiek izmantots",
    internationalPhoneWithCountryCodeRequired:
      "Ievadiet pilnu tālruņa numuru ar valsts kodu, piemēram, +371 24885690.",
    failedAddWorker: "Neizdevās pievienot darbinieku",
    languageUpdated: "Valoda nomainīta",
    organizationLanguageUpdated: "Organizācijas valoda nomainīta",
    failedUpdateOrganizationLanguage: "Neizdevās atjaunināt organizācijas valodu",
    correctForm: "Lūdzu, izlabojiet formu.",
    fieldRequired: (field) => `${field} ir obligāts lauks.`,
    failedUpdateTimeRecord: "Neizdevās atjaunināt laika ierakstu.",
    timeRecordUpdated: "Laika ieraksts atjaunināts.",
    timeRecordDeleted: "Laika ieraksts dzēsts.",
    failedDeleteTimeRecord: "Neizdevās dzēst laika ierakstu.",
    reminderSent: "Atgādinājums nosūtīts",
    failedSendReminder: "Neizdevās nosūtīt atgādinājumu",
    failedSendInvite: "Neizdevās nosūtīt uzaicinājumu",
    failedDeleteUser: "Neizdevās dzēst lietotāju",
    userDeleted: "Lietotājs dzēsts",
    imageUploaded: "Attēls augšupielādēts",
    uploadNoUrl: "Augšupielāde pabeigta, bet saite netika saņemta",
    somethingWentWrong: "Kaut kas nogāja greizi",
    uploadImageFirst: "Lūdzu, vispirms augšupielādējiet attēlu",
    noRecordsSelected: "Nav atlasītu ierakstu.",
    deletedRecords: (count) => `Dzēsti ${count} ieraksti.`,
    deletedRecordsPartial: (count, failed) => `Dzēsti ${count} ieraksti, ${failed} neizdevās.`,
    failedDeleteSelectedRecords: "Neizdevās dzēst atlasītos ierakstus.",
    recordCannotBeSentNoId: "Šo ierakstu nevar nosūtīt, jo tam nav ID.",
    missingSiteId: "Trūkst objekta ID.",
    failedLoadBisOptions: "Neizdevās ielādēt BIS materiālu vai pielikumu opcijas.",
    sendSiteDiaryToBisFirst: "Vispirms nosūtiet šo būvdarbu žurnāla ierakstu uz BIS.",
    failedLoadBisApprovers: "Neizdevās ielādēt BIS apstiprinātājus.",
    noRecordSelectedForApproval: "Apstiprināšanai nav atlasīts ieraksts.",
    selectAtLeastOneApprover: "Atlasiet vismaz vienu apstiprinātāju.",
    siteDiarySubmittedForApproval: "Būvdarbu žurnāla ieraksts nosūtīts BIS apstiprināšanai.",
    failedSubmitApproval: "Neizdevās nosūtīt apstiprināšanai.",
    selectRecordAndTargetDate: "Atlasiet ierakstu un mērķa datumu.",
    recordCopiedLocally: "Ieraksts nokopēts lokāli. Ja nepieciešams, nosūtiet to uz BIS vēlreiz.",
    failedCopyRecord: "Neizdevās kopēt ierakstu.",
    recordDeleted: "Ieraksts dzēsts",
    failedDeleteRecord: "Neizdevās dzēst ierakstu.",
    bisLinksRemoved: (count) => `${count} BIS saites noņemtas, jo ieraksti BIS ir dzēsti.`,
    bisSyncNoDeletedRecords: "BIS sinhronizācija pabeigta. Dzēsti BIS ieraksti nav atrasti.",
    failedSyncBisRecords: "Neizdevās sinhronizēt BIS ierakstus.",
    missingSelectedRecordId: "Trūkst atlasītā ieraksta ID.",
    selectResponsiblePerson: "Lūdzu, atlasiet atbildīgo personu nosūtīšanai uz BIS.",
    siteDiarySentToBis: "Būvdarbu žurnāla ieraksts nosūtīts uz BIS.",
    failedSendSiteDiaryToBis: "Neizdevās nosūtīt būvdarbu žurnāla ierakstu uz BIS.",
    recordNotSentToBisYet: "Šis ieraksts vēl nav nosūtīts uz BIS.",
    bisUrlUnavailable: "Šim ierakstam BIS saite nav pieejama.",
    failedOpenRecordInBis: "Neizdevās atvērt ierakstu BIS.",
    validationError: (path, message) => `Validācijas kļūda laukā "${path}": ${message}`,
    rowAmountsMax: (row, max) => `Rinda ${row}: daudzumam jābūt <= ${max}`,
    rowHoursMax: (row, max) => `Rinda ${row}: stundām jābūt <= ${max}`,
    rowWorkersMax: (row, max) => `Rinda ${row}: darbiniekiem jābūt veselam skaitlim <= ${max}`,
    diaryRowDeleted: "Žurnāla rinda dzēsta veiksmīgi.",
    unsavedRowRemoved: "Nesaglabātā rinda noņemta.",
    updateDiaryRowFailed: (id, message) => `Neizdevās atjaunināt esošo žurnāla rindu (${id}). ${message}`,
    createDiaryRowsFailed: (message) => `Neizdevās izveidot jaunas žurnāla rindas. ${message}`,
    diarySaved: (updated, created) => `Žurnāls saglabāts: atjaunināti ${updated}, izveidoti ${created}.`,
    sentSuccessfully: "Nosūtīts veiksmīgi",
    failedSendToBis: "Neizdevās nosūtīt uz BIS",
    selectCertificateFile: "Lūdzu, atlasiet sertifikāta failu.",
    certificateAttachedSendAgain: "Sertifikāts pievienots. Lūdzu, vēlreiz nospiediet Sūtīt uz BIS.",
    failedAttachCertificate: "Neizdevās pievienot sertifikātu.",
    materialNameRequired: "Materiāla nosaukums ir obligāts.",
    materialNameMax: (max) => `Materiāla nosaukumam jābūt līdz ${max} rakstzīmēm.`,
    quantityRange: (max) => `Daudzumam jābūt skaitlim no 0 līdz ${max}.`,
    costRange: (max) => `Izmaksām jābūt skaitlim no 0 līdz ${max}.`,
    unitsMax: (max) => `Mērvienībai jābūt līdz ${max} rakstzīmēm.`,
    materialConfirmedAndSent: "Materiāls apstiprināts un nosūtīts uz BIS",
    materialUpdated: "Materiāls atjaunināts",
    failedSaveMaterial: "Neizdevās saglabāt materiālu",
    recordsDeleted: (count) => (count === 1 ? "Ieraksts dzēsts" : `Dzēsti ${count} ieraksti`),
    someBisRecordsOnlyDeletedLocally: "Daži dzēstie ieraksti jau bija nosūtīti uz BIS. Tie noņemti tikai no WorksRecorded un paliek BIS.",
    failedDeleteRecords: "Neizdevās dzēst ierakstus",
    changesSaved: "Izmaiņas saglabātas",
    failedSaveChanges: "Neizdevās saglabāt izmaiņas",
    costCodeCannotBeEmpty: "Izmaksu kods nedrīkst būt tukšs",
    costCodeAlreadyExists: "Izmaksu kods jau pastāv",
    atLeastOneCostCodeRequired: "Nepieciešams vismaz viens izmaksu kods",
    costCodesUpdated: "Izmaksu kodi atjaunināti",
    failedUpdateCostCodes: "Neizdevās atjaunināt izmaksu kodus",
    costCodeUpdated: "Izmaksu kods atjaunināts",
    costCodeCleared: "Izmaksu kods notīrīts",
    failedUpdateCostCode: "Neizdevās atjaunināt izmaksu kodu",
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

export function getToastMessages(language?: string | null) {
  return TOAST_MESSAGES[normalizeOrganizationLanguage(language)];
}
