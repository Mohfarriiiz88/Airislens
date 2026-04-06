import Image from "next/image";

export default function AirisGuide() {
  return (
    <section className="relative w-full h-[530px]">
      
      {/* BACKGROUND */}
      <Image
        src="/svg/bg.svg"
        alt="background"
        fill
        className="object-cover"
        priority
      />

      {/* CONTENT */}
      <div className="relative max-w-[1500px] mx-auto px-6 md:px-20 h-full flex items-center">
        
        <div className="w-full flex flex-col gap-8 md:flex-row md:justify-between md:items-center text-white">
          
          {/* LEFT TITLE */}
          <h2 className="text-[28px] md:text-[40px] leading-tight max-w-[400px]">
            Your Personal<br />
            Photography Guide<br />
            Anytime
          </h2>

          {/* RIGHT TEXT */}
          <p className="text-[18px] md:text-[24px] max-w-[600px] leading-relaxed text-white/90">
            Airis is here to help you find the perfect photographer effortlessly. From recommending the best matches to answering your questions instantly, Airis makes your experience faster, smarter, and more personal.
          </p>

        </div>

      </div>

    </section>
  );
}