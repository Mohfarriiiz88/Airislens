import Image from "next/image";
import PacketItem from "@/components/ui/PacketItem";

export default function PacketSection() {
  return (
    <section data-navbar-tone="dark" className="py-20 bg-white">
      
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:items-start">
          
          {/* IMAGE */}
          <div className="w-full h-[300px] relative md:w-[610px] md:h-[610px]">
            <Image
              src="/svg/paris.svg"
              alt="packet"
              fill
              className="object-cover"
            />
          </div>

          {/* CONTENT */}
          <div className="w-full max-w-full md:max-w-[600px]">
            
            {/* TITLE */}
            <h2 className="text-[28px] md:text-[40px] text-black mb-2">
              Pilih Paket Anda
            </h2>

            {/* DESC */}
            <p className="text-[16px] md:text-[24px] text-black mb-4 md:mb-8 leading-relaxed">
              Temukan layanan fotografi yang paling sesuai dengan cerita Anda, agar setiap momen penting dapat diabadikan dengan sentuhan visual dan arahan artistik yang tepat.
            </p>

            {/* TRUST TEXT */}
            <p className="text-[16px] md:text-[24px] text-black mb-6 md:mb-8">
              Profesional terpercaya untuk momen-momen penting Anda
            </p>

            {/* LIST */}
            <div className="text-black border-t border-black">
              <PacketItem title="Fotografi Pernikahan" />
              <PacketItem title="Prewedding" />
              <PacketItem title="Acara" />
              <PacketItem title="Produk" />
              <PacketItem title="Wisuda" />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
