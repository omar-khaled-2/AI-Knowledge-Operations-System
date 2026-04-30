import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default function HomePage() {
  const sessionCookie = cookies().get("better-auth.session_token")

  if (sessionCookie?.value) {
    redirect("/app")
  } else {
    redirect("/signin")
  }
}
