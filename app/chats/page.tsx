import { redirect } from "next/navigation"
import { authorize } from "@/lib/telegram"
import ChatClient from "./chat-client"

export default async function ChatsPage() {
  const isAuthorized = await authorize()
  return <ChatClient />
}

