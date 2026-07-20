import {
  buildPhotoCommentBackfillCandidateSql,
  getPhotoCommentBackfillSourceMessageId,
  isEligiblePhotoComment,
  shouldIncludePhotoCommentCandidate,
  type PhotoCommentBackfillArgs,
} from "./photo-comment-backfill";

const filter: PhotoCommentBackfillArgs = {
  siteId: "site-1",
  userId: "user-1",
  startDate: "2026-05-01",
  endDate: "2026-07-30",
  minCommentLength: 25,
};

function photo(overrides: Partial<Parameters<typeof shouldIncludePhotoCommentCandidate>[0]["photo"]> = {}) {
  return {
    id: "photo-1",
    Date: new Date("2026-07-17T09:00:00.000Z"),
    Comment: "Jānis Bērziņš : Pabeidzām starpsienu montāžu",
    siteId: "site-1",
    userId: "user-1",
    ...overrides,
  };
}

describe("photo comment backfill candidate helpers", () => {
  it("skips empty and short comments", () => {
    expect(isEligiblePhotoComment("   ", 25)).toBe(false);
    expect(isEligiblePhotoComment("Jānis Bērziņš", 25)).toBe(false);
    expect(isEligiblePhotoComment("123456789012345678901234", 25)).toBe(false);
    expect(isEligiblePhotoComment("1234567890123456789012345", 25)).toBe(true);
  });

  it("includes matching photo comments in the configured date range", () => {
    expect(shouldIncludePhotoCommentCandidate({ photo: photo(), filter })).toBe(true);
  });

  it("respects site, user, and date filters", () => {
    expect(shouldIncludePhotoCommentCandidate({
      photo: photo({ siteId: "site-2" }),
      filter,
    })).toBe(false);
    expect(shouldIncludePhotoCommentCandidate({
      photo: photo({ userId: "user-2" }),
      filter,
    })).toBe(false);
    expect(shouldIncludePhotoCommentCandidate({
      photo: photo({ Date: new Date("2026-04-30T23:59:59.000Z") }),
      filter,
    })).toBe(false);
    expect(shouldIncludePhotoCommentCandidate({
      photo: photo({ Date: new Date("2026-07-31T00:00:00.000Z") }),
      filter,
    })).toBe(false);
  });

  it("skips photos that already have a synthetic backfill batch", () => {
    expect(shouldIncludePhotoCommentCandidate({
      photo: photo(),
      filter,
      existingSourceMessageIds: new Set([
        getPhotoCommentBackfillSourceMessageId("photo-1"),
      ]),
    })).toBe(false);
  });

  it("builds candidate SQL with the minimum comment length filter", () => {
    const sql = buildPhotoCommentBackfillCandidateSql(filter);

    expect(sql).toContain('p."siteId" = \'site-1\'');
    expect(sql).toContain('p."userId" = \'user-1\'');
    expect(sql).toContain("p.\"Date\" >= '2026-05-01 00:00:00'");
    expect(sql).toContain("p.\"Date\" < ('2026-07-30'::date + interval '1 day')");
    expect(sql).toContain('char_length(trim(p."Comment")) >= 25');
    expect(sql).toContain("concat('photo-comment-backfill:', p.\"id\")");
  });
});
