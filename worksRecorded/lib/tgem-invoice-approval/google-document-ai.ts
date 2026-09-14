import { google } from "googleapis";
import type {
	TgemInvoiceOcrField,
	TgemInvoiceOcrResult,
	TgemOcrBlock,
	TgemOcrPoint,
	TgemOcrSourceAnchor,
} from "@/lib/tgem-invoice-approval/ocr-types";

export type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: null;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getTextAnchorText(anchor: unknown, documentText: string) {
	const record = asRecord(anchor);
	if (!record) return "";

	const directText = typeof record.content === "string" ? record.content : "";
	if (directText) return directText;

	return asArray(record.textSegments)
		.map((segment) => {
			const item = asRecord(segment);
			if (!item) return "";
			const start = Number(item.startIndex ?? 0);
			const end = Number(item.endIndex ?? start);
			return Number.isFinite(start) && Number.isFinite(end)
				? documentText.slice(start, end)
				: "";
		})
		.join("");
}

function getPolygon(
	boundingPoly: unknown,
	width: number | null,
	height: number | null,
): TgemOcrPoint[] {
	const polygon = asRecord(boundingPoly);
	if (!polygon) return [];

	const normalizedVertices = asArray(polygon.normalizedVertices)
		.map((point) => {
			const record = asRecord(point);
			return record
				? {
						x: Math.max(0, Math.min(1, Number(record.x ?? 0))),
						y: Math.max(0, Math.min(1, Number(record.y ?? 0))),
					}
				: null;
		})
		.filter((point): point is TgemOcrPoint => point !== null);

	if (normalizedVertices.length > 0) return normalizedVertices;

	const vertices = asArray(polygon.vertices)
		.map((point) => {
			const record = asRecord(point);
			const x = Number(record?.x ?? 0);
			const y = Number(record?.y ?? 0);
			return record && width && height
				? {
						x: Math.max(0, Math.min(1, x / width)),
						y: Math.max(0, Math.min(1, y / height)),
					}
				: null;
		})
		.filter((point): point is TgemOcrPoint => point !== null);

	return vertices;
}

function toBlock(
	item: unknown,
	documentText: string,
	width: number | null,
	height: number | null,
	kind: TgemOcrBlock["kind"],
	readingOrder: number,
): TgemOcrBlock | null {
	const itemRecord = asRecord(item);
	const layout = asRecord(itemRecord?.layout);
	if (!layout) return null;

	const text = getTextAnchorText(layout.textAnchor, documentText).trim();
	const polygon = getPolygon(layout.boundingPoly, width, height);
	if (!text || polygon.length === 0) return null;

	const xs = polygon.map((point) => point.x);
	const ys = polygon.map((point) => point.y);
	const left = Math.min(...xs);
	const top = Math.min(...ys);
	const right = Math.max(...xs);
	const bottom = Math.max(...ys);

	return {
		text,
		confidence: asNumber(layout.confidence),
		kind,
		readingOrder,
		left,
		top,
		width: right - left,
		height: bottom - top,
		polygon,
	};
}

function getSourceAnchor(
	entity: JsonRecord,
	pageDimensions: Map<number, { width: number | null; height: number | null }>,
): TgemOcrSourceAnchor | null {
	const pageAnchor = asRecord(entity.pageAnchor);
	const pageRef = asRecord(asArray(pageAnchor?.pageRefs)[0]);
	if (!pageRef) return null;

	const zeroBasedPage = Number(pageRef.page ?? 0);
	const pageNumber = Number.isFinite(zeroBasedPage) ? zeroBasedPage + 1 : 1;
	const dimensions = pageDimensions.get(pageNumber);
	const polygon = getPolygon(
		pageRef.boundingPoly,
		dimensions?.width ?? null,
		dimensions?.height ?? null,
	);
	if (polygon.length === 0) return null;

	const xs = polygon.map((point) => point.x);
	const ys = polygon.map((point) => point.y);
	const left = Math.min(...xs);
	const top = Math.min(...ys);
	const right = Math.max(...xs);
	const bottom = Math.max(...ys);

	return {
		pageNumber,
		left,
		top,
		width: right - left,
		height: bottom - top,
		polygon,
	};
}

function getEntityValue(entity: JsonRecord, rawText: string) {
	const normalizedValue = asRecord(entity.normalizedValue);
	const moneyValue = asRecord(normalizedValue?.moneyValue);
	if (moneyValue) {
		const units = Number(moneyValue.units ?? 0);
		const nanos = Number(moneyValue.nanos ?? 0);
		if (Number.isFinite(units) && Number.isFinite(nanos)) {
			return units + nanos / 1_000_000_000;
		}
	}

	const normalizedText = normalizedValue?.text;
	return typeof normalizedText === "string" && normalizedText
		? normalizedText
		: rawText || null;
}

function getEntityRawText(entity: JsonRecord, documentText: string) {
	const anchoredText = getTextAnchorText(
		entity.textAnchor,
		documentText,
	).trim();
	if (anchoredText) return anchoredText;
	return typeof entity.mentionText === "string"
		? entity.mentionText.trim()
		: "";
}

function toStringValue(value: string | number | null) {
	if (value === null) return null;
	const text = String(value).trim();
	return text || null;
}

function toNumberValue(value: string | number | null) {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;

	const compact = value.replace(/\s/g, "");
	const normalized =
		compact.includes(",") && !compact.includes(".")
			? compact.replace(",", ".")
			: compact.replace(/,/g, "");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function mapFields(
	document: JsonRecord,
	documentText: string,
	pageDimensions: Map<number, { width: number | null; height: number | null }>,
) {
	const fieldNames: Record<string, string> = {
		invoice_id: "invoiceNumber",
		supplier_name: "supplierName",
		supplier_tax_id: "supplierRegistrationNo",
		supplier_registration: "supplierRegistrationNo",
		invoice_date: "invoiceDate",
		due_date: "dueDate",
		net_amount: "subtotal",
		vat: "vat",
		total_tax_amount: "vat",
		invoice_total: "total",
		total_amount: "total",
		currency: "currency",
		payment_terms: "paymentTerms",
		purchase_order: "purchaseOrder",
		supplier_iban: "bankAccount",
	};

	return Object.fromEntries(
		asArray(document.entities)
			.map((entity) => {
				const record = asRecord(entity);
				if (!record || typeof record.type !== "string") return null;
				const name = fieldNames[record.type];
				if (!name) return null;
				const rawText = getEntityRawText(record, documentText);
				return [
					name,
					{
						rawText,
						value: getEntityValue(record, rawText),
						confidence: asNumber(record.confidence),
						sourceAnchor: getSourceAnchor(record, pageDimensions),
					},
				];
			})
			.filter(
				(entry): entry is [string, TgemInvoiceOcrField] => entry !== null,
			),
	);
}

function mapLineItems(document: JsonRecord, documentText: string) {
	return asArray(document.entities)
		.map((entity) => asRecord(entity))
		.filter((entity): entity is JsonRecord => entity?.type === "line_item")
		.map((entity) => {
			const properties = new Map<string, JsonRecord>();
			for (const property of asArray(entity.properties)) {
				const record = asRecord(property);
				if (record && typeof record.type === "string") {
					properties.set(record.type, record);
				}
			}

			const propertyValue = (name: string) => {
				const property = properties.get(`line_item/${name}`);
				if (!property) return null;
				const rawText = getEntityRawText(property, documentText);
				return getEntityValue(property, rawText);
			};
			const confidences = [...properties.values()]
				.map((property) => asNumber(property.confidence))
				.filter((confidence): confidence is number => confidence !== null);

			return {
				productCode: toStringValue(propertyValue("product_code")),
				description: toStringValue(propertyValue("description")),
				quantity: toNumberValue(propertyValue("quantity")),
				unit: toStringValue(propertyValue("unit")),
				unitPrice: toNumberValue(propertyValue("unit_price")),
				total: toNumberValue(propertyValue("amount")),
				currency: toStringValue(propertyValue("currency")),
				confidence:
					confidences.length > 0
						? Math.min(...confidences)
						: asNumber(entity.confidence),
				sourceText: getEntityRawText(entity, documentText),
			};
		});
}

export function mapGoogleDocumentAiInvoiceResponse(
	response: unknown,
): TgemInvoiceOcrResult {
	const responseRecord = asRecord(response);
	const document = asRecord(responseRecord?.document) ?? responseRecord ?? {};
	const documentText = typeof document.text === "string" ? document.text : "";
	const pageDimensions = new Map(
		asArray(document.pages).map((page, pageIndex) => {
			const pageRecord = asRecord(page) ?? {};
			return [
				Number(pageRecord.pageNumber ?? pageIndex + 1),
				{
					width: asNumber(pageRecord.width),
					height: asNumber(pageRecord.height),
				},
			] as const;
		}),
	);

	const pages = asArray(document.pages).map((page, pageIndex) => {
		const pageRecord = asRecord(page) ?? {};
		const width = asNumber(pageRecord.width);
		const height = asNumber(pageRecord.height);
		const tokens = asArray(pageRecord.tokens);
		const blockKind = tokens.length > 0 ? "token" : "line";
		const sourceItems = tokens.length > 0 ? tokens : asArray(pageRecord.lines);
		const blocks = sourceItems
			.map((item, readingOrder) =>
				toBlock(item, documentText, width, height, blockKind, readingOrder),
			)
			.filter((block): block is TgemOcrBlock => block !== null);
		const layout = asRecord(pageRecord.layout);
		const layoutText = getTextAnchorText(
			layout?.textAnchor,
			documentText,
		).trim();
		const text = layoutText || blocks.map((block) => block.text).join("\n");

		return {
			pageNumber: Number(pageRecord.pageNumber ?? pageIndex + 1),
			width,
			height,
			text,
			blocks,
			status: "complete" as const,
		};
	});

	return {
		provider: "google-document-ai",
		pages,
		fields: mapFields(document, documentText, pageDimensions),
		lineItems: mapLineItems(document, documentText),
	};
}

export type TgemDocumentAiRequest = {
	content: Buffer;
	mimeType: string;
};

export type TgemDocumentAiTransport = (
	request: TgemDocumentAiRequest,
) => Promise<unknown>;

export function getGoogleDocumentAiConfig(
	env: Record<string, string | undefined> = process.env,
) {
	const projectId =
		env.GOOGLE_DOCUMENT_AI_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT;
	const location =
		env.GOOGLE_DOCUMENT_AI_LOCATION ?? env.GOOGLE_CLOUD_LOCATION ?? "eu";
	const processorId = env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

	if (!projectId || !processorId) {
		throw new Error(
			"Google Document AI requires GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and optional GOOGLE_DOCUMENT_AI_LOCATION",
		);
	}

	return { projectId, location, processorId };
}

export function createGoogleDocumentAiTransport(
	config = getGoogleDocumentAiConfig(),
): TgemDocumentAiTransport {
	return async ({ content, mimeType }) => {
		const auth = new google.auth.GoogleAuth({
			scopes: ["https://www.googleapis.com/auth/cloud-platform"],
		});
		const authClient = await auth.getClient();
		const accessToken = await authClient.getAccessToken();
		const token =
			typeof accessToken === "string" ? accessToken : accessToken.token;

		if (!token)
			throw new Error("Google Application Default Credentials are unavailable");

		const endpoint = `https://${config.location}-documentai.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/processors/${encodeURIComponent(config.processorId)}:process`;
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				rawDocument: {
					content: content.toString("base64"),
					mimeType,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Google Document AI failed with ${response.status}: ${await response.text()}`,
			);
		}

		return response.json();
	};
}

export async function processTgemInvoiceWithGoogleDocumentAi(
	request: TgemDocumentAiRequest,
	transport = createGoogleDocumentAiTransport(),
) {
	return mapGoogleDocumentAiInvoiceResponse(await transport(request));
}
