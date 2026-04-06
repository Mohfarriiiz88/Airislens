import Hero from "@/components/landingpage/home/Hero";
import FGSection from "@/components/landingpage/home/FGSection";
import WhyChoose from "@/components/landingpage/home/WhyChoose";
import PacketSection from "@/components/landingpage/home/PacketSection";
import AirisGuide from "@/components/landingpage/home/AirisGuide";
import StyleSection from "@/components/landingpage/home/StyleSection";
// import FeaturesSection from '@/components/landingpage/home/FeaturesSection';
// import StatsSection from '@/components/landingpage/home/StatsSection';
// import CTASection from '@/components/landingpage/home/CTASection';
// import GuideSection from '@/components/landingpage/home/GuideSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FGSection />
      <WhyChoose />
      <PacketSection />
      <AirisGuide />
      <StyleSection />
      {/* <FeaturesSection />
      <StatsSection />
      <CTASection />
      <GuideSection /> */}
    </>
  );
}