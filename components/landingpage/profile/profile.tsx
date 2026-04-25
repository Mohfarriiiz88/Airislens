"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

type ProfileProps = {
  initialUser: {
    name: string;
    email: string;
  };
};

export default function Profile({ initialUser }: ProfileProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: initialUser.name,
    email: initialUser.email,
    phone: "",
    password: "********",
  });

  const [modal, setModal] = useState<{
    type: "save" | "logout" | null;
  }>({ type: null });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ================= ACTION =================
  const handleSave = () => {
    setModal({ type: "save" });
  };

  const handleLogout = () => {
    setModal({ type: "logout" });
  };

  const confirmAction = async () => {
    if (modal.type === "save") {
      console.log("UPDATED DATA:", form);
    }

    if (modal.type === "logout") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
        });
      } finally {
        router.push("/");
        router.refresh();
      }
    }

    setModal({ type: null });
  };

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 md:px-20 py-16 font-[NeueHaas] text-black"
    >
      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-[24px] md:text-[40px] mb-2">
          Profile Settings
        </h1>
        <p className="text-[18px] md:text-[20px]">
          Manage your personal information
        </p>
      </div>

      {/* FORM */}
      <div className="max-w-2xl space-y-6">
        <EditableField
          label="Full Name"
          value={form.name}
          onChange={(v) => update("name", v)}
        />

        <EditableField
          label="Email"
          value={form.email}
          onChange={(v) => update("email", v)}
        />

        <EditableField
          label="Phone Number"
          value={form.phone}
          onChange={(v) => update("phone", v)}
        />

        <EditableField
          label="Password"
          value={form.password}
          type="password"
          onChange={(v) => update("password", v)}
        />

        {/* BUTTON */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            className="bg-black text-white px-6 py-3 rounded-md text-[16px] hover:bg-black/80 transition"
          >
            Save Changes
          </button>

          <button
            onClick={handleLogout}
            className="border border-black text-black px-6 py-3 rounded-md text-[16px] hover:bg-black hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {modal.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-lg w-[90%] max-w-sm text-center">

            {/* TITLE */}
            <h2 className="text-[20px] mb-3">
              {modal.type === "save" ? "Save Changes?" : "Logout?"}
            </h2>

            {/* DESC */}
            <p className="text-[16px] mb-6">
              {modal.type === "save"
                ? "Are you sure you want to update your profile?"
                : "Are you sure you want to logout?"}
            </p>

            {/* ACTION */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setModal({ type: null })}
                className="px-5 py-2 border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={confirmAction}
                className="px-5 py-2 bg-black text-white rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ================= COMPONENT ================= */

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}) {
  return (
    <div>
      <p className="text-[14px] mb-2">{label}</p>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 px-4 py-3 pr-10 rounded-md focus:outline-none focus:border-black"
        />

        <Pencil
          size={18}
          strokeWidth={1.5}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    </div>
  );
}