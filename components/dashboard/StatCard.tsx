export default function StatCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-[#ffffff] border border-black/20 p-5">
      <div className="text-medium text-18px text-black">{title}</div>
      <div className="mt-2 text-2xl font-medium">{value}</div>
    </div>
  )
}