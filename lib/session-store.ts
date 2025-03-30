// In-memory session store (for development purposes)
interface SessionData {
  sessionString: string
  expiresAt?: Date
}

class SessionStore {
  private sessions: Map<string, SessionData> = new Map()

  async setSessionString(sessionToken: string, sessionString: string, ttl?: number): Promise<void> {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : undefined
    this.sessions.set(sessionToken, { sessionString, expiresAt })
  }

  async getSessionString(sessionToken: string): Promise<string | null> {
    // console.log(" sessionToken heree", sessionToken)
    const session = this.sessions.get(sessionToken)
    // console.log("what the ", session)
    if (session && (!session.expiresAt || session.expiresAt > new Date())) {
      return session.sessionString
    }
    return null
  }

  async deleteSession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken)
  }
}

// Singleton instance
const sessionStore = new SessionStore()
export default sessionStore

