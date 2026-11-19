import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import {
	type BrowserDiaryExtraction,
	type BrowserWhatsappIngest,
	browserDiaryExtractionSchema,
} from "./schema";

export type BrowserDiaryParser = (args: {
	payload: BrowserWhatsappIngest;
	projectNames: string[];
}) => Promise<BrowserDiaryExtraction>;

export function createBrowserDiaryParser(
	client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
): BrowserDiaryParser {
	return async ({ payload, projectNames }) => {
		const content: ResponseInputContent[] = [
			{
				type: "input_text",
				text: JSON.stringify({
					existingProjects: projectNames,
					groupName: payload.groupName,
					sourceMessages: payload.sourceMessages.map((message) => ({
						sourceId: message.sourceId,
						senderName: message.senderName,
						senderPhone: message.senderPhone ?? null,
						sentAt: message.sentAt,
						text: message.text,
						attachmentIndexes: message.attachmentIndexes,
					})),
					attachments: payload.attachments.map((attachment, index) => ({
						index,
						mimeType: attachment.mimeType,
						fileName: attachment.fileName ?? null,
					})),
				}),
			},
		];

		for (const attachment of payload.attachments) {
			if (attachment.mimeType.startsWith("image/")) {
				content.push({
					type: "input_image",
					image_url: attachment.url,
					detail: "original",
				});
			}
		}

		const response = await client.responses.parse({
			model: process.env.WHATSAPP_BROWSER_SYNC_MODEL?.trim() || "gpt-5.6-terra",
			store: false,
			max_output_tokens: 8_000,
			instructions: [
				"Extract construction diary work entries from exported WhatsApp group messages.",
				"Return one entry per project and work type. A single message can contain multiple projects.",
				"Use an existing project name when it is clearly the same address; otherwise preserve the project name from the message.",
				"Preses nams is the same project as Balasta dambis 2.",
				"Estrich plēve means two entries: estrich and film.",
				"Līmes means Thermowhite work and its default thickness is 120 mm unless another thickness is explicit.",
				"Do not invent quantities, bag counts, locations, dates, worker counts, hours, or thicknesses.",
				"bagCount is material actually consumed for that work, never delivered, collected, purchased, remaining stock or bags returned. Leave it null if only those other quantities are reported.",
				"The same cement consumption belongs to Estrich only; never copy it into a film entry. Film bagCount is null.",
				"When a report has a total plus a breakdown of bags from base and shop, use the total once. Separate balcony work reports keep their own counts; do not repeat the whole project's count for each balcony or estimate section.",
				"The stated square-meter area is plannedAreaM2.",
				"For a range such as 70-80 mm, store both endpoints.",
				"Material delivery maps to material_delivery.",
				"Images and drawings belong only to entries they visibly or contextually describe.",
				"Use attachmentIndexes to associate zero-based attachment indexes with entries.",
				"If a relevant ambiguity prevents safe creation, describe it in ambiguity.",
				"Understand Latvian construction terminology and common spelling mistakes.",
			].join(" "),
			input: [{ role: "user", content }],
			text: {
				format: zodTextFormat(
					browserDiaryExtractionSchema,
					"whatsapp_browser_diary_extraction",
				),
			},
		});

		if (!response.output_parsed) {
			throw new Error(
				"WhatsApp browser extraction returned no structured data",
			);
		}
		return response.output_parsed;
	};
}
