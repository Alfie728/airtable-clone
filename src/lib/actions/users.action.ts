"use server";

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export const createUser = async (user: { clerkId: string; email: string }) => {
  try {
    // Check if user already exists
    const existingUser = await getUserByClerkId(user.clerkId);

    if (existingUser.success) {
      return existingUser;
    }

    await db.insert(users).values({
      clerkId: user.clerkId,
      email: user.email,
    });

    return {
      success: true,
      user: { clerkId: user.clerkId, email: user.email },
    };
  } catch (error) {
    console.error("Error creating user", error);
    return { success: false, error: "Failed to create user" };
  }
};

export const getUserByClerkId = async (clerkId: string) => {
  try {
    if (!clerkId) {
      return { success: false, error: "Clerk ID is required" };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user || user.length === 0) {
      return { success: false, error: "User not found" };
    }

    return { success: true, user: user[0] };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user" };
  }
};

export const updateUser = async (user: { clerkId: string; email: string }) => {
  try {
    if (!user.clerkId || !user.email) {
      return { success: false, error: "Clerk ID and email are required" };
    }

    const result = await db
      .update(users)
      .set({ email: user.email })
      .where(eq(users.clerkId, user.clerkId));

    if (!result) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: { clerkId: user.clerkId, email: user.email },
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
};
