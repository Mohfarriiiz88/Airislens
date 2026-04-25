import Profile from "@/components/landingpage/profile/profile";
import Footer from "@/components/ui/footer/Footer";
import Navbar from "@/components/ui/navbar/Navbar";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function FindFgPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <Profile
        initialUser={{
          name: session.name,
          email: session.email,
        }}
      />
      <Footer />
    </>
  );
}
