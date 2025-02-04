import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
