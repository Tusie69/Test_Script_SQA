import { describe, expect, it, vi } from "vitest";
import { formatVi } from "../../utils/datetime";
import {
  normalizeQuestion,
  parseContentText,
} from "../../utils/forum-normalize";

describe("15 - Datetime & Forum Normalize Utils", () => {
  // Chức năng: Format thời gian hợp lệ ra chuỗi vi-VN
  it("formatVi formats valid timestamp into vi-VN string", () => {
    const value = formatVi("2026-01-01T00:00:00Z");
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  // Chức năng: Input thời gian rỗng dùng Date.now()
  it("formatVi uses Date.now when timestamp input is empty", () => {
    vi.spyOn(Date, "now").mockReturnValue(1767225600000); // 2026-01-01T00:00:00.000Z
    const value = formatVi();
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
    Date.now.mockRestore();
  });

  // Chức năng: Normalize question đủ trường/thiếu trường
  it("normalizeQuestion handles full and missing fields safely", () => {
    const full = normalizeQuestion({
      id: "q1",
      title: "Question",
      tags: "react, js",
      studentName: "A",
      discussionCount: 2,
      viewCount: 5,
      likeCount: 3,
      createdAt: "2026-01-01T00:00:00Z",
      contentJson: "{\"blocks\":[]}",
    });
    const missing = normalizeQuestion({
      id: "q2",
    });

    expect(full.id).toBe("q1");
    expect(full.tags).toEqual(["react", "js"]);
    expect(full.authorName).toBe("A");
    expect(full.viewCount).toBe(5);
    expect(missing.title).toBe("—");
    expect(missing.authorName).toBe("—");
    expect(missing.tags).toEqual([]);
    expect(missing.discussionCount).toBe(0);
  });

  // Chức năng: Parse tags dạng chuỗi, mảng, null
  it("normalizeQuestion parses tags from string, array, and null", () => {
    const fromString = normalizeQuestion({ id: "q1", tags: "react, js" });
    const fromArray = normalizeQuestion({ id: "q2", tags: ["react", "js"] });
    const fromNull = normalizeQuestion({ id: "q3", tags: null });

    expect(fromString.tags).toEqual(["react", "js"]);
    expect(fromArray.tags).toEqual(["react", "js"]);
    expect(fromNull.tags).toEqual([]);
  });

  // Chức năng: Parse content JSON hợp lệ thành text
  it("parseContentText extracts text from valid JSON blocks", () => {
    const text = parseContentText(
      JSON.stringify({
        blocks: [{ text: "Line 1" }, { text: "Line 2" }],
      })
    );
    expect(text).toContain("Line 1");
    expect(text).toContain("Line 2");
  });

  // Chức năng: Parse content lỗi JSON trả fallback
  it("parseContentText returns fallback when JSON is invalid", () => {
    expect(parseContentText("{invalid", "fallback")).toBe("fallback");
  });
});
