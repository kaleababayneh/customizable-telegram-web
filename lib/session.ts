"use server"

import sessionStore from "./session-store"

export async function setSessionString(sessionToken: string, sessionString: string, ttl?: number): Promise<void> {
  await sessionStore.setSessionString(sessionToken, sessionString, ttl)
}

export async function getSessionString(sessionToken: string): Promise<string | null> {
  return sessionStore.getSessionString(sessionToken)
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await sessionStore.deleteSession(sessionToken)
}

