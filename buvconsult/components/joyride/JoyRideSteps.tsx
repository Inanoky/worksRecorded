// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\joyride\JoyRideSteps.tsx

/*
 * If your steps are not dynamic you can use a simple array.
 * Otherwise you can set it as a state inside your component.
 */

export const steps_dashboard = [
  {
    target: '[data-tour="create-project"]',
    content: 'Create a project',
    disableBeacon: true
  },
  
]




export const steps_dashboard_sites_new = [
  {
    target: '[data-tour="sites/new/card"]',
    content: 'Type in your project information',
    disableBeacon: true
  },
  
]


export const steps_dashboard_siteid_dashboard = [
  {
    target: '[data-tour="key-metrics"]',
    content: `This is your dashboard for the project progress and finances. Lets make it live by uploading first invocie!`,
    disableBeacon: true
  },
    {
    target: '[data-tour="invoice-table"]',
    content: ' Send an PDF invoice to the invoices@buvconsult.com, and mention project name in the ' +
    `subject or body of the email. In a cuple of minutes you will see invoice here`,
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


export const steps_dashboard_siteid_site_diary = [
  {
    target: '[data-tour="calendar"]',
    content: `You can fill site diary from the web or from Whatsapp. To start using Whatsapp - go to settings and set up phone number.`,
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