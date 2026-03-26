import { fetchNewsSourceItems } from "@/lib/news/rss";

describe("fetchNewsSourceItems", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("merges and deduplicates feed items by link", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[AI &amp; Construction]]></title>
          <link>https://example.com/a</link>
          <source><![CDATA[Test Source]]></source>
          <pubDate>Wed, 20 Mar 2026 12:00:00 GMT</pubDate>
          <description><![CDATA[Snippet A]]></description>
        </item>
        <item>
          <title>AI in scheduling</title>
          <link>https://example.com/b</link>
          <source>Test Source 2</source>
          <pubDate>Thu, 21 Mar 2026 12:00:00 GMT</pubDate>
          <description><![CDATA[Snippet B]]></description>
        </item>
      </channel></rss>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => xml,
    } as Response);

    const items = await fetchNewsSourceItems(10);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(items.length).toBe(2);
    expect(items[0].link).toBe("https://example.com/b");
    expect(items[1].title).toBe("AI & Construction");
  });

  it("throws when any feed request fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => "<rss></rss>" } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => "<rss></rss>" } as Response);

    await expect(fetchNewsSourceItems()).rejects.toThrow(/Unable to fetch RSS feed: 500/);
  });
});
