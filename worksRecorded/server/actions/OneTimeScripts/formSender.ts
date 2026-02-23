import twilio from "twilio";

// Initialize the client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function sendFlowMessage() {
  const to = "whatsapp:+37124885690";
  const from = "whatsapp:+13135131153";


  const actionSelect = "HXfecf3e222a8f4af4d1bbc7e20e45eb76"

  const exampleChecklist = "HXaa9f8ced7112d19b3d3dbdaf586b79ce"

  const withLink = "HXf54105be0d5fe58c11441d0c7be41fc2"

  const contentSid = withLink



  const timesheet = [
  { "id": "depart_base", "title": "Depart base" },
  { "id": "arrive_site", "title": "Arrive site" },
  { "id": "finish_site", "title": "Finish site" },
  { "id": "arrive_base", "title": "Arrive base" },
  { "id": "stop_lunch", "title": "Stop lunch" },
  // { "id": "resume_work", "title": "Resume work" }
]




  const action = [
  { "id": "first", "title": "Timesheets" },
  { "id": "second", "title": "MEWP Checklist F72" },
  { "id": "third", "title": "Vehicle Report F25" },
  { "id": "fourth", "title": "Site Inspection report" },

]

  const outreach = [
  { "id": "first", "title": "Timesheets" },
  { "id": "second", "title": "MEWP inspection" },
  { "id": "third", "title": "Equipment inspection" },
  { "id": "fourth", "title": "Site Safety round" },
  { "id": "fifth", "title": "Quality checklist" },

]

  // 1. Define your dynamic options
  const binary = [
    { id: "yes", title: "Pass" },
    { id: "no", title: "Fail" }
  ];


    const wihtLink = [
    { id: "yes", title: "Pass" },
    { id: "no", title: "Fail" }
  ];

  try {
    const message = await client.messages.create({
      to,
      from,
      contentSid,
      // 2. Map the 'options' to the variable '1' seen in your screenshot
      contentVariables: JSON.stringify({
        "1": "https://www.worksrecorded.com/en/Landing",
        "2": JSON.stringify(binary),
      }),
    });

    console.log(`✅ Flow sent successfully! SID: ${message.sid}`);
  } catch (error: any) {
    console.error("❌ Error sending Flow:", error.message);
  }
}

sendFlowMessage();