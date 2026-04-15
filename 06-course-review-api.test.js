import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  postCourseReview,
  updateCourseReview,
} from "../../api/courseReview.api";

describe("06 - CourseReview API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Tạo review lần đầu (đúng student đã enrolled)
  it("creates first review successfully for enrolled student", async () => {
    baseFetch.mockResolvedValueOnce({ status: "success", message: "Review added successfully" });

    const result = await postCourseReview("course1", { rating: 5, comment: "good" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ rating: 5, comment: "good" }),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Review khi chưa enroll
  it("returns error when student has not enrolled", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Student has not enrolled in this course",
    });

    const result = await postCourseReview("course1", { rating: 4, comment: "nice" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not enrolled");
  });

  // Chức năng: Review trùng (student đã review rồi)
  it("returns error when student submits duplicate review", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "You have already reviewed this course",
    });

    const result = await postCourseReview("course1", { rating: 4, comment: "duplicate" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("already reviewed");
  });

  // Chức năng: Cập nhật review thuộc chính student
  it("updates review when it belongs to current student", async () => {
    const payload = { rating: 5, comment: "updated comment" };
    baseFetch.mockResolvedValueOnce({ status: "success", message: "Review updated successfully" });

    const result = await updateCourseReview("course1", "r1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews/r1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Cập nhật review của người khác
  it("returns error when updating review that belongs to another student", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Forbidden: cannot update others review",
    });

    const result = await updateCourseReview("course1", "r-other", {
      rating: 3,
      comment: "cannot update",
    });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews/r-other",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("Forbidden");
  });

  // Chức năng: Điểm rating ở biên min/max và ngoài miền
  it("accepts rating min/max and rejects out-of-range values", async () => {
    baseFetch
      .mockResolvedValueOnce({ status: "success" }) // min
      .mockResolvedValueOnce({ status: "success" }) // max
      .mockResolvedValueOnce({ status: "error", message: "Rating must be between 1 and 5" }) // < min
      .mockResolvedValueOnce({ status: "error", message: "Rating must be between 1 and 5" }); // > max

    const minResult = await postCourseReview("course1", { rating: 1, comment: "min" });
    const maxResult = await postCourseReview("course1", { rating: 5, comment: "max" });
    const lowResult = await postCourseReview("course1", { rating: 0, comment: "too low" });
    const highResult = await postCourseReview("course1", { rating: 6, comment: "too high" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course1/reviews",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ rating: 1, comment: "min" }),
      })
    );
    expect(minResult.status).toBe("success");
    expect(maxResult.status).toBe("success");
    expect(lowResult.status).toBe("error");
    expect(highResult.status).toBe("error");
  });
});
