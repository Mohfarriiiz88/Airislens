import FindFg from "@/components/landingpage/findfg/Findfg";
import Footer from "@/components/ui/footer/Footer";
import Navbar from "@/components/ui/navbar/Navbar";
import { listPublicPartners } from "@/lib/partner-cms";

export default async function FindFgPage() {
  const partners = await listPublicPartners();

  return (
    <>
      <Navbar />
      <FindFg photographers={partners} />
      <Footer />
    </>
  );
}
