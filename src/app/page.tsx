import { redirect } from 'next/navigation'

export default function HomePage() {
  // TODO: Check user role from auth and redirect accordingly
  // For now, redirect all to admin dashboard
  redirect('/admin/dashboard')
}
