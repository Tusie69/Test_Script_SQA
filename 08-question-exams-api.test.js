import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  addChoice,
  createQuestionExam,
  deleteChoice,
  deleteQuestionExam,
  updateChoice,
} from "../../api/questionExams.api";

describe("08 - QuestionExams API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Thêm câu hỏi hợp lệ vào đề thi
  it("adds valid question to existing exam", async () => {
    const payload = {
      content: "What is 2 + 2?",
      questionType: "SingleChoice",
      score: 1,
    };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await createQuestionExam("e1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/e1/question-exams",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Thêm câu hỏi vào đề thi không tồn tại
  it("returns error when adding question to non-existing exam", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Exam not found",
    });

    const result = await createQuestionExam("e-missing", {
      content: "Invalid exam question",
      questionType: "SingleChoice",
      score: 1,
    });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/e-missing/question-exams",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not found");
  });

  // Chức năng: Xóa câu hỏi đang được tham chiếu bởi attempt/submission
  it("returns error when deleting question referenced by attempts/submissions", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Question is referenced by attempts/submissions",
    });

    const result = await deleteQuestionExam("e1", "q1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/e1/question-exams/q1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("referenced");
  });

  // Chức năng: Thêm lựa chọn hợp lệ và đánh dấu đáp án đúng
  it("adds valid choices including a correct answer", async () => {
    const payload = { content: "4", isCorrect: true };
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await addChoice("q1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/q1/choices",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Tạo lựa chọn nhưng không có đáp án đúng
  it("returns error when no correct choice exists", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "At least one correct choice is required",
    });

    const result = await addChoice("q1", { content: "3", isCorrect: false });

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/q1/choices",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("correct choice");
  });

  // Chức năng: Cập nhật choice đổi trạng thái đúng/sai
  it("updates choice correctness flag true/false", async () => {
    baseFetch
      .mockResolvedValueOnce({ status: "success", data: { isCorrect: true } })
      .mockResolvedValueOnce({ status: "success", data: { isCorrect: false } });

    const makeCorrect = await updateChoice("q1", "c1", { content: "4", isCorrect: true });
    const makeIncorrect = await updateChoice("q1", "c1", { content: "4", isCorrect: false });

    expect(baseFetch).toHaveBeenNthCalledWith(
      1,
      "/api/q1/choices/c1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ content: "4", isCorrect: true }),
      })
    );
    expect(baseFetch).toHaveBeenNthCalledWith(
      2,
      "/api/q1/choices/c1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ content: "4", isCorrect: false }),
      })
    );
    expect(makeCorrect.data.isCorrect).toBe(true);
    expect(makeIncorrect.data.isCorrect).toBe(false);
  });

  // Chức năng: Xóa choice không tồn tại
  it("returns not-found error when deleting non-existing choice", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Choice not found",
    });

    const result = await deleteChoice("q1", "c-missing");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/q1/choices/c-missing",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not found");
  });
});
