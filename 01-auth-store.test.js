import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

function createStorage() {
  let data = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
    clear: () => {
      data = {};
    },
  };
}

const storage = createStorage();
vi.stubGlobal("localStorage", storage);

import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";

describe("01 - Auth Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    useAuth.setState({ user: null, isHydrated: false });
  });

  // Chức năng: Đăng ký hợp lệ (email mới, đủ dữ liệu)
  it("register succeeds with valid payload", async () => {
    api.post.mockResolvedValueOnce({ data: { ok: true } });

    const result = await useAuth.getState().register({
      email: "new-user@demo.com",
      password: "Password@123",
      fullName: "New User",
      dateOfBirth: "2000-01-01",
      gender: "male",
      avatarUrl: "https://example.com/avatar.png",
      socialLinks: "https://facebook.com/new-user",
    });

    expect(api.post).toHaveBeenCalledWith("/api/Auth/register", {
      email: "new-user@demo.com",
      password: "Password@123",
      fullName: "New User",
      dateOfBirth: "2000-01-01",
      gender: "male",
      avatarUrl: "https://example.com/avatar.png",
      socialLinks: "https://facebook.com/new-user",
    });
    expect(result).toEqual({ ok: true });
    expect(storage.getItem("access_token")).toBeNull();
    expect(storage.getItem("refresh_token")).toBeNull();
  });

  // Chức năng: Đăng ký trùng email
  it("register throws duplicate-email error", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 409, data: { message: "Email already exists" } },
    });

    await expect(
      useAuth.getState().register({
        email: "dup@demo.com",
        password: "Password@123",
        fullName: "Dup User",
      })
    ).rejects.toThrow("Email đã tồn tại.");
  });

  // Chức năng: Đăng ký thiếu trường bắt buộc
  it("register throws required-field error", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 400, data: { message: "The Email field is required." } },
    });

    await expect(
      useAuth.getState().register({
        password: "Password@123",
        fullName: "Missing Email",
      })
    ).rejects.toThrow("The Email field is required.");
  });

  // Chức năng: Đăng nhập đúng email/mật khẩu
  it("login stores token and user", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: "at",
        refreshToken: "rt",
        userId: "u1",
        fullName: "User One",
        studentId: "s1",
      },
    });

    const user = await useAuth.getState().login({
      email: "a@a.com",
      password: "x",
      remember: true,
    });

    expect(user.id).toBe("u1");
    expect(storage.getItem("access_token")).toBe("at");
    expect(storage.getItem("refresh_token")).toBe("rt");
    expect(useAuth.getState().user.fullName).toBe("User One");
  });

  // Chức năng: Đăng nhập sai mật khẩu
  it("login throws friendly message on 401", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: "invalid" } },
    });

    await expect(
      useAuth.getState().login({ email: "a@a.com", password: "bad" })
    ).rejects.toThrow();
  });

  // Chức năng: Refresh token hợp lệ
  // Ghi chú: useAuth hiện chưa có hàm refresh token riêng để test trực tiếp.
  it.skip("refresh token valid flow (not implemented in auth store yet)", async () => {});

  // Chức năng: Refresh token hết hạn/không hợp lệ
  // Ghi chú: useAuth hiện chưa có hàm refresh token riêng để test trực tiếp.
  it.skip("refresh token invalid/expired flow (not implemented in auth store yet)", async () => {});

  // Chức năng: Admin login bằng tài khoản thường
  // Ghi chú: admin login thuộc admin.api.js, đã có test ở 12-admin-review-api.test.js.
  it.skip("admin login with normal account (belongs to admin api, not auth store)", async () => {});

  it("logout clears local storage keys", () => {
    storage.setItem("access_token", "a");
    storage.setItem("refresh_token", "r");
    storage.setItem("auth_state", "{}");

    useAuth.getState().logout();

    expect(storage.getItem("access_token")).toBeNull();
    expect(storage.getItem("refresh_token")).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });
});
