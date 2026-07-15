import DetailFg from "@/components/landingpage/findfg/Detailfg";
import Navbar from "@/components/ui/navbar/Navbar";
import { getServerSession } from "@/lib/auth/session";
import { getPublicPartnerDetailBySlug } from "@/lib/partner-cms";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession();
  const partner = await getPublicPartnerDetailBySlug(slug);

  if (!partner) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <DetailFg partner={partner} isAuthenticated={Boolean(session)} />
    </>
  );
}
