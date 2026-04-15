import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(() => ({ sub: "u1", role: "Student" })),
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

import {
  clearAllAuth,
  getToken,
  isLoggedIn,
  setTokens,
} from "../../utils/auth";
import {
  getRoleBasedDashboard,
  getUserRole,
} from "../../utils/userRole";

describe("14 - Auth & Role Utils", () => {
  beforeEach(() => {
    storage.clear();
  });

  // Chức năng: Trạng thái login khi có/không có token
  it("isLoggedIn returns false without token and true with token", () => {
    expect(isLoggedIn()).toBe(false);
    setTokens({ accessToken: "at", refreshToken: "rt" });
    expect(isLoggedIn()).toBe(true);
  });

  // Chức năng: Lưu token hợp lệ và đọc lại đúng
  it("setTokens saves valid token and getToken reads it correctly", () => {
    setTokens({ accessToken: "valid-at", refreshToken: "valid-rt" });
    expect(getToken()).toBe("valid-at");
  });

  // Chức năng: Xóa toàn bộ key auth khỏi localStorage
  it("clearAllAuth removes all auth keys from localStorage", () => {
    setTokens({ accessToken: "at", refreshToken: "rt" });
    storage.setItem("app_user", JSON.stringify({ studentId: "s1" }));
    storage.setItem("auth_user", "{}");
    storage.setItem("app_header_mode", "teacher");
    clearAllAuth();
    expect(getToken()).toBeNull();
    expect(storage.getItem("app_refresh_token")).toBeNull();
    expect(storage.getItem("app_auth_status")).toBeNull();
    expect(storage.getItem("app_user")).toBeNull();
    expect(storage.getItem("auth_user")).toBeNull();
    expect(storage.getItem("app_header_mode")).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  // Chức năng: Parse role Student/Teacher/Admin đúng dữ liệu
  it("getUserRole parses Student/Teacher/Admin correctly", () => {
    storage.setItem("app_user", JSON.stringify({ studentId: "s1" }));
    expect(getUserRole()).toBe("Student");

    storage.setItem("app_user", JSON.stringify({ teacherId: "t1" }));
    expect(getUserRole()).toBe("Teacher");

    storage.setItem("app_user", JSON.stringify({ adminId: "a1" }));
    expect(getUserRole()).toBe("Admin");
  });

  // Chức năng: Dữ liệu user lỗi JSON trả null an toàn
  it("getUserRole returns null safely for malformed JSON user data", () => {
    storage.setItem("app_user", "{bad-json");
    expect(getUserRole()).toBeNull();
  });

  // Chức năng: Điều hướng dashboard đúng theo role
  it("getRoleBasedDashboard maps role to correct dashboard route", () => {
    expect(getRoleBasedDashboard("Student")).toBe("/s/dashboard");
    expect(getRoleBasedDashboard("Teacher")).toBe("/i/dashboard");
    expect(getRoleBasedDashboard("Admin")).toBe("/admin/dashboard");
    expect(getRoleBasedDashboard(null)).toBe("/");
  });
});
