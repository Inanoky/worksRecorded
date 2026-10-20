import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@kinde-oss/kinde-auth-nextjs/components", () => ({
	LoginLink: ({ children }: { children: ReactNode }) => (
		<a href="/login">{children}</a>
	),
	RegisterLink: ({ children }: { children: ReactNode }) => (
		<a href="/register">{children}</a>
	),
}));
jest.mock("next/font/google", () => {
	const font = () => ({ variable: "font-test" });
	return {
		Inter: font,
		Inter_Tight: font,
		Instrument_Serif: font,
		Archivo: font,
		Barlow_Condensed: font,
	};
});
jest.mock("next-intl", () => ({
	useLocale: () => "lv",
	useTranslations: () => Object.assign((key: string) => key, { raw: () => [] }),
}));
jest.mock("@/components/ui/LanguageSwitcher", () => ({
	__esModule: true,
	default: () => null,
}));

import ModernLandingPage from "./Landing/ModernLandingPage";
import { Logos } from "./Logos";

it("includes all requested clients once in the seamless landing marquee", () => {
	render(<Logos />);
	for (const name of ["Līmenī", "FIMA", "TGEM"]) {
		expect(screen.getAllByAltText(name)).toHaveLength(2);
		expect(screen.getAllByRole("link", { name })).toHaveLength(1);
	}
	expect(screen.getByRole("link", { name: "FIMA" })).toHaveAttribute(
		"href",
		"https://www.fima.lv/",
	);
	expect(screen.getByRole("link", { name: "Līmenī" })).toHaveAttribute(
		"href",
		"https://www.limeni.lv/",
	);
	expect(screen.getByRole("link", { name: "TGEM" })).toHaveAttribute(
		"href",
		"https://tgem.tj/en",
	);
});

it("shows all requested logos in the modern social-proof section", () => {
	render(<ModernLandingPage />);
	for (const name of ["Deprom", "LEC", "ZTC", "Līmenī", "FIMA", "TGEM"]) {
		expect(screen.getAllByAltText(name)).toHaveLength(1);
	}
	const limeni = screen.getByAltText("Līmenī");
	expect(limeni).toHaveAttribute("src", "/logos/limeni.svg");
	expect(limeni).toHaveAttribute("width", "1012");
	expect(limeni).toHaveAttribute("height", "330");
});

it("includes all requested logos and responsive columns in V3", () => {
	const source = readFileSync(
		join(__dirname, "LandingV3/LandingV3Page.tsx"),
		"utf8",
	);
	const css = readFileSync(
		join(__dirname, "LandingV3/LandingV3.module.css"),
		"utf8",
	);
	expect(source).toContain('name: "FIMA"');
	expect(source).toContain('name: "Līmenī"');
	expect(source).toContain('logo: "/logos/limeni.svg"');
	expect(source).toContain("logo: FimaLogo");
	expect(source).toContain('name: "TGEM"');
	expect(source).toContain("logo: TgemLogo");
	expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
	expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
});
