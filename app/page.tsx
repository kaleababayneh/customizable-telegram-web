import { redirect } from "next/navigation"
import { authorize } from "@/lib/telegram"

export default async function Home() {
  const isAuthorized = await authorize()

  if (isAuthorized) {
    redirect("/chats")
  } else {
    redirect("/auth")
  }

  return null
}

