"use client";

import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");

  const passwordRequirements = [
    "Use uppercase and lowercase letters",
    "Must not match your email",
    "Minimum 8 characters",
    "Include numbers and symbols",
  ];

  return (
    <div className="min-h-screen flex bg-[#f5f5f5] p-[10px]">

      {/* ================= LEFT IMAGE ================= */}
      <div className="w-1/2 hidden lg:block">
        <div className="relative w-full h-full">
          <Image
            src="/svg/izza.svg"
            alt="hero"
            fill
            className="object-cover"
            priority
          />

          {/* TEXT OVERLAY */}
          <div className="absolute bottom-10 left-10 text-white">
            <h1 className="text-4xl font-medium leading-tight">
              Handpicked <br />
              Photographers Just <br />
              For You
            </h1>
          </div>
        </div>
      </div>

      {/* ================= RIGHT FORM ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center">

        <div className="w-full max-w-md">

          {/* TAB SWITCH */}
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

          {/* FORM */}
          <div className="space-y-6">

            {/* EMAIL */}
            <div>
              <label className="text-sm text-gray-700 block mb-2">
                Email Id
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none"
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

              <input
                type="password"
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            {/* REQUIREMENTS */}
            <div className="space-y-2">
              {passwordRequirements.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <span>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* BUTTON */}
            <button className="w-full bg-black text-white py-3 rounded-md mt-4">
              Next
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}