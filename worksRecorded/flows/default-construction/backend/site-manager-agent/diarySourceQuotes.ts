type Token = { value: string; start: number; end: number };

function tokenize(text: string): Token[] {
	return Array.from(
		text.matchAll(/[\p{L}\p{M}\p{N}]+(?:[.,](?=\d)\d+)*|[^\s.,;:!?…“”„"'«»]/gu),
		(match) => ({
			value: match[0]
				.normalize("NFC")
				.toLocaleLowerCase("lv")
				.replace(/(?<=\d),(?=\d)/g, "."),
			start: match.index,
			end: match.index + match[0].length,
		}),
	);
}

function findQuote(
	source: string,
	quote: string,
	from: number,
	minLength: number,
) {
	if (quote.trim().length < minLength) return null;
	const wanted = tokenize(quote);
	const available = tokenize(source);
	if (wanted.length < 2) return null;
	for (let index = 0; index <= available.length - wanted.length; index++) {
		if (available[index].start < from) continue;
		if (
			!wanted.every(
				(token, offset) => token.value === available[index + offset].value,
			)
		)
			continue;
		const start = available[index].start;
		const prefix =
			source
				.slice(0, start)
				.split(/[.,;!?\n]/u)
				.at(-1) ?? "";
		if (/\b(?:nav|ne|netika|nebija|not|never)\b/iu.test(prefix)) continue;
		let end = available[index + wanted.length - 1].end;
		if (/[.!?]/u.test(source[end] ?? "")) end++;
		return { start, end, text: source.slice(start, end) };
	}
	return null;
}

export function groundDiarySourceQuotes(
	source: string,
	quotes: string[],
	minLength = 10,
) {
	if (!quotes.length || quotes.length > 5) return null;
	const grounded: string[] = [];
	let from = 0;
	for (const quote of quotes) {
		const match = findQuote(source, quote, from, minLength);
		if (!match) return null;
		grounded.push(match.text);
		from = match.end;
	}
	return grounded.join("\n");
}
