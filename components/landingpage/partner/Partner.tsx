"use client";

import { useState } from "react";

export default function Partner() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    category: "",
    experience: "",
    portfolio: "",
    about: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);

    // Validate all fields
    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.location ||
      !form.category ||
      !form.experience ||
      !form.portfolio ||
      !form.about
    ) {
      setMessage({
        type: "error",
        text: "Semua field harus diisi.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/partner-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          category: form.category,
          experience: form.experience,
          portfolioLink: form.portfolio,
          aboutYou: form.about,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim pengajuan.");
      }

      setMessage({
        type: "success",
        text: data.message,
      });

      // Reset form
      setForm({
        name: "",
        email: "",
        phone: "",
        location: "",
        category: "",
        experience: "",
        portfolio: "",
        about: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan yang tidak diketahui.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 md:px-20 py-16 font-[NeueHaas] text-black"
    >
      {/* ================= HEADER ================= */}
      <div className="max-w-2xl mt-10 mb-14">
        <h1 className="text-[24px] md:text-[40px] leading-tight mb-4">
          Become a Photographer Partner
        </h1>

        <p className="text-[18px] md:text-[20px] leading-relaxed">
          Join our platform and showcase your work to a wider audience. Fill in
          the details below to start your journey with us.
        </p>
      </div>

      {/* ================= FORM ================= */}
      <div className="grid md:grid-cols-2 gap-12">
        {/* LEFT */}
        <div className="space-y-6">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(v) => update("name", v)}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => update("email", v)}
          />
          <Input
            label="WhatsApp Number"
            value={form.phone}
            onChange={(v) => update("phone", v)}
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(v) => update("location", v)}
          />

          <Select
            label="Category"
            value={form.category}
            options={["Wedding", "Prewedding", "Event", "Product", "Graduation"]}
            onChange={(v) => update("category", v)}
          />

          <Input
            label="Experience"
            placeholder="e.g. 2 years"
            value={form.experience}
            onChange={(v) => update("experience", v)}
          />

          <Input
            label="Portfolio Link"
            value={form.portfolio}
            onChange={(v) => update("portfolio", v)}
          />

          <Textarea
            label="About You"
            value={form.about}
            onChange={(v) => update("about", v)}
          />

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-md text-[16px] ${
                message.type === "success"
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded-md text-[16px] hover:bg-black/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Mengirim..." : "Submit Application"}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="border border-black/10 p-8 rounded-md h-fit">
          <h2 className="text-[20px] mb-4">Why Join Us?</h2>

          <ul className="space-y-3 text-[16px]">
            <li>• Get discovered by more clients</li>
            <li>• Showcase your portfolio professionally</li>
            <li>• Manage bookings easily</li>
            <li>• Build your personal brand</li>
          </ul>

          <div className="mt-8">
            <p className="text-[16px] leading-relaxed">
              We carefully select photographers to maintain quality and trust.
              Once approved, your profile will be visible to potential clients.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= COMPONENT ================= */

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md min-h-[120px] focus:outline-none focus:border-black"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:border-black"
      >
        <option value="">Select category</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
