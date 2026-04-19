import DetailFg from "@/components/landingpage/findfg/Detailfg";

import Navbar from "@/components/ui/navbar/Navbar";

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <>
      <Navbar />
      <DetailFg />
    </>
  );
}