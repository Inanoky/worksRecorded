import { renderToStaticMarkup } from "react-dom/server";
import { InvitationEmail } from "@/components/email/InvitationEmail";

describe("InvitationEmail", () => {
	it("renders an email-safe branded invitation with a fallback link", () => {
		const invitationUrl =
			"https://worksrecorded.com/api/auth/register?org_code=test&login_hint=user%40example.com";
		const html = renderToStaticMarkup(InvitationEmail({ invitationUrl }));

		expect(html).toContain("You’re invited to WorksRecorded");
		expect(html).toContain("WorksRecorded");
		expect(html).toContain(
			"https://www.worksrecorded.com/favicon/favicon-512x512.png",
		);
		expect(html).toContain(`href="${invitationUrl.replace("&", "&amp;")}"`);
		expect(html).toContain("Create your account");
		expect(html).toContain('role="presentation"');
	});
});
