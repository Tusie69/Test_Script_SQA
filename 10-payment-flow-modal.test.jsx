import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/baseApi", () => ({ baseFetch: vi.fn() }));
vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import { baseFetch } from "../../api/baseApi";
import {
  createOrder,
  generatePaymentQr,
  paymentWebhook,
  sepayWebhook,
} from "../../api/payments.api";

describe("10 - Payments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Chức năng: Tạo đơn hàng với 1 khóa học hợp lệ
  it("creates order successfully with one valid course", async () => {
    const orderDetails = [{ courseId: "c1", price: 100000 }];
    baseFetch.mockResolvedValueOnce({ orderId: "o1", status: "pending" });

    const result = await createOrder(orderDetails);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ orderDetails }),
      })
    );
    expect(result.orderId).toBe("o1");
  });

  // Chức năng: Tạo đơn hàng với nhiều khóa học, có khóa đã sở hữu
  it("returns error when creating order includes an already-owned course", async () => {
    const orderDetails = [
      { courseId: "c1", price: 100000 },
      { courseId: "c-owned", price: 200000 },
    ];
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Course c-owned is already owned by student",
    });

    const result = await createOrder(orderDetails);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Orders",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("already owned");
  });

  // Chức năng: Tạo đơn hàng rỗng
  it("returns error when creating empty order", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "Order must have at least one course.",
    });

    const result = await createOrder([]);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ orderDetails: [] }),
      })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("at least one course");
  });

  // Chức năng: Sinh QR cho payment thuộc đúng student
  it("generates payment QR for the correct student owner", async () => {
    baseFetch.mockResolvedValueOnce({
      paymentId: "p1",
      orderId: "o1",
      qrCode: "data:image/png;base64,abc",
    });

    const result = await generatePaymentQr("p1");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Payment/p1/qr",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.paymentId).toBe("p1");
  });

  // Chức năng: Sinh QR cho payment không thuộc student
  it("returns error when generating QR for payment not owned by student", async () => {
    baseFetch.mockResolvedValueOnce({
      status: "error",
      message: "You are not allowed to access this payment.",
    });

    const result = await generatePaymentQr("p-other-user");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Payment/p-other-user/qr",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("not allowed");
  });

  // Chức năng: Webhook hợp lệ cập nhật trạng thái thành công
  it("processes valid webhook and marks payment/order as successful", async () => {
    const payload = { transactionId: "tx1", status: "success" };
    baseFetch.mockResolvedValueOnce({ message: "Payment confirmed and order updated." });

    const result = await paymentWebhook(payload);

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Payment/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.message).toContain("confirmed");
  });

  // Chức năng: Webhook trùng transaction (idempotent)
  it("handles duplicate webhook transaction idempotently", async () => {
    const payload = {
      id: 1,
      transferType: "in",
      transferAmount: 100000,
      content: "ELN68d22c8810634e30990c0e153c979780",
      referenceCode: "ref-dup",
    };
    baseFetch.mockResolvedValueOnce({ success: true, message: "Already processed" });

    const result = await sepayWebhook(payload, "valid-signature");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Payment/webhook/sepay",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-sepay-signature": "valid-signature" }),
      })
    );
    expect(result.success).toBe(true);
  });

  // Chức năng: Webhook sai chữ ký/secret
  it("returns error when webhook signature/secret is invalid", async () => {
    const payload = {
      id: 2,
      transferType: "in",
      transferAmount: 100000,
      content: "ELNinvalid",
      referenceCode: "ref-invalid-sign",
    };
    baseFetch.mockResolvedValueOnce({
      success: false,
      message: "Invalid signature or secret",
    });

    const result = await sepayWebhook(payload, "invalid-signature");

    expect(baseFetch).toHaveBeenCalledWith(
      "/api/Payment/webhook/sepay",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-sepay-signature": "invalid-signature" }),
      })
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid signature");
  });
});
