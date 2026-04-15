import { beforeEach, describe, expect, it, vi } from "vitest";

function createStorage() {
  let data = {};
  const storage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
      storage[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
      delete storage[k];
    },
    clear: () => {
      for (const k of Object.keys(data)) {
        delete storage[k];
      }
      data = {};
    },
    key: (i) => Object.keys(data)[i] ?? null,
    get length() {
      return Object.keys(data).length;
    },
  };
  return storage;
}

const storage = createStorage();
vi.stubGlobal("localStorage", storage);

import {
  attemptKey,
  clearAttemptsForExam,
  findActiveAttemptId,
  generateAttemptId,
  readAttempt,
  writeAttempt,
} from "../../utils/attempt";

describe("13 - Attempt Utils", () => {
  beforeEach(() => {
    storage.clear();
  });

  // Chức năng: Tạo attemptId không rỗng và khác nhau
  it("generateAttemptId creates non-empty and unique ids", () => {
    const id1 = generateAttemptId();
    const id2 = generateAttemptId();
    expect(typeof id1).toBe("string");
    expect(typeof id2).toBe("string");
    expect(id1.length).toBeGreaterThan(5);
    expect(id2.length).toBeGreaterThan(5);
    expect(id1).not.toBe(id2);
  });

  // Chức năng: Sinh key đúng format theo exam/attempt
  it("attemptKey follows exam/attempt format", () => {
    expect(attemptKey("e1", "a1")).toBe("attempt_e1_a1");
  });

  // Chức năng: Đọc attempt khi chưa có dữ liệu trả null
  it("readAttempt returns null when no stored data", () => {
    expect(readAttempt("e1", "missing")).toBeNull();
  });

  // Chức năng: Đọc attempt khi JSON lỗi trả null
  it("readAttempt returns null on malformed JSON", () => {
    storage.setItem("attempt_e1_a1", "{bad-json");
    expect(readAttempt("e1", "a1")).toBeNull();
  });

  // Chức năng: Ghi attempt thành công vào localStorage
  it("writeAttempt stores payload in localStorage", () => {
    const payload = { submitted: false, answers: { q1: "c1" } };
    writeAttempt("e1", "a1", payload);
    expect(storage.getItem("attempt_e1_a1")).toBe(JSON.stringify(payload));
    expect(readAttempt("e1", "a1")).toEqual(payload);
  });

  // Chức năng: Xóa toàn bộ attempt theo examId
  it("clearAttemptsForExam removes all attempts for one exam", () => {
    writeAttempt("e1", "a1", { submitted: false });
    writeAttempt("e1", "a2", { submitted: true });
    writeAttempt("e2", "b1", { submitted: false });
    clearAttemptsForExam("e1");
    expect(readAttempt("e1", "a1")).toBeNull();
    expect(readAttempt("e1", "a2")).toBeNull();
    expect(readAttempt("e2", "b1")).not.toBeNull();
  });

  // Chức năng: Tìm active attempt khi submitted=false
  it("findActiveAttemptId returns the unsubmitted attempt id", () => {
    writeAttempt("e1", "a1", { submitted: false });
    writeAttempt("e1", "a2", { submitted: true });
    expect(findActiveAttemptId("e1")).toBe("a1");
  });
});
