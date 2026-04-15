import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  createLesson,
  updateLesson,
  updateLessonOrder,
} from "../../api/lessons.api";

describe("04 - Lessons API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Tạo lesson hợp lệ
  it("creates lesson with valid payload", async () => {
    const payload = { title: "Lesson 1", description: "Intro", order: 1 };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await createLesson("cc1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-content/cc1/lessons",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Tạo lesson cho courseContent không tồn tại
  it("returns error when creating lesson for non-existing courseContent", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course content with id: cc-missing not found",
    });

    const result = await createLesson("cc-missing", { title: "Lesson Missing" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-content/cc-missing/lessons",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not found");
  });

  // Chức năng: Cập nhật lesson đúng teacher sở hữu
  it("updates lesson when teacher owns the course", async () => {
    const payload = { title: "Updated Lesson", description: "Updated" };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await updateLesson("cc1", "l1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-contents/cc1/lessons/l1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Cập nhật lesson sai quyền
  it("returns forbidden error when updating lesson without permission", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "forbidden",
    });

    const result = await updateLesson("cc1", "l1", { title: "No permission" });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-contents/cc1/lessons/l1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toBe("forbidden");
  });

  // Chức năng: Đổi thứ tự nhiều lesson hợp lệ
  it("updates order for multiple lessons with valid payload", async () => {
    const payload = [
      { lessonId: "l1", order: 2 },
      { lessonId: "l2", order: 1 },
      { lessonId: "l3", order: 3 },
    ];
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await updateLessonOrder("cc1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-contents/cc1/lessons/order",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Payload thứ tự thiếu lessonId/trùng thứ tự
  it("returns error for invalid lesson-order payload (missing lessonId/duplicate order)", async () => {
    const invalidPayload = [
      { order: 1 },
      { lessonId: "l2", order: 1 },
    ];
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Invalid lesson order payload",
    });

    const result = await updateLessonOrder("cc1", invalidPayload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/course-contents/cc1/lessons/order",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(invalidPayload),
      })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("Invalid lesson order payload");
  });
});
