"use client";

import { useState, useId } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { PageHeader, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import {
  User,
  Mail,
  Lock,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit2,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function getInitials(name) {
  if (!name) return "FS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PASSWORD_RULES = [
  { id: "len", label: "8–16 characters", test: (p) => p.length >= 8 && p.length <= 16 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "num", label: "One number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "One special character (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const nameInputId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Sync nameInput if user updates
  const handleStartEditName = () => {
    setNameInput(user?.name || "");
    setNameError("");
    setNameSuccess("");
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setNameInput(user?.name || "");
    setNameError("");
    setIsEditingName(false);
  };

  const handleSaveName = async (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Name cannot exceed 50 characters");
      return;
    }

    try {
      setSavingName(true);
      setNameError("");
      setNameSuccess("");

      const res = await api.updateProfile({ name: trimmed });
      if (res?.user) {
        updateUser(res.user);
      } else {
        updateUser({ name: trimmed });
      }

      setNameSuccess("Profile name updated successfully");
      setIsEditingName(false);
      setTimeout(() => setNameSuccess(""), 4000);
    } catch (err) {
      setNameError(err.message || "Failed to update profile name");
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    const failedRule = PASSWORD_RULES.find((r) => !r.test(newPassword));
    if (failedRule) {
      setPasswordError(`New password requirement not met: ${failedRule.label}`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password cannot be the same as your current password");
      return;
    }

    try {
      setSavingPassword(true);
      await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess("Password updated successfully! Your account is secure.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 6000);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <PageHeader
        title="Settings"
        description="Manage your account profile, credentials, and experience preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT COLUMN: Profile & Appearance ================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* PROFILE CARD */}
          <Card className="p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-horizon/10 text-horizon">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-screamer text-xl tracking-wide text-ink uppercase">
                    Profile Information
                  </h2>
                  <p className="font-editorial text-xs sm:text-sm text-ink-soft">
                    Your personal identity and registered contact details.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-horizon/10 text-horizon border border-horizon/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            </div>

            {nameSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-2 p-3 rounded-lg border border-horizon/40 bg-horizon/10 text-sm text-ink font-editorial"
              >
                <CheckCircle2 className="h-4 w-4 text-horizon shrink-0" />
                <span>{nameSuccess}</span>
              </motion.div>
            )}

            {/* Avatar & Identifiers Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
              <div className="relative">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-paper-raised to-paper border-2 border-horizon/40 shadow-sm flex items-center justify-center font-screamer text-2xl sm:text-3xl text-horizon tracking-wider select-none">
                  {getInitials(user?.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-paper border border-line flex items-center justify-center text-horizon">
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-editorial text-lg sm:text-xl font-bold text-ink truncate">
                      {user?.name || "FinSight User"}
                    </h3>
                    <p className="font-editorial text-xs sm:text-sm text-ink-soft truncate">
                      {user?.email || "No email on file"}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs font-editorial text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-ink-soft/70" />
                    Member since {formattedJoinDate}
                  </span>
                  {user?.id && (
                    <span className="text-ink-soft/60">
                      ID: #FS-{String(user.id).padStart(5, "0")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Editable Fields Section */}
            <div className="space-y-5 pt-2">
              {/* Display Name Field */}
              <div className="rounded-xl border border-line bg-paper/60 p-4 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={nameInputId} className="text-xs uppercase font-semibold tracking-wider text-ink-soft">
                    Display Name
                  </label>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={handleStartEditName}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-horizon hover:underline cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit Name
                    </button>
                  )}
                </div>

                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="space-y-3 mt-2">
                    <div>
                      <input
                        id={nameInputId}
                        type="text"
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (nameError) setNameError("");
                        }}
                        placeholder="Enter your full name"
                        disabled={savingName}
                        autoFocus
                        className="w-full rounded-lg border border-horizon/60 bg-paper-raised px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-horizon"
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-signal-neg font-editorial">{nameError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        variant="accent"
                        disabled={savingName}
                        className="py-1.5 px-4 text-xs font-semibold cursor-pointer"
                      >
                        {savingName ? "Saving…" : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelEditName}
                        disabled={savingName}
                        className="py-1.5 px-3 text-xs cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="font-editorial text-sm sm:text-base font-medium text-ink">
                    {user?.name || "—"}
                  </p>
                )}
              </div>

              {/* Read-Only Email Field */}
              <div className="rounded-xl border border-line bg-paper/30 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs uppercase font-semibold tracking-wider text-ink-soft flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Registered Email Address
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft/70 bg-ink/5 px-2 py-0.5 rounded">
                    <Lock className="h-3 w-3" />
                    Read-Only
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-editorial text-sm sm:text-base font-medium text-ink break-all select-all">
                    {user?.email || "—"}
                  </p>
                </div>
                <p className="mt-2 text-xs font-editorial text-ink-soft/70 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 shrink-0 text-ink-soft/50" />
                  Email address cannot be changed. It serves as your permanent account identity.
                </p>
              </div>
            </div>
          </Card>

          {/* APPEARANCE / PREFERENCES CARD */}
          <Card className="p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-line">
              <div className="p-2 rounded-lg bg-horizon/10 text-horizon">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-screamer text-xl tracking-wide text-ink uppercase">
                  Appearance & Theme
                </h2>
                <p className="font-editorial text-xs sm:text-sm text-ink-soft">
                  Choose your interface theme. Updates apply instantly across all modules.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DARK THEME SELECTION CARD */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "border-horizon bg-horizon/5 ring-1 ring-horizon/30 shadow-md"
                    : "border-line bg-paper/40 hover:border-ink/20 hover:bg-paper/80"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0e1013] border border-white/10 flex items-center justify-center text-horizon">
                      <Moon className="h-4 w-4" />
                    </div>
                    <span className="font-editorial font-bold text-sm text-ink">Dark Mode</span>
                  </div>
                  {theme === "dark" ? (
                    <span className="w-5 h-5 rounded-full bg-horizon text-[#0e1013] flex items-center justify-center text-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-line" />
                  )}
                </div>

                {/* Dark Preview Mockup */}
                <div className="rounded-lg bg-[#0d0e12] p-2.5 border border-white/10 space-y-2 select-none pointer-events-none">
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-12 rounded bg-white/20" />
                    <div className="h-2 w-4 rounded-full bg-horizon" />
                  </div>
                  <div className="h-6 w-full rounded bg-white/5 border border-white/10 flex items-center px-2">
                    <div className="h-1.5 w-16 rounded bg-white/30" />
                  </div>
                </div>

                <p className="mt-3 text-xs font-editorial text-ink-soft">
                  Deep obsidian contrast with electric lime highlights. Recommended.
                </p>
              </button>

              {/* LIGHT THEME SELECTION CARD */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "light"
                    ? "border-horizon bg-horizon/5 ring-1 ring-horizon/30 shadow-md"
                    : "border-line bg-paper/40 hover:border-ink/20 hover:bg-paper/80"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#f7f6f2] border border-black/10 flex items-center justify-center text-[#d97706]">
                      <Sun className="h-4 w-4" />
                    </div>
                    <span className="font-editorial font-bold text-sm text-ink">Light Mode</span>
                  </div>
                  {theme === "light" ? (
                    <span className="w-5 h-5 rounded-full bg-horizon text-[#0e1013] flex items-center justify-center text-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-line" />
                  )}
                </div>

                {/* Light Preview Mockup */}
                <div className="rounded-lg bg-[#f7f6f2] p-2.5 border border-black/10 space-y-2 select-none pointer-events-none">
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-12 rounded bg-black/20" />
                    <div className="h-2 w-4 rounded-full bg-[#d97706]" />
                  </div>
                  <div className="h-6 w-full rounded bg-white border border-black/10 flex items-center px-2">
                    <div className="h-1.5 w-16 rounded bg-black/30" />
                  </div>
                </div>

                <p className="mt-3 text-xs font-editorial text-ink-soft">
                  Warm, clean editorial backdrop with sharp dark typography.
                </p>
              </button>
            </div>

            <p className="mt-4 text-xs font-editorial text-ink-soft/80">
              Your theme selection is saved locally and synced across sessions automatically.
            </p>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: Security & Account ================= */}
        <div className="lg:col-span-5 space-y-8">
          {/* CHANGE PASSWORD CARD */}
          <Card className="p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-line">
              <div className="p-2 rounded-lg bg-horizon/10 text-horizon">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-screamer text-xl tracking-wide text-ink uppercase">
                  Account Security
                </h2>
                <p className="font-editorial text-xs sm:text-sm text-ink-soft">
                  Change your password securely.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 p-3 rounded-lg border border-horizon/40 bg-horizon/10 text-xs sm:text-sm text-ink font-editorial"
              >
                <CheckCircle2 className="h-4 w-4 text-horizon shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </motion.div>
            )}

            {passwordError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 p-3 rounded-lg border border-signal-neg/30 bg-signal-neg/10 text-xs sm:text-sm text-signal-neg font-editorial"
              >
                <AlertCircle className="h-4 w-4 text-signal-neg shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </motion.div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* CURRENT PASSWORD */}
              <div>
                <label
                  htmlFor={currentPasswordId}
                  className="block text-xs uppercase font-semibold tracking-wider text-ink-soft mb-1.5"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id={currentPasswordId}
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    disabled={savingPassword}
                    className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-horizon focus:ring-2 focus:ring-horizon/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? "Hide current password" : "Show current password"}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-ink-soft hover:text-ink transition-colors cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* NEW PASSWORD */}
              <div>
                <label
                  htmlFor={newPasswordId}
                  className="block text-xs uppercase font-semibold tracking-wider text-ink-soft mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id={newPasswordId}
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    disabled={savingPassword}
                    className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-horizon focus:ring-2 focus:ring-horizon/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? "Hide new password" : "Show new password"}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-ink-soft hover:text-ink transition-colors cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Rules Indicators */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-editorial">
                  {PASSWORD_RULES.map((r) => {
                    const pass = r.test(newPassword);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center gap-1.5 transition-colors ${
                          pass ? "text-horizon font-medium" : "text-ink-soft/60"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                            pass
                              ? "bg-horizon text-[#0e1013]"
                              : "border border-ink-soft/40 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONFIRM NEW PASSWORD */}
              <div>
                <label
                  htmlFor={confirmPasswordId}
                  className="block text-xs uppercase font-semibold tracking-wider text-ink-soft mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id={confirmPasswordId}
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    disabled={savingPassword}
                    className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-horizon focus:ring-2 focus:ring-horizon/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-ink-soft hover:text-ink transition-colors cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p
                    className={`mt-1.5 text-xs font-editorial flex items-center gap-1 ${
                      newPassword === confirmPassword ? "text-horizon" : "text-signal-neg"
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <Check className="h-3 w-3" /> Passwords match
                      </>
                    ) : (
                      "Passwords do not match"
                    )}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    savingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                  className="w-full py-2.5 font-editorial font-semibold cursor-pointer"
                >
                  {savingPassword ? "Updating Password…" : "Update Password"}
                </Button>
              </div>
            </form>
          </Card>

          {/* SESSION / LOGOUT CARD */}
          <Card className="p-6 sm:p-7 border-signal-neg/20 bg-signal-neg/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-signal-neg/10 text-signal-neg">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-screamer text-xl tracking-wide text-ink uppercase">
                  Session & Account
                </h2>
                <p className="font-editorial text-xs sm:text-sm text-ink-soft">
                  Manage your active FinSight session on this browser.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-editorial text-ink-soft mb-5">
              Logging out will clear your secure session and require you to sign back in with your
              credentials to access your dashboard.
            </p>

            <Button
              type="button"
              variant="danger"
              onClick={() => setShowLogoutModal(true)}
              className="w-full sm:w-auto font-editorial font-semibold cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out of FinSight
            </Button>
          </Card>
        </div>
      </div>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-signal-neg/10 text-signal-neg">
                  <LogOut className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-screamer text-xl text-ink uppercase tracking-wide">
                    Confirm Sign Out
                  </h3>
                  <p className="font-editorial text-xs text-ink-soft">
                    Session termination confirmation
                  </p>
                </div>
              </div>

              <p className="font-editorial text-sm text-ink-soft mb-6">
                Are you sure you want to log out of your FinSight account? Any unsaved edits will be lost,
                and you will need your password to sign in again.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLogoutModal(false)}
                  className="font-editorial font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    setShowLogoutModal(false);
                    await logout();
                  }}
                  className="font-editorial font-semibold cursor-pointer"
                >
                  Yes, Log Out
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
