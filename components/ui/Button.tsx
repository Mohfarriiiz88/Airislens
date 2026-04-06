"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-black text-white px-6 py-2 rounded-full text-[16px] font-medium hover:opacity-80 transition"
    >
      {children}
    </button>
  );
}