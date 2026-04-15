import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  createFullExam,
  updateExam,
  updateExamQuestionOrder,
  uploadExamExcel,
} from "../../api/exams.api";

describe("07 - Exams API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Tạo đề thi hợp lệ cho lesson/course hợp lệ
  it("creates exam successfully with valid lesson/course payload", async () => {
    const payload = {
      lessonId: "l1",
      title: "Midterm",
      durationMinutes: 30,
      questionCount: 20,
    };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await createFullExam(payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/create-full-exam",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Tạo đề thi với thời lượng/số câu không hợp lệ
  it("throws error when creating exam with invalid duration/question count", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Invalid duration or question count",
    });

    await expect(
      createFullExam({
        lessonId: "l1",
        title: "Invalid Exam",
        durationMinutes: 0,
        questionCount: -2,
      })
    ).rejects.toThrow();
  });

  // Chức năng: Cập nhật đề thi đúng quyền teacher
  it("updates exam successfully when teacher has permission", async () => {
    const payload = { title: "Midterm Updated", durationMinutes: 45 };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await updateExam("e1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/e1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Cập nhật đề thi sai quyền
  it("throws error when updating exam without teacher permission", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "forbidden",
    });

    await expect(updateExam("e1", { title: "No Permission" })).rejects.toThrow();
  });

  // Chức năng: Sắp xếp lại câu hỏi với danh sách đầy đủ
  it("reorders questions successfully with complete question list", async () => {
    const payload = [
      { questionExamId: "q1", order: 1 },
      { questionExamId: "q2", order: 2 },
      { questionExamId: "q3", order: 3 },
    ];
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await updateExamQuestionOrder("e1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/e1/order",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Sắp xếp lại câu hỏi thiếu ID hoặc trùng order
  it("throws error when reorder payload misses id or has duplicate order", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Invalid reorder payload",
    });

    await expect(
      updateExamQuestionOrder("e1", [
        { order: 1 },
        { questionExamId: "q2", order: 1 },
      ])
    ).rejects.toThrow();
  });

  // Chức năng: Upload Excel đúng format
  it("uploads excel successfully with valid format", async () => {
    const file = new File(["question,answer\nA,1"], "exam.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await uploadExamExcel("e1", file);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/e1/upload",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Upload Excel sai định dạng/cột thiếu dữ liệu
  it("throws error when uploading invalid excel format or missing columns", async () => {
    const invalidFile = new File(["bad,data"], "invalid.txt", {
      type: "text/plain",
    });
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Invalid excel format or missing required columns",
    });

    await expect(uploadExamExcel("e1", invalidFile)).rejects.toThrow();
  });
});
