import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  createCourseContent,
  fetchCourseContentOverview,
  updateCourseContent,
} from "../../api/courseContent.api";

describe("03 - CourseContent API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Thêm course content lần đầu thành công
  it("adds first course content successfully", async () => {
    const payload = { title: "Section 1", introduce: "Intro content" };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await createCourseContent("c1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course/c1/content",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Thêm trùng khi đã có content
  it("returns error when adding duplicate course content", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course content already exists for this course",
    });

    const result = await createCourseContent("c1", {
      title: "Section 1",
      introduce: "Duplicate",
    });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course/c1/content",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("already exists");
  });

  // Chức năng: Cập nhật content hợp lệ
  it("updates course content with valid data", async () => {
    const payload = { title: "Section 1 updated", introduce: "Updated intro" };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await updateCourseContent("c1", "ct1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/content?contentId=ct1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Cập nhật content không tồn tại
  it("returns not-found error when updating non-existing content", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course content not found",
    });

    const result = await updateCourseContent("c1", "missing-content-id", {
      title: "New title",
      introduce: "New intro",
    });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/content?contentId=missing-content-id",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not found");
  });

  // Chức năng: Lấy content overview khi khóa học có bài học
  it("gets content overview when course has lessons", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      data: {
        id: "ct1",
        title: "Overview title",
        lessons: [{ id: "l1" }, { id: "l2" }],
      },
    });

    const result = await fetchCourseContentOverview("c1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/content/overview",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.data.lessons).toHaveLength(2);
  });

  // Chức năng: Lấy content overview khi chưa có bài học
  it("gets empty content overview when course has no lessons", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      data: {
        id: "ct1",
        title: "Overview title",
        lessons: [],
      },
    });

    const result = await fetchCourseContentOverview("c1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/content/overview",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.data.lessons).toEqual([]);
  });
});
