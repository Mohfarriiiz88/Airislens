export type AdminBookingStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export type BookingLifecycleStatus =
  | "AwaitingPayment"
  | "Scheduled"
  | "AwaitingCustomerConfirmation"
  | "Completed"
  | "Cancelled";

export type AdminBooking = {
  id: number;
  orderId: string;
  photographerUserId: number;
  customerUserId: number | null;
  categoryId: number | null;
  packageId: number | null;
  customerName: string;
  customerPhone: string;
  packageName: string;
  amount: number;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string | null;
  location: string;
  eventAddress: string | null;
  eventLatitude: number | null;
  eventLongitude: number | null;
  distanceKm: number;
  transportFee: number;
  packagePrice: number | null;
  serviceFeeRate: number;
  serviceFee: number;
  totalPrice: number | null;
  note: string;
  status: AdminBookingStatus;
  lifecycleStatus: BookingLifecycleStatus;
  lifecycleStatusLabel: string;
  serviceCompletedAt: string | null;
  customerConfirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type BookingDashboardSnapshot = {
  totalBookings: number;
  todayBookings: number;
  monthBookings: number;
  totalRevenue: number;
  statusBreakdown: Record<BookingLifecycleStatus, number>;
  recentBookings: AdminBooking[];
  upcomingBookings: AdminBooking[];
};

export type UserBookingHistoryItem = {
  id: number;
  orderId: string;
  photographerName: string;
  categoryId: number | null;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string | null;
  amount: number;
  location: string;
  eventAddress: string | null;
  distanceKm: number;
  transportFee: number;
  packagePrice: number | null;
  serviceFeeRate: number;
  serviceFee: number;
  totalPrice: number | null;
  status: AdminBookingStatus;
  lifecycleStatus: BookingLifecycleStatus;
  lifecycleStatusLabel: string;
  serviceCompletedAt: string | null;
  customerConfirmedAt: string | null;
  canCancelBooking: boolean;
  canConfirmCompletion: boolean;
  canRequestRefund: boolean;
  refundRequestStatus: string | null;
};

export type BookingCalendarItem = {
  id: number;
  orderId: string;
  customerName: string;
  packageName: string;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string | null;
  location: string;
  status: AdminBookingStatus;
  lifecycleStatus: BookingLifecycleStatus;
  lifecycleStatusLabel: string;
};

export function getBookingLifecycleStatus(input: {
  status: AdminBookingStatus;
  customerConfirmedAt?: string | null;
}) {
  if (input.status === "Cancelled") {
    return "Cancelled" satisfies BookingLifecycleStatus;
  }

  if (input.status === "Completed") {
    return input.customerConfirmedAt
      ? ("Completed" satisfies BookingLifecycleStatus)
      : ("AwaitingCustomerConfirmation" satisfies BookingLifecycleStatus);
  }

  if (input.status === "Confirmed") {
    return "Scheduled" satisfies BookingLifecycleStatus;
  }

  return "AwaitingPayment" satisfies BookingLifecycleStatus;
}

export function getBookingLifecycleLabel(status: BookingLifecycleStatus) {
  const labels: Record<BookingLifecycleStatus, string> = {
    AwaitingPayment: "Menunggu Pembayaran",
    Scheduled: "Dijadwalkan",
    AwaitingCustomerConfirmation: "Menunggu Konfirmasi Customer",
    Completed: "Selesai",
    Cancelled: "Dibatalkan",
  };

  return labels[status];
}
