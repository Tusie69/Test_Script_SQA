import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  postExamAttempt,
  saveCurrentAnswersAPI,
} from "../../api/examAttempt";
import { fetchSubmissionExamByAttemmptId, submitExamAPI } from "../../api/exams.api";

describe("09 - ExamAttempt API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Bắt đầu attempt khi đề thi mở
  it("starts attempt successfully when exam is open", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      data: { attemptId: "a1", status: "Active" },
    });

    const result = await postExamAttempt("exam1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/exam1/attempt/start",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("success");
    expect(result.data.attemptId).toBe("a1");
  });

  // Chức năng: Bắt đầu attempt khi đề đóng/hết thời gian
  it("returns error when starting attempt on closed/expired exam", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Exam is closed or expired",
    });

    const result = await postExamAttempt("exam-closed");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/exam-closed/attempt/start",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("closed");
  });

  // Chức năng: Resume attempt đang active
  it("resumes active attempt instead of creating new one", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      data: { attemptId: "a-active", status: "Active", resumed: true },
    });

    const result = await postExamAttempt("exam1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exams/exam1/attempt/start",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.data.attemptId).toBe("a-active");
    expect(result.data.resumed).toBe(true);
  });

  // Chức năng: Lưu đáp án tạm thời JSON hợp lệ
  it("saves temporary answers with valid JSON payload", async () => {
    const payload = JSON.stringify([{ questionId: "q1", choices: [{ id: "c1" }] }]);
    baseFetch.mockResolvedValueOnce({ status: "success" });

    const result = await saveCurrentAnswersAPI("a1", payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exam-attempt/a1/save-answers",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Lưu đáp án với payload lỗi parse
  it("returns parse error when saving malformed answers payload", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Invalid answers JSON format",
    });

    const malformed = "{bad-json";
    const result = await saveCurrentAnswersAPI("a1", malformed);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/exam-attempt/a1/save-answers",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(malformed) })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("JSON");
  });

  // Chức năng: Nộp bài thành công và chấm điểm đúng
  it("submits exam successfully and returns scoring result", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      data: { score: 8.5, totalCorrect: 17 },
    });

    const answers = JSON.stringify([{ questionId: "q1", choices: [{ id: "c1" }] }]);
    const result = await submitExamAPI("a1", answers);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/submit/a1/submit-exam",
      expect.objectContaining({ method: "POST", body: JSON.stringify(answers) })
    );
    expect(result.status).toBe("success");
    expect(result.data.score).toBe(8.5);
  });

  // Chức năng: Nộp bài 2 lần cùng attempt
  it("throws error on second submission for same attempt", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "This exam attempt has already been submitted",
    });

    await expect(submitExamAPI("a1", JSON.stringify([]))).rejects.toThrow();
  });

  // Chức năng: Lấy chi tiết submission của chính chủ và của user khác
  it("gets own submission detail and rejects other user's submission access", async () => {
    baseFetch
      .mockResolvedValueOnce({
        status: "success",
        data: { submissionExamId: "s1", score: 9 },
      })
      .mockResolvedValueOnce({
        status: "error",
        message: "You are not authorized to access this submission",
      });

    const ownResult = await fetchSubmissionExamByAttemmptId("a1");
    expect(ownResult.data.submissionExamId).toBe("s1");

    await expect(fetchSubmissionExamByAttemmptId("a-other-user")).rejects.toThrow();
  });
});
