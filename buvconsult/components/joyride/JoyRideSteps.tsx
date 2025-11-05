

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
    target: '[data-tour="invoice-table"]',
    content: 'Lets start by uploading your first invoice. Send an PDF invoice to the invoices@buvconsult.com, and mention project name in the' +
    `Subject or body of the email. In a cuple of minutes you will see invoice here`,
    disableBeacon: true
  },
  
]