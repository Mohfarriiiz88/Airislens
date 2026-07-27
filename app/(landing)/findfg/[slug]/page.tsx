import DetailFg from "@/components/landingpage/findfg/Detailfg";
import Navbar from "@/components/ui/navbar/Navbar";
import { getServerSession } from "@/lib/auth/session";
import { getPublicPartnerDetailBySlug } from "@/lib/partner-cms";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getServerSession();
  const partner = await getPublicPartnerDetailBySlug(slug);
  const initialCategorySlug = Array.isArray(query.category)
    ? query.category[0]
    : query.category;

  if (!partner) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <DetailFg
        key={`${partner.slug}:${initialCategorySlug ?? "default"}`}
        partner={partner}
        isAuthenticated={Boolean(session)}
        initialCategorySlug={initialCategorySlug ?? null}
      />
    </>
  );
}
