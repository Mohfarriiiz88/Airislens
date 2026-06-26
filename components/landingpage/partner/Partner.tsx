"use client";

import { useEffect, useState } from "react";

type IdentityForm = {
  name: string;
  email: string;
  phone: string;
};

type PartnerForm = {
  location: string;
  category: string;
  experience: string;
  portfolio: string;
  about: string;
};

const emptyPartnerForm: PartnerForm = {
  location: "",
  category: "",
  experience: "",
  portfolio: "",
  about: "",
};

export default function Partner() {
  const [identity, setIdentity] = useState<IdentityForm>({
    name: "",
    email: "",
    phone: "",
  });
  const [form, setForm] = useState<PartnerForm>(emptyPartnerForm);
  const [loading, setLoading] = useState(false);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil data akun.");
        }

        setIdentity({
          name: data.user?.name || "",
          email: data.user?.email || "",
          phone: data.user?.phone || "",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat mengambil data akun.",
        });
      } finally {
        setLoadingIdentity(false);
      }
    };

    fetchUser();
  }, []);

  const updateIdentity = (key: keyof IdentityForm, value: string) => {
    setIdentity((prev) => ({ ...prev, [key]: value }));
  };

  const updateForm = (key: keyof PartnerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);

    if (
      !identity.name ||
      !identity.email ||
      !identity.phone ||
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
          phone: identity.phone,
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
      setForm(emptyPartnerForm);
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
      className="min-h-screen bg-white px-6 py-16 font-[NeueHaas] text-black md:px-20"
    >
      <div className="mt-10 mb-14 max-w-2xl">
        <h1 className="mb-4 text-[24px] leading-tight md:text-[40px]">
          Become a Photographer Partner
        </h1>

        <p className="text-[18px] leading-relaxed md:text-[20px]">
          Join our platform and showcase your work to a wider audience. Fill in
          the details below to start your journey with us.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <Input
            label="Full Name"
            value={identity.name}
            onChange={(value) => updateIdentity("name", value)}
            readOnly
          />
          <Input
            label="Email"
            value={identity.email}
            onChange={(value) => updateIdentity("email", value)}
            readOnly
          />
          <Input
            label="WhatsApp Number"
            value={identity.phone}
            onChange={(value) => updateIdentity("phone", value)}
            placeholder="08xxxxxxxxxx"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(value) => updateForm("location", value)}
          />

          <Select
            label="Category"
            value={form.category}
            options={["Wedding", "Prewedding", "Event", "Product", "Graduation"]}
            onChange={(value) => updateForm("category", value)}
          />

          <Input
            label="Experience"
            placeholder="e.g. 2 years"
            value={form.experience}
            onChange={(value) => updateForm("experience", value)}
          />

          <Input
            label="Portfolio Link"
            value={form.portfolio}
            onChange={(value) => updateForm("portfolio", value)}
          />

          <Textarea
            label="About You"
            value={form.about}
            onChange={(value) => updateForm("about", value)}
          />

          {message && (
            <div
              className={`rounded-md border p-4 text-[16px] ${
                message.type === "success"
                  ? "border-green-300 bg-green-100 text-green-700"
                  : "border-red-300 bg-red-100 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || loadingIdentity}
            className="rounded-md bg-black px-6 py-3 text-[16px] text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingIdentity
              ? "Memuat akun..."
              : loading
                ? "Mengirim..."
                : "Submit Application"}
          </button>
        </div>

        <div className="h-fit rounded-md border border-black/10 p-8">
          <h2 className="mb-4 text-[20px]">Why Join Us?</h2>

          <ul className="space-y-3 text-[16px]">
            <li>Get discovered by more clients</li>
            <li>Showcase your portfolio professionally</li>
            <li>Manage bookings easily</li>
            <li>Build your personal brand</li>
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

function Input({
  label,
  placeholder,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border px-4 py-3 focus:outline-none ${
          readOnly
            ? "border-gray-200 bg-gray-100 text-black/70"
            : "border-gray-300 focus:border-black"
        }`}
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
        className="min-h-[120px] w-full rounded-md border border-gray-300 px-4 py-3 focus:border-black focus:outline-none"
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
        className="w-full rounded-md border border-gray-300 px-4 py-3 focus:border-black focus:outline-none"
      >
        <option value="">Select category</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
