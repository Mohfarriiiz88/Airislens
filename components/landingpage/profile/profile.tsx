"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

type UserRole = "superadmin" | "admin" | "user" | null;

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "********",
  });

  const [initial, setInitial] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [modal, setModal] = useState<{
    type: "save" | "logout" | null;
  }>({ type: null });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 🔥 FIX UTAMA: FETCH DATA TERBARU
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store", // 🔥 penting agar tidak cache
        });

        const data = await res.json();

        if (res.ok) {
          const user = data.user;

          setUserRole(user.role ?? null);

          setForm({
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            password: "********",
          });

          setInitial({
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
          });
        }
      } catch (err) {
        console.error("FETCH USER ERROR:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchUser();
  }, []);

  const isChanged =
    form.name !== initial.name ||
    form.email !== initial.email ||
    form.phone !== initial.phone;
  const dashboardHref =
    userRole === "superadmin"
      ? "/superadmin/dashboard"
      : userRole === "admin"
        ? "/admin/dashboard"
        : null;

  // ================= ACTION =================
  const handleSave = () => {
    if (!form.name || !form.email) {
      alert("Name dan email wajib diisi");
      return;
    }

    setModal({ type: "save" });
  };

  const handleLogout = () => {
    setModal({ type: "logout" });
  };

  const confirmAction = async () => {
    if (modal.type === "save") {
      try {
        setLoading(true);

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Gagal update profile");
          return;
        }

        alert("Profile berhasil diupdate");

        // 🔥 update state agar tidak kembali ke data lama
        setInitial({
          name: form.name,
          email: form.email,
          phone: form.phone,
        });

        router.refresh();
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
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

  // 🔥 LOADING (tidak merusak desain)
  if (fetching) {
    return (
      <section
        data-navbar-tone="dark"
        className="min-h-screen mt-10 bg-white px-6 md:px-20 py-16 font-[NeueHaas] text-black flex items-center justify-center"
      >
        Loading profile...
      </section>
    );
  }

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen mt-10 bg-white px-6 md:px-20 py-16 font-[NeueHaas] text-black"
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
            disabled={!isChanged || loading}
            className="bg-black text-white px-6 py-3 rounded-md text-[16px] hover:bg-black/80 transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className="border border-black bg-white text-black px-6 py-3 rounded-md text-[16px] hover:bg-black hover:text-white transition"
            >
              {userRole === "superadmin" ? "Superadmin Dashboard" : "Admin Dashboard"}
            </Link>
          ) : null}

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
            <h2 className="text-[20px] mb-3">
              {modal.type === "save" ? "Save Changes?" : "Logout?"}
            </h2>

            <p className="text-[16px] mb-6">
              {modal.type === "save"
                ? "Are you sure you want to update your profile?"
                : "Are you sure you want to logout?"}
            </p>

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
