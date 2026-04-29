import Image from "next/image";
import Link from "next/link";

type PartnerGalleryItem = {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
};

type PartnerPackage = {
  id: number;
  name: string;
  duration: string;
  price: number;
  description: string;
};

type PartnerDetail = {
  id: number;
  slug: string;
  brandName: string;
  description: string;
  specializations: string[];
  address: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profilePhotoUrl: string;
  gallery: PartnerGalleryItem[];
  packages: PartnerPackage[];
};

function normalizeWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default function DetailFg({
  partner,
}: {
  partner: PartnerDetail;
}) {
  const heroImage = partner.profilePhotoUrl || partner.gallery[0]?.imageUrl || "/svg/fg1.svg";
  const portfolioImages =
    partner.gallery.length > 0
      ? partner.gallery.slice(0, 3)
      : [
          { id: 1, title: "Preview 1", category: "Portfolio", imageUrl: "/images/2.JPG" },
          { id: 2, title: "Preview 2", category: "Portfolio", imageUrl: "/images/3.JPG" },
          { id: 3, title: "Preview 3", category: "Portfolio", imageUrl: "/images/4.JPG" },
        ];
  const whatsappUrl = normalizeWhatsappUrl(partner.whatsapp);

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 py-10 font-[NeueHaas] md:px-20"
    >
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative mb-4 h-[400px] w-full overflow-hidden rounded-[24px] bg-[#f3f3f3]">
            <Image
              src={heroImage}
              alt={partner.brandName}
              fill
              className="object-cover"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {portfolioImages.map((item) => (
              <div key={item.id} className="relative h-[200px] w-full overflow-hidden rounded-2xl">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-start">
          <h1 className="mb-4 text-[24px] font-normal text-black md:text-[40px]">
            {partner.brandName}
          </h1>

          <p className="mb-6 text-[20px] leading-relaxed text-black">
            {partner.description || "Partner ini belum menambahkan deskripsi profil."}
          </p>

          <div className="mb-6">
            <p className="mb-2 text-[20px] font-normal text-black">Specializations</p>
            <ul className="space-y-1 text-[20px] text-black">
              {partner.specializations.length > 0 ? (
                partner.specializations.map((item) => <li key={item}>- {item}</li>)
              ) : (
                <li>- Belum ada spesialisasi</li>
              )}
            </ul>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-[20px] font-normal text-black">Location</p>
            <p className="text-[20px] text-black">
              {partner.address || "Alamat partner belum diisi."}
            </p>
          </div>

          <div className="mb-6 grid gap-3 text-sm text-black/70 md:grid-cols-2">
            {partner.instagram && <p>Instagram: {partner.instagram}</p>}
            {partner.tiktok && <p>TikTok: {partner.tiktok}</p>}
            {partner.facebook && <p>Facebook: {partner.facebook}</p>}
            {partner.website && <p>Website: {partner.website}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
           <Link href={`/bookingform?fg=${partner.userId}`}>
              <button className="rounded-md bg-black px-10 py-2 text-[18px] text-white">
                Booking
              </button>
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                className="inline-flex items-center rounded-md bg-black px-10 py-2 text-[18px] text-white"
              >
                Whatsapp Us
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20 grid items-start gap-12 md:grid-cols-2">
        <h2 className="text-[40px] font-normal text-black">
          Service <br /> Packages
        </h2>

        <p className="text-[20px] text-black">
          Pilih paket layanan yang disediakan partner ini. Semua paket di bawah
          berasal langsung dari dashboard partner.
        </p>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {partner.packages.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h3 className="mb-2 text-[20px] font-normal text-black">{item.name}</h3>
            <p className="mb-1 text-xl font-normal text-black">
              IDR {item.price.toLocaleString("id-ID")}
            </p>
            <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
              {item.duration}
            </p>
            <p className="mb-6 text-[20px] text-black">
              {item.description || "Deskripsi paket belum diisi."}
            </p>

            <button className="w-full rounded-md bg-black py-2 text-[18px] text-white">
              Choose Package
            </button>
          </div>
        ))}
      </div>

      {partner.packages.length === 0 && (
        <div className="py-16 text-center text-black/40">
          Partner ini belum menambahkan paket layanan.
        </div>
      )}
    </section>
  );
}
