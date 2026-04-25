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
    price: "",
    about: "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    console.log(form);
    alert("Application submitted");
  };

  return (
    <section data-navbar-tone="dark"
    className="min-h-screen bg-white px-6 md:px-20 py-16 font-[NeueHaas] text-black">

      {/* ================= HEADER ================= */}
      <div className="max-w-2xl mt-10 mb-14">
        <h1 className="text-[24px] md:text-[40px] leading-tight mb-4">
          Become a Photographer Partner
        </h1>

        <p className="text-[18px] md:text-[20px] leading-relaxed">
          Join our platform and showcase your work to a wider audience. 
          Fill in the details below to start your journey with us.
        </p>
      </div>

      {/* ================= FORM ================= */}
      <div className="grid md:grid-cols-2 gap-12">

        {/* LEFT */}
        <div className="space-y-6">

          <Input label="Full Name" onChange={(v) => update("name", v)} />
          <Input label="Email" onChange={(v) => update("email", v)} />
          <Input label="WhatsApp Number" onChange={(v) => update("phone", v)} />
          <Input label="Location" onChange={(v) => update("location", v)} />

          <Select
            label="Category"
            options={["Wedding", "Prewedding", "Event", "Product", "Graduation"]}
            onChange={(v) => update("category", v)}
          />

          <Input label="Experience" placeholder="e.g. 2 years" onChange={(v) => update("experience", v)} />

          <Input label="Portfolio Link" onChange={(v) => update("portfolio", v)} />

          <Textarea label="About You" onChange={(v) => update("about", v)} />

          <button
            onClick={handleSubmit}
            className="bg-black text-white px-6 py-3 rounded-md text-[16px] hover:bg-black/80 transition"
          >
            Submit Application
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
  onChange,
}: {
  label: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({
  label,
  onChange,
}: {
  label: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <textarea
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md min-h-[120px] focus:outline-none focus:border-black"
      />
    </div>
  );
}

function Select({
  label,
  options,
  onChange,
}: {
  label: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>
      <select
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:border-black"
      >
        <option value="">Select category</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}