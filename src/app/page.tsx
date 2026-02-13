import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login - login will then redirect to correct dashboard based on role
  redirect('/login')
}
