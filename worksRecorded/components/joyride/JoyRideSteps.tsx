// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\joyride\JoyRideSteps.tsx

/*
 * If your steps are not dynamic you can use a simple array.
 * Otherwise you can set it as a state inside your component.
 */


// Step 1
export const steps_dashboard = [
  {
    target: '[data-tour="create-project"]',
    content: 'Welcome to WorksRecorded site records! Start by crearting a new project',
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
    target: '[data-tour="calendar"]',
    content: `Start reporting works from whatsapp `,
    disableBeacon: true
  },
    {
    target: '[data-tour="AI-widget"]',
    content: `You can also report from assistant or directly on the diary`,
    disableBeacon: true
  },
   
   
  
]





//Step 5. This will point to the the AI widget button.

export const steps_dashboard_siteid_site_diary = [
  {
    target: '[data-tour="calendar"]',
    content: `Start reporting works from whatsapp `,
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

