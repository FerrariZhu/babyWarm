import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAuthLoginError } from "./login-error";

describe("formatAuthLoginError", () => {
  it("maps Failed to fetch to a reachable-service message", () => {
    assert.match(
      formatAuthLoginError(new TypeError("Failed to fetch")),
      /无法连接登录服务/
    );
  });

  it("maps fetch failed and NetworkError the same way", () => {
    assert.match(formatAuthLoginError(new TypeError("fetch failed")), /无法连接登录服务/);
    assert.match(formatAuthLoginError(new Error("NetworkError when attempting to fetch resource.")), /无法连接登录服务/);
  });

  it("maps invalid credentials to a password hint", () => {
    assert.equal(formatAuthLoginError(new Error("Invalid login credentials")), "邮箱或密码错误");
  });

  it("falls back for unknown errors", () => {
    assert.equal(formatAuthLoginError(new Error("Email not confirmed")), "邮箱尚未验证");
    assert.equal(formatAuthLoginError("nope"), "登录失败，请重试");
  });
});
