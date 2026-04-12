import FGCard from "@/components/ui/FGCard";
import Button from "@/components/ui/Button";

export default function FGSection() {
  return (
    <section data-navbar-tone="dark" className="py-20 bg-white">
      
      <div className="max-w-[1500px] mx-auto px-6 md:px-20">
        
        {/* TOP SECTION */}
        <div className="
          flex flex-col items-start text-left gap-6 mb-10
          md:flex-row md:justify-between md:items-start md:gap-0 md:mb-16
        ">
          
          {/* TITLE */}
          <h2 className="text-black text-[28px] md:text-[40px] font-normal leading-tight">
            Handpicked<br />Photographers Just<br />For You
          </h2>

          {/* TEXT */}
          <div className="max-w-[400px] md:max-w-[500px]">
            <p className="text-black text-[16px] md:text-[24px] mb-4 md:mb-6 leading-relaxed">
              We carefully select and recommend the best photographers to match your style, ensuring every moment you capture is nothing less than extraordinary.
            </p>

            <Button>Find</Button>
          </div>
        </div>

        {/* FG SCROLL */}
        <div className="
          flex gap-[20px] overflow-x-auto pb-4
          md:overflow-visible
        ">
          <div className="min-w-[250px] md:min-w-0">
            <FGCard image="/svg/fg1.svg" name="SwaraPhoto" />
          </div>
          <div className="min-w-[250px] md:min-w-0">
            <FGCard image="/svg/fg2.svg" name="Beranjak Photo" />
          </div>
          <div className="min-w-[250px] md:min-w-0">
            <FGCard image="/svg/fg3.svg" name="Rekam Cerita" />
          </div>
          <div className="min-w-[250px] md:min-w-0">
            <FGCard image="/svg/fg4.svg" name="Sae Wedding" />
          </div>
          <div className="min-w-[250px] md:min-w-0">
            <FGCard image="/svg/fg4.svg" name="Sae Wedding" />
          </div>
        </div>

      </div>
    </section>
  );
}
