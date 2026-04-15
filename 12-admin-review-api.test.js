import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import { adminApproveCourse } from "../../api/admin.api";
import {
  adminApproveReport,
  adminRejectReport,
  createReport,
} from "../../api/report.api";

describe("12 - Admin/Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Gửi report hợp lệ cho target tồn tại
  it("submits a valid report for an existing target", async () => {
    const payload = {
      targetType: "post",
      targetId: "p1",
      reason: "Spam content",
      detail: "Contains phishing link",
    };
    baseFetch.mockResolvedValueOnce({
      status: "success",
      message: "Báo cáo đã được gửi và đang chờ duyệt.",
    });

    const result = await createReport(payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Report",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Gửi report trùng nội dung/target bởi cùng user
  it("throws error when same user submits duplicate report for same target", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Duplicate report for this target",
    });

    await expect(
      createReport({
        targetType: "post",
        targetId: "p1",
        reason: "Spam content",
        detail: "Contains phishing link",
      })
    ).rejects.toThrow("Duplicate report for this target");
  });

  // Chức năng: Admin duyệt report hợp lệ
  it("approves report successfully as admin", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      message: "Báo cáo đã được duyệt.",
    });

    const result = await adminApproveReport("r1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Report/r1/approve",
      expect.objectContaining({ method: "PUT" })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Admin reject report hợp lệ
  it("rejects report successfully as admin", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      message: "Báo cáo đã bị từ chối.",
    });

    const result = await adminRejectReport("r2");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Report/r2/reject",
      expect.objectContaining({ method: "PUT" })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: User thường gọi endpoint admin
  it("throws forbidden when normal user calls admin endpoint", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Forbidden",
    });

    await expect(adminApproveCourse("c1")).rejects.toThrow("Forbidden");
  });

  // Chức năng: Admin duyệt khóa học đang chờ duyệt
  it("approves pending course successfully", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "success",
      message: "Course approved successfully",
    });

    const result = await adminApproveCourse("c-pending");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/admin/courses/c-pending/approve",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.status).toBe("success");
  });

  // Chức năng: Admin duyệt khóa học đã ở trạng thái published
  it("throws error when approving already-published course", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course is already published",
    });

    await expect(adminApproveCourse("c-published")).rejects.toThrow(
      "Course is already published"
    );
  });
});
