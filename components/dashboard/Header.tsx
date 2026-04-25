export default function Header() {
  return (
    <header className="h-16 border-b border-black/20 bg-[#ffffff] backdrop-blur flex items-center justify-between px-6">
      <div>
        <div className="mt-1 text-[24px] text-black">Admin</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-black">BeranjakPhoto</div>
        <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-sm">
          A
        </div>
      </div>
    </header>
  )
}