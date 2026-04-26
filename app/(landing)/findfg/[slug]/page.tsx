import DetailFg from "@/components/landingpage/findfg/Detailfg";
import Navbar from "@/components/ui/navbar/Navbar";
import { getPublicPartnerDetailBySlug } from "@/lib/partner-cms";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPublicPartnerDetailBySlug(slug);

  if (!partner) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <DetailFg partner={partner} />
    </>
  );
}
