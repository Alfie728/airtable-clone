import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your bases
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto max-w-md",
            card: "shadow-lg rounded-lg",
          },
        }}
      />
    </div>
  );
}
