import {
  getBookingLifecycleLabel,
  type BookingLifecycleStatus,
} from "@/lib/bookings.shared";

type AnalyticsPlaceholderProps = {
  statusBreakdown: Record<BookingLifecycleStatus, number>;
};

const STATUS_ORDER: BookingLifecycleStatus[] = [
  "AwaitingPayment",
  "Scheduled",
  "AwaitingCustomerConfirmation",
  "Completed",
  "Cancelled",
];

const STATUS_COLORS: Record<BookingLifecycleStatus, string> = {
  AwaitingPayment: "bg-yellow-400",
  Scheduled: "bg-blue-400",
  AwaitingCustomerConfirmation: "bg-amber-500",
  Completed: "bg-green-500",
  Cancelled: "bg-red-400",
};

export default function AnalyticsPlaceholder({
  statusBreakdown,
}: AnalyticsPlaceholderProps) {
  const total = STATUS_ORDER.reduce(
    (sum, status) => sum + (statusBreakdown[status] || 0),
    0
  );

  return (
    <div className="lg:col-span-2 rounded-2xl bg-[#ffffff] border border-black/20 p-5 h-[260px]">
      <div className="text-18px font-medium text-black mb-4">
        Booking Analytics
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-[180px] text-black/40 text-sm">
          Belum ada data booking untuk ditampilkan.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {STATUS_ORDER.map((status) => (
              <div
                key={status}
                className="rounded-xl border border-black/10 p-4"
              >
                <div className="text-sm text-black/60">
                  {getBookingLifecycleLabel(status)}
                </div>
                <div className="mt-1 text-2xl font-medium text-black">
                  {statusBreakdown[status] || 0}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {STATUS_ORDER.map((status) => {
              const count = statusBreakdown[status] || 0;
              const percentage = total === 0 ? 0 : (count / total) * 100;

              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs text-black/60">
                    <span>{getBookingLifecycleLabel(status)}</span>
                    <span>{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[status]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
