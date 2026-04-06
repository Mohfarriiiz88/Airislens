"use client";

interface PacketItemProps {
  title: string;
  onClick?: () => void;
}

export default function PacketItem({ title, onClick }: PacketItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center py-4 border-b border-black cursor-pointer group"
    >
      <span className="text-[24px] text-black">
        {title}
      </span>

      {/* Arrow */}
      <span className="text-[20px] transition group-hover:translate-x-1">
        ↗
      </span>
    </div>
  );
}