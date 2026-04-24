export default function BookingTable() {
  return (
    <div className="rounded-2xl bg-[#ffffff] border border-black/5 p-5">
      <div className="text-sm font- mb-4">Booking Terbaru</div>

      <table className="w-full text-sm">
        <thead className="text-black text-light">
          <tr>
            <th className="text-left py-2">Nama</th>
            <th>Paket</th>
            <th>Tanggal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="text-black">
          <tr className="border-t border-black/5">
            <td className="py-2">Andi</td>
            <td className="text-center">Portrait</td>
            <td className="text-center">12 Mar</td>
            <td className="text-center">Pending</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}