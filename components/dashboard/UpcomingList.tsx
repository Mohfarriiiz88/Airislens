import { type AdminBooking } from "@/lib/bookings.shared";
import { formatBookingTimeWindow } from "@/lib/booking-time";

type UpcomingListProps = {
  bookings: AdminBooking[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));
}

export default function UpcomingList({ bookings }: UpcomingListProps) {
  return (
    <div className="rounded-2xl bg-[#ffffff] border border-black/20 p-5">
      <div className="text-18px font-medium mb-4">Upcoming Schedule</div>

      {bookings.length === 0 ? (
        <p className="text-sm text-black/50">Belum ada jadwal booking.</p>
      ) : (
        <ul className="space-y-3 text-sm text-black">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="border-b border-black/10 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="font-medium">
                {formatBookingTimeWindow(
                  booking.bookingTime,
                  booking.bookingEndTime
                )}{" "}
                - {booking.packageName}
              </div>
              <div className="text-black/60">
                {formatDate(booking.bookingDate)} -{" "}
                {booking.location || "Lokasi belum diisi"}
              </div>
              <div className="text-black/50">{booking.customerName}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
