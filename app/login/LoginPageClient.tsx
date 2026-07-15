"use client";

import Image from "next/image";
import { Eye, EyeClosed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type AuthTab = "login" | "register";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export default function LoginPageClient() {
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
  const [showPassword, setShowPassword] = useState(false);

  const nextPath = getSafeNextPath(searchParams.get("next"));

  function getRedirectPath(role?: string) {
    if (role === "superadmin") {
      return nextPath || "/superadmin/dashboard";
    }

    if (role === "admin") {
      if (nextPath?.startsWith("/superadmin")) {
        return "/admin/dashboard";
      }

      return nextPath || "/admin/dashboard";
    }

    if (nextPath?.startsWith("/admin") || nextPath?.startsWith("/superadmin")) {
      return "/";
    }

    return nextPath || "/";
  }

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
        activeTab === "login" ? "/api/auth/login" : "/api/auth/register";

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
    <div className="min-h-screen flex bg-[#f5f5f5] p-[8px] text-black">
      <div className="w-1/2 hidden lg:block">
        <div className="relative h-full w-full">
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

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex rounded-lg bg-gray-200 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`w-1/2 rounded-md py-2 text-sm transition ${
                activeTab === "login"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`w-1/2 rounded-md py-2 text-sm transition ${
                activeTab === "register"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-6">
            {activeTab === "register" && (
              <div>
                <label className="mb-2 block text-sm text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-gray-700">
                Email Id
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <div className="mb-2 flex justify-between">
                <label className="text-sm text-gray-700">Password</label>
                <span className="cursor-pointer text-xs text-gray-400">
                  Forgot Password
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-black placeholder:text-gray-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <Eye /> : <EyeClosed />}
                </button>
              </div>
            </div>

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

            {message && (
              <div
                className={`text-sm ${
                  isError ? "text-red-500" : "text-green-600"
                }`}
              >
                {message}
              </div>
            )}

            {activeTab === "register" && (
              <p className="text-xs text-gray-500">
                Register membuat akun dengan role default user.
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || (activeTab === "register" && !isPasswordValid)}
              className="mt-4 w-full rounded-md bg-black py-3 text-white disabled:opacity-70"
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
      <span>{valid ? "OK" : "O"}</span>
      <span>{children}</span>
    </div>
  );
}
