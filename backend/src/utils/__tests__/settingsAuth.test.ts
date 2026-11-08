import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { prisma } from "@/database/prisma";
import bcrypt from "bcryptjs";

describe("Settings & Profile Auth Service Integration Tests", () => {
  const testEmail = `test-settings-${Date.now()}@example.com`;
  const initialPassword = "Password123!";
  let testUserId: number;

  before(async () => {
    // Clean up if exists
    await prisma.user.deleteMany({ where: { email: testEmail } });
    const signupRes = await authService.signup({
      name: "Original Name",
      email: testEmail,
      password: initialPassword,
    });
    testUserId = signupRes.user.id;
  });

  after(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  describe("Profile Name Update", () => {
    it("successfully updates user display name", async () => {
      const updated = await authService.updateProfile(testUserId, { name: "FinSight Tester" });
      assert.equal(updated.name, "FinSight Tester");
      assert.equal(updated.email, testEmail);

      // Verify in DB directly
      const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      assert.equal(dbUser?.name, "FinSight Tester");
    });

    it("trims whitespace from name", async () => {
      const updated = await authService.updateProfile(testUserId, { name: "  Trimmed Name  " });
      assert.equal(updated.name, "Trimmed Name");
    });

    it("throws 404 if user does not exist", async () => {
      await assert.rejects(
        () => authService.updateProfile(999999, { name: "Nobody" }),
        /User not found/
      );
    });
  });

  describe("Password Change", () => {
    it("rejects incorrect current password", async () => {
      await assert.rejects(
        () =>
          authService.changePassword(testUserId, {
            currentPassword: "WrongPassword999!",
            newPassword: "NewSecurePass99!",
            confirmPassword: "NewSecurePass99!",
          }),
        /Incorrect current password/
      );
    });

    it("rejects new password that is identical to current password", async () => {
      await assert.rejects(
        () =>
          authService.changePassword(testUserId, {
            currentPassword: initialPassword,
            newPassword: initialPassword,
            confirmPassword: initialPassword,
          }),
        /New password cannot be the same as your current password/
      );
    });

    it("successfully updates password with valid credentials", async () => {
      const newPass = "UpdatedPass77@!";
      const res = await authService.changePassword(testUserId, {
        currentPassword: initialPassword,
        newPassword: newPass,
        confirmPassword: newPass,
      });

      assert.equal(res.success, true);
      assert.equal(res.message, "Password updated successfully");

      // Verify user can now log in with the new password
      const loginRes = await authService.login({
        email: testEmail,
        password: newPass,
      });
      assert.equal(loginRes.user.id, testUserId);

      // Verify old password no longer works
      await assert.rejects(
        () => authService.login({ email: testEmail, password: initialPassword }),
        /Invalid email or password/
      );
    });
  });
});

