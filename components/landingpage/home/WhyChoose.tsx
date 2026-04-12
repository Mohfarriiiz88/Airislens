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
                Why Choose Airis?
              </p>

              <h2 className="text-[28px] md:text-[40px] text-black leading-tight">
                Trusted Platform For<br />
                Perfect Moments
              </h2>
            </div>

            {/* PARAGRAPH */}
            <p className="text-[16px] md:text-[24px] text-black max-w-full md:max-w-[600px] leading-relaxed">
              Iris is designed to connect you with carefully selected, high-quality photographers you can trust. With seamless booking, transparent pricing, and verified professionals, we make it easier for you to capture every moment with confidence and peace of mind.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
