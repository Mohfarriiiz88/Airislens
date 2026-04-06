import Image from "next/image";
import PacketItem from "@/components/ui/PacketItem";

export default function PacketSection() {
  return (
    <section className="py-20 bg-white">
      
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
              Choise Your Packet
            </h2>

            {/* DESC */}
            <p className="text-[16px] md:text-[24px] text-black mb-4 md:mb-8 leading-relaxed">
              Which photography style best suits your story, helping you capture unforgettable moments with the perfect visual touch and artistic direction?
            </p>

            {/* TRUST TEXT */}
            <p className="text-[16px] md:text-[24px] text-black mb-6 md:mb-8">
              Trusted professionals for your meaningful moments
            </p>

            {/* LIST */}
            <div className="text-black border-t border-black">
              <PacketItem title="Wedding Photography" />
              <PacketItem title="Prewedding" />
              <PacketItem title="Event" />
              <PacketItem title="Product" />
              <PacketItem title="Graduation" />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}