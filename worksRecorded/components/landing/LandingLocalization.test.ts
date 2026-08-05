import englishMessages from "@/messages/en.json";
import russianMessages from "@/messages/ru.json";

function getLeafPaths(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => getLeafPaths(item, `${path}.${index}`));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => getLeafPaths(item, path ? `${path}.${key}` : key));
  }

  return [path];
}

describe("Russian Landing localization", () => {
  it("contains every message used by the English Landing pages", () => {
    expect(getLeafPaths(russianMessages).sort()).toEqual(getLeafPaths(englishMessages).sort());
  });

  it("provides Russian copy for the primary Landing content", () => {
    expect(russianMessages.LandingPageDesktop.heroTitle).toMatch(/[А-Яа-яЁё]/);
    expect(russianMessages.Navigation.features).toBe("Возможности");
    expect(russianMessages.Footer.contact).toBe("Контакты");
  });
});
