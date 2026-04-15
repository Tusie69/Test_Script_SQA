import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  createCourseAPI,
  fetchCourses,
  fetchInstructorCourses,
  updateFullCourse,
} from "../../api/courses.api";

describe("02 - Courses API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Tìm kiếm có keyword + filter status
  it("searches instructor courses with keyword and status filter", async () => {
    baseFetch.mockResolvedValueOnce({ data: [] });
    await fetchInstructorCourses({ keyword: "react", status: "Draft" });
    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/instructor?keyword=react&status=Draft",
      expect.objectContaining({ method: "GET" })
    );
  });

  // Chức năng: Tìm kiếm không có kết quả
  it("returns empty list when search has no result", async () => {
    baseFetch.mockResolvedValueOnce({ data: [] });
    const result = await fetchCourses({ keyword: "not-found-keyword" });
    expect(baseFetch).toHaveBeenCalledWith("/api/courses/search?keyword=not-found-keyword");
    expect(result.data).toEqual([]);
  });

  // Chức năng: Dữ liệu phân trang page/pageSize biên (1, 0, rất lớn)
  it("handles pagination boundary values", async () => {
    baseFetch
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    await fetchCourses({ page: 1, pageSize: 1 });
    await fetchCourses({ page: 0, pageSize: 0 });
    await fetchCourses({ page: 999999, pageSize: 1000000 });

    expect(baseFetch).toHaveBeenNthCalledWith(1, "/api/courses/search?page=1&pageSize=1");
    expect(baseFetch).toHaveBeenNthCalledWith(2, "/api/courses/search");
    expect(baseFetch).toHaveBeenNthCalledWith(
      3,
      "/api/courses/search?page=999999&pageSize=1000000"
    );
  });

  // Chức năng: Tạo khóa học hợp lệ với teacher sở hữu
  it("creates course successfully with valid teacher-owned payload", async () => {
    const payload = {
      title: "Course A",
      categoryId: "cat-1",
      courseContent: [{ title: "Intro", order: 1 }],
    };
    baseFetch.mockResolvedValueOnce({ status: "ok" });
    const result = await createCourseAPI(payload);
    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/create-full-course",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("ok");
  });

  // Chức năng: Tạo khóa học thiếu category/courseContent
  it("throws error when creating course without category or courseContent", async () => {
    const payload = { title: "Invalid Course" };
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "category and courseContent are required",
    });

    await expect(createCourseAPI(payload)).rejects.toThrow();
  });

  // Chức năng: Cập nhật khóa học đúng quyền teacher
  it("updates course successfully when teacher has permission", async () => {
    const payload = { title: "Updated Course" };
    baseFetch.mockResolvedValueOnce({ status: "ok", data: { id: "course-1" } });

    const result = await updateFullCourse("course-1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/course-1/update-full-course",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("ok");
  });

  // Chức năng: Cập nhật khóa học không thuộc teacher hiện tại
  it("throws error when updating course not owned by current teacher", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "forbidden",
    });

    await expect(updateFullCourse("course-other-teacher", { title: "X" })).rejects.toThrow();
    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/course-other-teacher/update-full-course",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
