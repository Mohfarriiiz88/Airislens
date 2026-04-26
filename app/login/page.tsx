"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye,EyeClosed } from "lucide-react";

type AuthTab = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // 🔥 NEW STATE
  const [showPassword, setShowPassword] = useState(false);

  const nextPath = searchParams.get("next") || "/admin/dashboard";

  function getRedirectPath(role?: string) {
    if (role === "superadmin") {
      return nextPath.startsWith("/superadmin")
        ? nextPath
        : "/superadmin/dashboard";
    }

    if (role === "admin") {
      return nextPath.startsWith("/admin") ? nextPath : "/admin/dashboard";
    }

    return "/";
  }

  // 🔥 PASSWORD VALIDATION
  function getPasswordChecks(password: string, email: string) {
    return {
      length: password.length >= 8,
      upperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      numberSymbol:
        /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password),
      notEmail: email ? password !== email : true,
    };
  }

  const checks = getPasswordChecks(form.password, form.email);

  const isPasswordValid =
    checks.length &&
    checks.upperLower &&
    checks.numberSymbol &&
    checks.notEmail;

  async function handleSubmit() {
    setIsPending(true);
    setMessage("");
    setIsError(false);

    try {
      const endpoint =
        activeTab === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Request gagal diproses.");
        return;
      }

      setIsError(false);
      setMessage(
        data.message ??
          (activeTab === "login"
            ? "Login berhasil."
            : "Akun berhasil dibuat.")
      );

      const redirectPath = getRedirectPath(data.user?.role);

      router.push(redirectPath);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f5f5f5] p-[8px]">
      {/* LEFT IMAGE */}
      <div className="w-1/2 hidden lg:block">
        <div className="relative w-full h-full">
          <Image
            src="/svg/izza.svg"
            alt="hero"
            fill
            className="object-cover"
            priority
          />

          <div className="absolute bottom-10 left-10 text-white">
            <h1 className="text-4xl font-medium leading-tight">
              Handpicked <br />
              Photographers Just <br />
              For You
            </h1>
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* TAB */}
          <div className="flex bg-gray-200 rounded-lg p-1 mb-8">
            <button
              onClick={() => setActiveTab("login")}
              className={`w-1/2 py-2 text-sm rounded-md transition ${
                activeTab === "login"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              Login
            </button>

            <button
              onClick={() => setActiveTab("register")}
              className={`w-1/2 py-2 text-sm rounded-md transition ${
                activeTab === "register"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-6">
            {/* NAME */}
            {activeTab === "register" && (
              <div>
                <label className="text-sm text-gray-700 block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm"
                />
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label className="text-sm text-gray-700 block mb-2">
                Email Id
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-700">
                  Password
                </label>
                <span className="text-xs text-gray-400 cursor-pointer">
                  Forgot Password
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-4 py-3 pr-10 text-sm"
                />

                {/* TOGGLE EYE */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <Eye /> : <EyeClosed />}
                </button>
              </div>
            </div>

            {/* PASSWORD REQUIREMENTS */}
            {activeTab === "register" && (
              <div className="space-y-2">
                <PasswordItem valid={checks.upperLower}>
                  Use uppercase and lowercase letters
                </PasswordItem>

                <PasswordItem valid={checks.notEmail}>
                  Must not match your email
                </PasswordItem>

                <PasswordItem valid={checks.length}>
                  Minimum 8 characters
                </PasswordItem>

                <PasswordItem valid={checks.numberSymbol}>
                  Include numbers and symbols
                </PasswordItem>
              </div>
            )}

            {/* MESSAGE */}
            {message && (
              <div
                className={`text-sm ${
                  isError ? "text-red-500" : "text-green-600"
                }`}
              >
                {message}
              </div>
            )}

            {/* INFO */}
            {activeTab === "register" && (
              <p className="text-xs text-gray-500">
                Register membuat akun dengan role default user.
              </p>
            )}

            {/* BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={
                isPending ||
                (activeTab === "register" && !isPasswordValid)
              }
              className="w-full bg-black text-white py-3 rounded-md mt-4 disabled:opacity-70"
            >
              {isPending
                ? "Processing..."
                : activeTab === "login"
                ? "Login"
                : "Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔥 COMPONENT CHECKLIST
function PasswordItem({
  valid,
  children,
}: {
  valid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        valid ? "text-green-600" : "text-gray-500"
      }`}
    >
      <span>{valid ? "✔" : "○"}</span>
      <span>{children}</span>
    </div>
  );
}