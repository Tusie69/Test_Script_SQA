import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  isEnrolled,
  postEnrollCourse,
  updateProgressEnrollment,
} from "../../api/enrollments.api";

describe("05 - Enrollments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Ghi danh lần đầu thành công
  it("enrolls successfully on first attempt", async () => {
    baseFetch.mockResolvedValueOnce({ status: "success", message: "Enrolled successfully" });

    const result = await postEnrollCourse("c1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/enrollments",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Ghi danh trùng khóa học đã đăng ký
  it("returns duplicate-enrollment error when enrolling same course again", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "You already enrolled this course",
    });

    const result = await postEnrollCourse("c1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/enrollments",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("already");
  });

  // Chức năng: Ghi danh khi khóa học chưa publish
  it("returns error when enrolling unpublished course", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course is not published",
    });

    const result = await postEnrollCourse("c-draft");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c-draft/enrollments",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not published");
  });

  // Chức năng: Cập nhật tiến độ với lesson hợp lệ
  it("updates progress with valid lesson", async () => {
    baseFetch.mockResolvedValueOnce({ status: "success", data: { progress: 25 } });

    const result = await updateProgressEnrollment("c1", "l1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/enrollments/progress",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ LessonId: "l1" }) })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Cập nhật tiến độ vượt giới hạn (<0, >100 nếu có)
  it("returns error for out-of-range progress update", async () => {
    baseFetch.mockRejectedValueOnce(new Error("Progress must be between 0 and 100"));

    await expect(updateProgressEnrollment("c1", "invalid-progress-marker")).rejects.toThrow(
      "Progress must be between 0 and 100"
    );
  });

  // Chức năng: Kiểm tra enrolled trả true/false đúng
  it("isEnrolled returns true/false correctly", async () => {
    baseFetch
      .mockResolvedValueOnce({ data: { isEnrolled: true } })
      .mockResolvedValueOnce({ data: { isEnrolled: false } });

    const enrolled = await isEnrolled("c1");
    const notEnrolled = await isEnrolled("c2");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c1/enrollments/is-enrolled",
      expect.objectContaining({ method: "GET" })
    );
    expect(baseFetch).toHaveBeenCalledWith(
      "/api/courses/c2/enrollments/is-enrolled",
      expect.objectContaining({ method: "GET" })
    );
    expect(enrolled.data.isEnrolled).toBe(true);
    expect(notEnrolled.data.isEnrolled).toBe(false);
  });
});
