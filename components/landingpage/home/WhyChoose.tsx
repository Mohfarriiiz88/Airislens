import Image from "next/image";

export default function WhyChoose() {
  return (
    <section data-navbar-tone="dark" className="py-20 bg-white">
      
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:items-center">
          
          {/* IMAGE (MOBILE FIRST) */}
          <div className="w-full h-[300px] relative md:w-[610px] md:h-[610px] order-1 md:order-2">
            <Image
              src="/svg/izza.svg"
              alt="why choose"
              fill
              className="object-cover"
            />
          </div>

          {/* TEXT */}
          <div className="flex flex-col gap-6 md:h-[610px] md:justify-between order-2 md:order-1">
            
            {/* TOP TEXT */}
            <div>
              <p className="text-[18px] md:text-[24px] text-black mb-2">
                Kenapa Memilih Airis?
              </p>

              <h2 className="text-[28px] md:text-[40px] text-black leading-tight">
                Platform Terpercaya Untuk<br />
                Momen Sempurna
              </h2>
            </div>

            {/* PARAGRAPH */}
            <p className="text-[16px] md:text-[24px] text-black max-w-full md:max-w-[600px] leading-relaxed">
              Airis dirancang untuk menghubungkan Anda dengan fotografer berkualitas yang telah dipilih secara cermat dan dapat dipercaya. Dengan proses pemesanan yang mudah, harga yang transparan, dan partner profesional terverifikasi, kami membantu Anda mengabadikan setiap momen dengan nyaman dan tenang.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
