import { Suspense } from "react";

import LoginPageClient from "@/app/login/LoginPageClient";

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-sm text-black/60">
      Memuat halaman login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
