import Image from "next/image";

interface FGCardProps {
  image: string;
  name: string;
}

export default function FGCard({ image, name }: FGCardProps) {
  return (
    <div className="relative w-[250px] h-[480px] overflow-hidden">
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover"
      />

      {/* Overlay Text */}
      <div className="absolute bottom-4 left-4">
        <h3 className="text-white text-[30px] leading-[1.1] font-normal">
          {name}
        </h3>
      </div>
    </div>
  );
}