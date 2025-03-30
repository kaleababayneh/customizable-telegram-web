"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Send, LogOut, Menu, Phone, Video, Info } from "lucide-react"
import { userProfile, getDialogs, getMessages, sendMessage, logout } from "@/lib/telegram"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface Dialog {
  id: string
  name: string
  entity: {
    id: string
    username?: string
    firstName?: string
    lastName?: string
    title?: string
  }
  unreadCount: number
  date: Date
  message?: {
    text: string
    date: Date
  }
}

interface Message {
  id: string
  text: string
  date: Date
  out: boolean
  fromId?: string
}

export default function ChatClient() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [selectedChatData, setSelectedChatData] = useState<Dialog | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
     const fetchUserAndDialogs = async () => {
        {
         const userResponse = await userProfile()
         if (userResponse.error) {
           console.error(userResponse.error)
           router.push("/auth")
           return
       }
      

         setUser(userResponse.data)

         const dialogsResponse = await getDialogs(12)

         const formattedDialogs = dialogsResponse.data.map((dialog: any) => {
          console.log("dialoggg",dialog)
          const entity = dialog.entity;
          return {
            id: dialog.id.toString(),
            name:
              entity.title ||
              (entity.firstName && entity.lastName)
                ? `${entity.firstName} ${entity.lastName}`
                : entity.firstName || entity.username || "Unknown",
            entity: {
              id: entity.id,
              firstName: entity.firstName,
              lastName: entity.lastName,
              username: entity.username,
              title: entity.title,
            },
            unreadCount: dialog.unreadCount,
            date: new Date(dialog.date * 1000).toISOString(),
            message: dialog.message
              ? {
                  text: dialog.message.message || "",
                  date: new Date(dialog.message.date * 1000).toISOString(),
                }
              : undefined,
          };
        });


          setDialogs(formattedDialogs)
          setLoading(false)
      }
     }

     fetchUserAndDialogs()
   }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleChatSelect = async (chatId: string) => {
    setSelectedChat(chatId)
    setIsMobileMenuOpen(false)
    setLoadingMessages(true)

    const chat = dialogs.find((dialog) => dialog.id === chatId)
    if (chat) {
      setSelectedChatData(chat)
    }

    try {
      const messagesResponse = await getMessages(chatId, 50)
      if (messagesResponse.error) {
        console.error(messagesResponse.error)
        setLoadingMessages(false)
        return
      }

      const formattedMessages = (messagesResponse.data ?? [])
        .filter((msg: any) => msg.message) // Filter out messages without text
        .map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message,
          date: new Date(msg.date * 1000),
          out: msg.out,
          fromId: msg.fromId?.toString(),
        }))

      setMessages(formattedMessages)
      setLoadingMessages(false)
    } catch (error) {
      console.error("Failed to fetch messages:", error)
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !selectedChat) return

    // Optimistically add message to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text: newMessage,
      date: new Date(),
      out: true,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")

    try {
      const response = await sendMessage(selectedChat, newMessage)
      if (response.error) {
        console.error(response.error)
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
        return
      }

      // Update the dialog list with the new message
      setDialogs((prev) =>
        prev.map((dialog) =>
          dialog.id === selectedChat
            ? {
                ...dialog,
                message: {
                  text: newMessage,
                  date: new Date(),
                },
                date: new Date(),
              }
            : dialog,
        ),
      )
    } catch (error) {
      console.error("Failed to send message:", error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/auth")
      router.refresh()
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  const filteredDialogs = dialogs; //.filter((dialog) => dialog.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const formatMessageDate = (date: Date) => {
    return format(date, "HH:mm")
  }

  const formatDialogDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date >= today) {
      return format(date, "HH:mm")
    } else if (date >= yesterday) {
      return "Yesterday"
    } else {
      return format(date, "dd.MM.yy")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-300">
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[80%] bg-gray-800 text-gray-100 border-gray-700">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h1 className="text-xl font-bold text-purple-400">K'Telegram</h1>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-300">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search chats"
                  className="pl-8 bg-gray-700 border-gray-600 text-gray-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-gray-700" />
                        <Skeleton className="h-3 w-40 bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDialogs.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-gray-400">No chats found</p>
                </div>
              ) : (
                filteredDialogs.map((dialog) => (
                  <div
                    key={dialog.id}
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-700 ${
                      selectedChat === dialog.id ? "bg-gray-700" : ""
                    }`}
                    onClick={() => handleChatSelect(dialog.id)}
                  >
                    <Avatar className="border-gray-600">
                      <AvatarFallback className="bg-purple-900 text-purple-100">
                        {getInitials(dialog.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{dialog.name}</h3>
                        <span className="text-xs text-gray-400">
                          {dialog.date ? formatDialogDate(dialog.date) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{dialog.message?.text || ""}</p>
                    </div>
                    {dialog.unreadCount > 0 && (
                      <div className="bg-purple-600 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                        {dialog.unreadCount}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <h2 className="font-medium text-purple-400">{selectedChatData ? selectedChatData.name : "K'Telegram"}</h2>

        {selectedChatData && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-gray-300">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-300">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className=" md:flex w-80 flex-col bg-gray-800 border-r border-gray-700" >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-400">K'Telegram</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-300">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search chats"
              className="pl-8 bg-gray-700 border-gray-600 text-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-gray-700" />
                    <Skeleton className="h-3 w-40 bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDialogs.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-400">No chats found</p>
            </div>
          ) : (
            filteredDialogs.map((dialog) => (
              <div
                key={dialog.id}
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-700 ${
                  selectedChat === dialog.id ? "bg-gray-700" : ""
                }`}
                onClick={() => handleChatSelect(dialog.id)}
              >
                <Avatar className="border-gray-600">
                  <AvatarFallback className="bg-purple-900 text-purple-100">{getInitials(dialog.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">{dialog.name}</h3>
                    <span className="text-xs text-gray-400">{dialog.date ? formatDialogDate(dialog.date) : ""}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{dialog.message?.text || ""}</p>
                </div>
                {dialog.unreadCount > 0 && (
                  <div className="bg-purple-600 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                    {dialog.unreadCount}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex flex-col flex-1 pt-14 md:pt-0">
        {selectedChat ? (
          <>
            <div className="hidden md:flex p-4 border-b border-gray-700 items-center gap-3">
              <Avatar className="border-gray-600">
                <AvatarFallback className="bg-purple-900 text-purple-100">
                  {selectedChatData ? getInitials(selectedChatData.name) : ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-medium">{selectedChatData?.name}</h2>
                <p className="text-xs text-gray-400">last seen recently</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-300">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-300">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-300">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
              {loadingMessages ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                      <Skeleton className={`h-10 w-48 rounded-lg ${i % 2 === 0 ? "bg-gray-700" : "bg-purple-900"}`} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-400">No messages yet</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.out ? "justify-end" : "justify-start"}`}>
                    <div
                      className={cn(
                        "max-w-xs md:max-w-md p-3 rounded-lg",
                        message.out ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-100",
                      )}
                    >
                      <p className="break-words">{message.text}</p>
                      <p className={cn("text-xs mt-1 text-right", message.out ? "text-purple-200" : "text-gray-400")}>
                        {formatMessageDate(message.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2">
              <Input
                placeholder="Type a message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-gray-700 border-gray-600 text-gray-100"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-xl font-medium mb-2 text-purple-400">Welcome to K'Telegram </h2>
            <p className="text-gray-400">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}

