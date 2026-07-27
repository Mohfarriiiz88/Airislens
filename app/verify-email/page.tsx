import VerifyEmailPageClient from "@/app/verify-email/VerifyEmailPageClient";

function readToken(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;

  return <VerifyEmailPageClient token={readToken(params.token)} />;
}
