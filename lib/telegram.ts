"use server"
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { nanoid } from "nanoid"
import { getSessionString, setSessionString, deleteSession } from "./session"
import { cookies } from "next/headers"
import {parse, stringify} from 'flatted';
import { console } from "inspector"



const TELEGRAM_APP_ID = process.env.TELEGRAM_APP_ID 
const TELEGRAM_APP_HASH = process.env.TELEGRAM_APP_HASH 
const SESSION_STRING = process.env.SESSION_STRING

type AuthResponse = {
  success: boolean
  message?: string
  error?: string
  needs2FA?: boolean
  tempToken?: string
}

async function createClient(sessionString = ""): Promise<TelegramClient> {
  const session = new StringSession(sessionString)
  const client = new TelegramClient(session, TELEGRAM_APP_ID, TELEGRAM_APP_HASH, {
    connectionRetries: 5,
  })
  await client.connect()
  return client
}

export async function authorize(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return false;

  const sessionString = await getSessionString(sessionToken)
  if (!sessionString) return false

  const client = await createClient(sessionString)
  const isAuthorized = await client.checkAuthorization()
  await client.disconnect()
  return isAuthorized
}

export async function startLogin(phone: string): Promise<AuthResponse> {
  try {
    const client = await createClient()
    await client.sendCode({ apiHash: TELEGRAM_APP_HASH, apiId: TELEGRAM_APP_ID }, phone)

    const tempToken = nanoid()
    const sessionString = client.session.save()
    if (typeof sessionString !== "string") {
      throw new Error("Session string is not a string")
    }
    await setSessionString(tempToken, sessionString, 300) // 5-minute TTL

    return {
      success: true,
      message: "Login code sent to your Telegram app",
      tempToken,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send code",
    }
  }
}

export async function signInWithCode(tempToken: string, phone: string, code: string): Promise<AuthResponse> {
  try {
    const sessionString = await getSessionString(tempToken)
    if (!sessionString) {
      return { success: false, error: "Invalid or expired token" }
    }

    const client = await createClient(sessionString)
    await client.signInUser(
      { apiHash: TELEGRAM_APP_HASH, apiId: TELEGRAM_APP_ID },
      {
        phoneNumber: phone,
        phoneCode: async () => Promise.resolve(code),
        onError: async (err) => err !== null,
      },
    )
    const sessionToken = nanoid()
    const newSessionString = client.session.save()
    if (typeof newSessionString !== "string") {
      throw new Error("Session string is not a string")
    }
    await setSessionString(sessionToken, newSessionString)
    ;(await cookies()).set("session_token", sessionToken, {
      httpOnly: true,
      secure: true,
    })

    await client.disconnect()
    return { success: true, message: "Successfully signed in" }
  } catch (error) {
    if (error instanceof Error && error.message.includes("2FA")) {
      return {
        success: false,
        needs2FA: true,
        message: "Please enter your 2FA password",
        tempToken,
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign in",
    }
  }
}

export async function tfaSignIn(tempToken: string, password: string): Promise<AuthResponse> {
  try {
    const sessionString = await getSessionString(tempToken)
    if (!sessionString) {
      return { success: false, error: "Invalid or expired token" }
    }

    const client = await createClient(sessionString)
    await client.signInWithPassword(
      { apiHash: TELEGRAM_APP_HASH, apiId: TELEGRAM_APP_ID },
      {
        password: async () => Promise.resolve(password),
        onError: async (err) => err !== null,
      },
    )

    const sessionToken = nanoid()
    const newSessionString = client.session.save()
    if (typeof newSessionString !== "string") {
      throw new Error("Session string is not a string")
    }
    await setSessionString(sessionToken, newSessionString)
    ;(await cookies()).set("session_token", sessionToken, {
      httpOnly: true,
      secure: true,
    })

    await client.disconnect()
    return { success: true, message: "Successfully signed in" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign in",
    }
  }
}

export async function userProfile() {
  
  const sessionToken = (await cookies()).get("session_token")?.value
  console.log("sessionToken", sessionToken)
  if (!sessionToken) return { error: "Not authenticated" }

  // console.log("sessionToken", sessionToken)

  // await setSessionString(sessionToken, newSessionString)
  // ;(await cookies()).set("session_token", sessionToken, {
  //   httpOnly: true,
  //   secure: true,
  // })

  console.log("sessionToken", sessionToken);
  // setSessionString(sessionToken, sessionToken)
  // let sessionString = await getSessionString(sessionToken)

  // console.log("sessionString", sessionString)
   let sessionString = `${SESSION_STRING}`
  // console.log("sessionString", sessionString)
  //sessionString = JSON.parse(JSON.stringify(sessionString))
  if (!sessionString) return { error: "Session not found" }

  // console.log("sessionString xxx", sessionString)
  const client = await createClient(sessionString)

  console.log("clienttttttt", client)
  try {
    const me = await client.getMe()
    await client.disconnect()
    const mePlain = JSON.parse(JSON.stringify(me));
    return { data: mePlain };
  } catch (error) {
    await client.disconnect()
    return {
      error: error instanceof Error ? error.message : "Failed to get user profile",
    }
  }
}

export async function getDialogs(limit = 1) {
  // const sessionToken = (await cookies()).get("session_token")?.value
  // if (!sessionToken) return { error: "Not authenticated" }

  // const sessionString = await getSessionString(sessionToken)
  // if (!sessionString) return { error: "Session not found" }

  // const client = await createClient(sessionString)

  let sessionString = `${SESSION_STRING}`
  // console.log("sessionString", sessionString)
  // sessionString = JSON.parse(JSON.stringify(sessionString))
  if (!sessionString) return { error: "Session not found" }

  // console.log("sessionString xxx", sessionString)
  const client = await createClient(sessionString)


  try {
    const dialogs = await client.getDialogs({
      limit,
    })
    await client.disconnect()
    return { data:  parse(stringify(dialogs)) };
  } catch (error) {
    await client.disconnect()
    return {
      error: error instanceof Error ? error.message : "Failed to get dialogs",
    }
  }
}

export async function getMessages(chatId: string, limit = 30) {
  const sessionToken = (await cookies()).get("session_token")?.value
  if (!sessionToken) return { error: "Not authenticated" }

  const sessionString = await getSessionString(sessionToken)
  if (!sessionString) return { error: "Session not found" }

  const client = await createClient(sessionString)
  try {
    const messages = await client.getMessages(chatId, {
      limit,
    })
    await client.disconnect()
    return { data: messages }
  } catch (error) {
    await client.disconnect()
    return {
      error: error instanceof Error ? error.message : "Failed to get messages",
    }
  }
}

export async function sendMessage(chatId: string, message: string) {
  const sessionToken = (await cookies()).get("session_token")?.value
  if (!sessionToken) return { error: "Not authenticated" }

  const sessionString = await getSessionString(sessionToken)
  if (!sessionString) return { error: "Session not found" }

  const client = await createClient(sessionString)
  try {
    const result = await client.sendMessage(chatId, { message })
    await client.disconnect()
    return { data: result }
  } catch (error) {
    await client.disconnect()
    return {
      error: error instanceof Error ? error.message : "Failed to send message",
    }
  }
}

export async function logout() {
  const sessionToken = (await cookies()).get("session_token")?.value
  if (!sessionToken) return { success: true }

  try {
    await deleteSession(sessionToken)
    ;(await cookies()).delete("session_token")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to logout",
    }
  }
}

export async function messageUsers(message: string, usernames: string | string[]) {
  try {
    const sessionToken = (await cookies()).get("session_token")?.value
    if (!sessionToken) return { error: "Not authenticated" }

    const sessionString = await getSessionString(sessionToken)
    if (!sessionString) return { error: "Session not found" }

    const client = await createClient(sessionString)
    // Ensure message is not causing recursion issues
    // Limit message length if necessary
    const safeMessage =
      typeof message === "string"
        ? message.substring(0, 4000) // Limiting message length to prevent possible stack issues
        : String(message)
    const users = Array.isArray(usernames) ? usernames : [usernames]

    // Process usernames to ensure they're valid
    const safeUsers = users
      .filter((username) => typeof username === "string" && username.trim() !== "")
      .map((username) => username.trim())
      .slice(0, 100) // Limit the number of users to prevent possible issues

    if (safeUsers.length === 0) {
      return { error: "No valid usernames provided" }
    }

    const sentMessages = await Promise.all(
      safeUsers.map(async (username) => {
        try {
          const user = await client.getInputEntity(username)
          return client.sendMessage(user, { message: safeMessage })
        } catch (userError) {
          // Handle individual user errors without failing the entire batch
          console.error(`Failed to send message to ${username}:`, userError)
          return { error: `Failed to send to ${username}`, username }
        }
      }),
    )

    return { data: sentMessages }
  } catch (error) {
    console.error("Message users error:", error)
    return {
      error: error instanceof Error ? error.message : "Failed to send messages",
    }
  }
}

