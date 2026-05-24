import AdminBookingPopup from '@/components/dashboard/AdminBookingPopup'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import NotificationBootstrap from '@/components/dashboard/NotificationBootstrap'
import { getServerSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-black flex">
      <AdminBookingPopup />
      <NotificationBootstrap />
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
