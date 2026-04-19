"use client";

import Image from "next/image";
import Link from "next/link";

export default function DetailFg() {
  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 md:px-20 py-10 font-[NeueHaas]"
    >
      {/* ================= TOP SECTION ================= */}
      <div className="grid md:grid-cols-2 gap-10 mt-14">
        {/* LEFT SIDE */}
        <div>
          {/* MAIN IMAGE / LOGO */}
          {/* MAIN IMAGE / LOGO */}
          <div className="relative w-full h-[400px] mb-4">
            <Image
              src="/svg/fg1.svg"
              alt="Beranjak Photo"
              fill
              className="object-cover"
            />
          </div>

          {/* PORTFOLIO */}
          <div className="grid grid-cols-3 gap-4">
            <div className="relative w-full h-[200px]">
              <Image
                src="/images/2.JPG"
                alt="Portfolio 1"
                fill
                className="object-cover"
              />
            </div>

            <div className="relative w-full h-[200px]">
              <Image
                src="/images/3.JPG"
                alt="Portfolio 2"
                fill
                className="object-cover"
              />
            </div>

            <div className="relative w-full h-[200px]">
              <Image
                src="/images/4.JPG"
                alt="Portfolio 3"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col justify-start">
          {/* TITLE */}
          <h1 className="text-black text-[24px] md:text-[40px] font-normal mb-4">
            Beranjak Photo
          </h1>

          {/* DESCRIPTION */}
          <p className="text-black text-[20px] leading-relaxed mb-6">
            Beranjak Photo is a professional photography team specializing in
            capturing moments through a visual storytelling approach. With a
            signature dark, moody, and minimalist style, every photo is crafted
            to highlight emotion and atmosphere, resulting in elegant and
            timeless imagery.
          </p>

          {/* SPECIALIZATION */}
          <div className="mb-6">
            <p className="text-black font-normal text-[20px] mb-2">
              Specializations
            </p>
            <ul className="text-[20px] text-black space-y-1">
              <li>• Prewedding & Wedding</li>
              <li>• Portrait & Personal Branding</li>
              <li>• Event Documentation</li>
              <li>• Fashion & Editorial</li>
            </ul>
          </div>

          {/* LOCATION */}
          <div className="mb-6">
            <p className="text-black font-normal text-[20px] mb-2">Location</p>
            <p className="text-[20px] text-black">
              Based in Tegal and surrounding areas (available for out-of-town
              sessions with additional cost adjustments).
            </p>
          </div>

          {/* BUTTON */}
          <div className="flex gap-4 mt-4">
            <Link href="/bookingform">
              <button className="bg-black text-white px-20 py-2 rounded-md text-[18px]">
                Booking
              </button>
            </Link>

            <a
              href="https://wa.me/6281802594808"
              target="_blank"
              className="bg-black text-white px-20 py-2 rounded-md text-[18px] inline-flex items-center"
            >
              Whatsapp Us
            </a>
          </div>
        </div>
      </div>

      {/* ================= SERVICE HEADER ================= */}
      <div className="mt-20 grid md:grid-cols-2 gap-100 items-start">
        <h2 className="text-black text-[40px] font-normal">
          Service <br /> Packages
        </h2>

        <p className="text-[20px] text-black left-10">
          We carefully select and recommend the best photographers to match your
          style, ensuring every moment you capture is nothing less than
          extraordinary.
        </p>
      </div>

      {/* ================= PACKAGE LIST ================= */}
      <div className="grid md:grid-cols-3 gap-8 mt-10">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition"
          >
            {/* TITLE */}
            <h3 className="text-black text-[20px] font-normal mb-2">
              Package {String.fromCharCode(64 + item)}
            </h3>

            {/* PRICE */}
            <p className="text-black text-xl font-normal mb-4">
              IDR{" "}
              {item === 1
                ? "5,000,000"
                : item === 2
                  ? "7,500,000"
                  : "0,000,000"}
            </p>

            {/* DESC */}
            <p className="text-[20px] text-black mb-6">
              Description of the package goes here with details of the service
              offered.
            </p>

            {/* BUTTON */}
            <button className="w-full bg-black text-white py-2 rounded-md text-[18px]">
              Choose Package
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
