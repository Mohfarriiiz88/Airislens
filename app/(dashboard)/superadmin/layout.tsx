import Sidebar from '@/components/superdashboard/Sidebar'
import Header from '@/components/superdashboard/Header'
import { getServerSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'superadmin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}