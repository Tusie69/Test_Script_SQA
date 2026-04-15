import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utils/auth", () => ({
  authHeader: vi.fn(() => ({ Authorization: "Bearer t" })),
}));

import {
  createPost,
  hardDeletePost,
  restorePost,
  softDeletePost,
  toggleLike,
  updatePost,
} from "../../api/posts.api";

describe("11 - Forum/Posts API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // Chức năng: Tạo câu hỏi với content JSON hợp lệ
  it("creates question with valid JSON content", async () => {
    const payload = {
      title: "How to use React Query?",
      contentJson: { blocks: [{ type: "paragraph", data: { text: "Need help" } }] },
      tags: "react,query",
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "p1" }),
    });

    const result = await createPost(payload);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/Posts"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result.id).toBe("p1");
  });

  // Chức năng: Tạo câu hỏi thiếu tiêu đề/nội dung
  it("throws error when creating question without title/content", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: "Title and content are required" }),
    });

    await expect(createPost({ title: "", contentJson: null })).rejects.toThrow(
      "Title and content are required"
    );
  });

  // Chức năng: Cập nhật/xóa câu hỏi của chính chủ
  it("updates and soft-deletes own question successfully", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "p1", title: "Updated" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "Post soft-deleted successfully" }),
      });

    const updateResult = await updatePost("p1", { title: "Updated" });
    const deleteResult = await softDeletePost("p1");

    expect(updateResult.title).toBe("Updated");
    expect(deleteResult.message).toContain("soft-deleted");
  });

  // Chức năng: Cập nhật/xóa câu hỏi của user khác
  it("throws error when updating/deleting other user's question", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ message: "You are not the author of this post" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ message: "You are not the author of this post" }),
      });

    await expect(updatePost("p-other", { title: "Hack" })).rejects.toThrow(
      "You are not the author of this post"
    );
    await expect(softDeletePost("p-other")).rejects.toThrow(
      "You are not the author of this post"
    );
  });

  // Chức năng: Soft delete rồi restore thành công
  it("restores question successfully after soft delete", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "Post soft-deleted successfully" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "Post restored successfully" }),
      });

    const softDeleted = await softDeletePost("p1");
    const restored = await restorePost("p1");

    expect(softDeleted.message).toContain("soft-deleted");
    expect(restored.message).toContain("restored");
  });

  // Chức năng: Hard delete khi chưa soft delete
  it("throws error on hard delete when question is not soft-deleted", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: "Post is not deleted" }),
    });

    await expect(hardDeletePost("p-active")).rejects.toThrow("Post is not deleted");
  });

  // Chức năng: Toggle like 1 lần (like) và 2 lần (unlike)
  it("toggles like then unlike correctly", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ liked: false, likeCount: 0 }),
      });

    const liked = await toggleLike("post", "p1");
    const unliked = await toggleLike("post", "p1");

    expect(liked.liked).toBe(true);
    expect(unliked.liked).toBe(false);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/Likes/post/p1/toggle"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/Likes/post/p1/toggle"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
