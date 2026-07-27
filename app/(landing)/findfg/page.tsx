import FindFg from "@/components/landingpage/findfg/Findfg";
import Footer from "@/components/ui/footer/Footer";
import Navbar from "@/components/ui/navbar/Navbar";
import { listPublicPartners } from "@/lib/partner-cms";

export const dynamic = "force-dynamic";

export default async function FindFgPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const partners = await listPublicPartners();
  const params = await searchParams;
  const initialCategorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;

  return (
    <>
      <Navbar />
      <FindFg
        key={`findfg-${initialCategorySlug ?? "all"}`}
        photographers={partners}
        initialCategorySlug={initialCategorySlug ?? null}
      />
      <Footer />
    </>
  );
}
