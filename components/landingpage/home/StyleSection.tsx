export default function StyleSection() {
  return (
    <section data-navbar-tone="dark" className="py-24 bg-white">
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        <div
          className="
          flex flex-col gap-10
          md:flex-row md:justify-between md:items-start
        "
        >
          {/* LEFT TITLE */}
          <h2 className="text-[28px] md:text-[40px] text-black leading-tight max-w-[400px]">
            Gaya Visual Terbaik
            <br />
            Dimulai Dari Sini
          </h2>

          {/* RIGHT TEXT */}
          <p className="text-[18px] md:text-[24px] text-black max-w-[600px] leading-relaxed">
            Menentukan gaya fotografi yang tepat bukan hanya soal tampilan,
            tetapi juga tentang bagaimana Anda ingin dikenang melalui setiap
            momen. Dengan gaya yang sesuai, setiap detail menjadi lebih
            bermakna, setiap emosi terasa lebih hidup, dan setiap foto mampu
            menceritakan kisah yang benar-benar mewakili Anda.
          </p>
        </div>
      </div>
    </section>
  );
}
