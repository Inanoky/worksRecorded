"use client";

import { useLocale } from "next-intl";

import Link from "@/components/landing/navigation/LandingLink";

export default function DataDeletionPage() {
	const locale = useLocale();
	return (
		<main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
			<h1 className="text-3xl font-bold mb-6">Data Deletion – WorksRecorded</h1>
			<p className="mb-6">
				WorksRecorded is operated by Buvconsult SIA, Latvia. You can request
				deletion of your account information and personal data processed through
				our WhatsApp integration.
			</p>
			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-2">Send a deletion request</h2>
				<p className="text-sm leading-6">
					Email{" "}
					<a href="mailto:vjaceslavs@worksrecorded.com" className="underline">
						vjaceslavs@worksrecorded.com
					</a>{" "}
					with the subject “WorksRecorded data deletion request”. Include your
					account email, organization name and enough information to identify
					the records concerned. For WhatsApp data, include the associated phone
					number only when needed to locate it. Do not send passwords, one-time
					codes, access tokens or identity documents in your initial request.
				</p>
			</section>
			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-2">What happens next</h2>
				<p className="text-sm leading-6">
					We may ask you to verify your identity or clarify the request. If work
					records are managed on behalf of your employer or another customer
					organization, we may need to coordinate with that organization. Any
					information that must be retained and the reason for retaining it will
					be explained when handling your request.
				</p>
			</section>
			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-2">
					WhatsApp access and stored records
				</h2>
				<p className="text-sm leading-6">
					Disconnecting WhatsApp access and deleting previously processed
					messages, media and derived work records are separate actions. Contact
					the same mailbox for assistance with either request.
				</p>
			</section>
			<p className="text-sm leading-6">
				Read the{" "}
				<Link href={`/${locale}/Landing/Privacy`} className="underline">
					WorksRecorded privacy policy
				</Link>{" "}
				for more information about the data we process.
			</p>
		</main>
	);
}
