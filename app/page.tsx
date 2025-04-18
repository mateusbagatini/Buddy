import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="mb-4">
              <Image src="/logo.svg" alt="TaskFlow Logo" width={180} height={60} priority />
            </div>
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">Sign in to access your tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/login" className="w-full">
                <Button className="w-full" variant="default">
                  User Login
                </Button>
              </Link>
              <Link href="/admin/login" className="w-full">
                <Button className="w-full" variant="outline">
                  Admin Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
