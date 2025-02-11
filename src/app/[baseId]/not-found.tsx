import { HomeTopNavigation } from "~/components/layout/TopNavigation";
import Link from "next/link";

export default function BaseNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeTopNavigation />
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Base not found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The base you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              ← Go back home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
