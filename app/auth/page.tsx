"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { startLogin, signInWithCode, tfaSignIn } from "@/lib/telegram"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState<"phone" | "code" | "2fa">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tempToken, setTempToken] = useState("")

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await startLogin(phoneNumber)

      if (response.success && response.tempToken) {
        setTempToken(response.tempToken)
        setStep("code")
      } else {
        setError(response.error || "Failed to send verification code")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await signInWithCode(tempToken, phoneNumber, code)

      if (response.success) {
        router.push("/chats")
        router.refresh()
      } else if (response.needs2FA) {
        setStep("2fa")
      } else {
        setError(response.error || "Invalid code")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await tfaSignIn(tempToken, password)

      if (response.success) {
        router.push("/chats")
        router.refresh()
      } else {
        setError(response.error || "Invalid 2FA password")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-900">
      <Card className="w-full max-w-md bg-gray-800 text-gray-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-400">K'Telegram </CardTitle>
          <CardDescription className="text-gray-400">
            {step === "phone"
              ? "Enter your phone number to receive a verification code"
              : step === "code"
                ? "Enter the verification code sent to your phone"
                : "Enter your 2FA password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
                <p className="text-xs text-gray-400">Include country code (e.g. +1 for US)</p>
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? "Sending Code..." : "Send Code"}
              </Button>
            </form>
          ) : step === "code" ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-300">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  2FA Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {step !== "phone" && (
            <Button variant="link" onClick={() => setStep("phone")} className="text-purple-400">
              Change phone number
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

