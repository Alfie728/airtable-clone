"use client";

import { HomeTopNavigation } from "~/components/layout/TopNavigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBase } from "~/lib/actions/bases.action";
import { useAuth } from "@clerk/nextjs";
import { Toaster, toast } from "sonner";

export default function NewBasePage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.append("userId", userId ?? "");

      const result = await createBase(formData);
      if (!result?.baseId) {
        throw new Error("Failed to create base");
      }

      toast.success("Base created successfully");
      router.push(`/${result.baseId}/tables/grid`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create base";
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeTopNavigation />
      <Toaster position="top-center" />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-12">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-2xl font-semibold leading-7 text-gray-900">
                Create a new base
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Get started with a new base to organize your data.
              </p>

              <form onSubmit={handleSubmit} className="mt-10 space-y-8">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Name
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        disabled={isLoading}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:leading-6"
                        placeholder="My new base"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Description
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        disabled={isLoading}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:leading-6"
                        placeholder="Optional description for your base"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-x-6">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => router.push("/")}
                    className="text-sm font-semibold leading-6 text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      "Create base"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
