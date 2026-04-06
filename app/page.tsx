import Navbar from "@/components/ui/navbar/Navbar";
import Hero from "@/components/landingpage/home/Hero";
import FGSection from "@/components/landingpage/home/FGSection";
import WhyChoose from "@/components/landingpage/home/WhyChoose";
import PacketSection from "@/components/landingpage/home/PacketSection";
import AirisGuide from "@/components/landingpage/home/AirisGuide";
import StyleSection from "@/components/landingpage/home/StyleSection";
import Footer from "@/components/ui/footer/Footer";

// next sections (kita build bertahap)
// import PhotographerPreview from "@/components/landingpage/home/PhotographerPreview";
// import ValueSection from "@/components/landingpage/home/ValueSection";
// import CTASection from "@/components/landingpage/home/CTASection";
// import Footer from "@/components/ui/footer/Footer";

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-black text-white">

      {/* GLOBAL NAV */}
      <Navbar />

      {/* HERO */}
      <Hero />
      <FGSection />
      <WhyChoose />
      <PacketSection />
      <AirisGuide />
      <StyleSection />

      <Footer />


    </main>
  );
}