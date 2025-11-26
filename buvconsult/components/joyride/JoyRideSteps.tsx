// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\joyride\JoyRideSteps.tsx

/*
 * If your steps are not dynamic you can use a simple array.
 * Otherwise you can set it as a state inside your component.
 */


// Step 1
export const steps_dashboard = [
  {
    target: '[data-tour="create-project"]',
    content: 'Welcome to Buvconsult site record! Start by crearting a new project',
    disableBeacon: true
  },
  
]



// Step 2
export const steps_dashboard_sites_new = [
  {
    target: '[data-tour="sites/new/card"]',
    content: 'Type in your project information',
    disableBeacon: true
  },
  
]

//Step 3
export const steps_dashboard_sites_open_project = [
  {
    target: '[data-tour="dashboard/page"]',
    content: 'Open your project',
    disableBeacon: true
  },
  
]


//Step 4
export const steps_dashboard_siteid_dashboard = [
  {
    target: '[data-tour="key-metrics"]',
    content: `This is your dashboard for the project progress and finances. Make it live by starting using site diary and uploading invoices`,
    disableBeacon: true
  },
    {
    target: '[data-tour="nav-site-diary"]',
    content: `Navigate to the site diary`,
    disableBeacon: true
  },
   
   
  
]





//Step 5. This will point to the the AI widget button.

export const steps_dashboard_siteid_site_diary = [
  {
    target: '[data-tour="calendar"]',
    content: `This is your calendar with site diaries. You can fill it form web, from Whatsapp or using AI.
    Let's try AI first!`,
    disableBeacon: true
  },
    {
    target: '[data-tour="AI-widget"]',
    content: `Open AI assistant and report what has been completed today.`,
    disableBeacon: true
  },
 
  ]


//Step 6. This should point to the the textarea inside the opened AI widget.

export const steps_ai_widget_open = [
  {
    target: '[data-tour="AI-widget-open"]',
    content: "Start typing to tell the AI what was completed today.\n" + 
    "You can say something like : Today we 5 workers casted 10m3, and 3 workers we doing steel fixing for 5 hours additional work, delivery of timber was delayed",
    disableBeacon: true,
  },
];

//Step 7. This will run when AI has repplied
export const steps_ai_diary_updated = [
  {
    target: '[data-tour="AI-responed-received"]', // already on your textarea
    content: "Nice! I’ve updated your site diary. Let’s go and see it in the calendar.",
    disableBeacon: true,
  },
];


//Step 8. This will run when there is a first completed day

export const steps_dashboard_siteid_site_diary_completed = [
  {
    target: '[data-tour="first-completed-diary-record"]',
    content:
      "This green day has a completed site diary entry. Coick to open the day to edit or add more info",
    disableBeacon: true,
  },
];


//Step 9. This will run when site diary day is open

export const steps_site_diary_dialog = [
  {
    target: '[data-tour="dialog-table"]',
    content:
      "Here you see the structured site diary records for this day. You can edit or add new entries. You can also upload records from Whatsapp, text to +1 (313) 513-1153",
    disableBeacon: true,
  },
  {
    target: '[data-tour="dialog-gallery"]',
    content:
      "Here you see all photos linked to this day. You can review visual evidence for your records.",
    disableBeacon: true,
  },
];


export const steps_dashboard_siteid_site_diary_filled = [
  {
    target: '[data-tour="site-diary-filled-day"]',
    content:
      "Days that have site diary entries are highlighted like this. This is the day you just filled with AI.",
    disableBeacon: true,
  },
];





export const steps_dashboard_siteid_timesheets = [
  {
    target: '[data-tour="add-worker"]',
    content: `To start using Timesheets - add worker and his whatsapp phone number`,
    disableBeacon: true
  },
    {
    target: '[data-tour="timesheets"]',
    content: `After worker is added - he can start using whatsapp to clock in/out of works, so try saying "Hi, let me start my day" to +1 313 513 1153 in whatsapp now!`,
    disableBeacon: true
  },


  
  
]


export const steps_dashboard_siteid_settings = [
  {
    target: '[data-tour="upload-invoices"]',
    content: `You can also upload invoices here`,
    disableBeacon: true
  },
    {
    target: '[data-tour="upload-documents"]',
    content: `You can also upload documents here`,
    disableBeacon: true
  },
      {
    target: '[data-tour="programm"]',
    content: `For custom site-diary fields please upload your programm in format`,
    disableBeacon: true
  },
       {
    target: '[data-tour="template"]',
    content: `You can donwload template for the programm here`,
    disableBeacon: true
  },
      {
    target: '[data-tour="members"]',
    content: `Here you can add users, set up phone number and roles. Add your whatsapp phone number and set Role to "Site manager" `,
    disableBeacon: true
  },
      {
    target: '[data-tour="members"]',
    content: `If you need more help - contact us at hello@buvconsult.com and we will answer the same day!`,
    disableBeacon: true
  },


  
  
]



export const steps_dashboard_siteid_invoices= [

    {
    target: '[data-tour="invoice-table"]',
    content: ' Send an PDF invoice to the invoices@buvconsult.com, and mention project name in the ' +
    `subject or body of the email. In a couple of minutes you will see invoice here`,
    disableBeacon: true
  },
  
  
  
]



export const steps_dashboard_siteid_documents = [
  {
    target: '[data-tour="Documents"]',
    content: `To upload documents - go to settings - Upload Documents `,
    disableBeacon: true
  },

  
  
]



export const steps_dashboard_siteid_project_diary = [
  {
    target: '[data-tour="project-diary"]',
    content: `Project diary is to be filled via Whatsapp - go to settings and set up phone number.`,
    disableBeacon: true
  },

  
  
]
