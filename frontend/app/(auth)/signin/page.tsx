import { SignInButton } from "@/components/auth/sign-in-button"

export default function SignInPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#f5f0e0] rounded-3xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-[32px] font-medium tracking-tight text-[#0a0a0a]">
            Welcome back
          </h1>
          <p className="text-base text-[#6a6a6a]">
            Sign in to your account to continue
          </p>
        </div>

        <SignInButton />

        <p className="text-xs text-center text-[#9a9a9a]">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
