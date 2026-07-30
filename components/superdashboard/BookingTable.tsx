export default function BookingTable() {
  return (
    <div className="rounded-2xl bg-[#ffffff] border border-black/20 p-5">
      <div className="text-18px font-medium mb-4">Booking Terbaru</div>

      <table className="w-full text-normal">
        <thead className="text-black font-medium">
          <tr className="">
            <th className="text-left py-2 font-medium">Nama</th>
            <th className="font-medium">Paket</th>
            <th className="font-medium">Tanggal</th>
            <th className="font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-black">
          <tr className="border-t border-black/20">
            <td className="py-2">Andi</td>
            <td className="text-center">Portrait</td>
            <td className="text-center">12 Mar</td>
            <td className="text-center">Menunggu Pembayaran</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
