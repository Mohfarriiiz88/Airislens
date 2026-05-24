import Link from "next/link";

import { type AdminBooking } from "@/lib/bookings";

type BookingTableProps = {
  bookings: AdminBooking[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));
}

export default function BookingTable({ bookings }: BookingTableProps) {
  return (
    <div className="rounded-2xl bg-[#ffffff] border border-black/20 p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-18px font-medium">Booking Terbaru</div>
        <Link
          href="/admin/bookinglist"
          className="text-sm text-black/60 hover:text-black transition"
        >
          Lihat semua
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead className="text-black font-medium">
          <tr>
            <th className="text-left py-2 font-medium">Nama</th>
            <th className="text-center font-medium">Paket</th>
            <th className="text-center font-medium">Tanggal</th>
            <th className="text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-black">
          {bookings.length === 0 ? (
            <tr className="border-t border-black/20">
              <td colSpan={4} className="py-6 text-center text-black/50">
                Belum ada booking masuk.
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr
                key={booking.id}
                className="border-t border-black/20"
              >
                <td className="py-3">{booking.customerName}</td>
                <td className="text-center">{booking.packageName}</td>
                <td className="text-center">
                  {formatDate(booking.bookingDate)}
                </td>
                <td className="text-center">{booking.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
