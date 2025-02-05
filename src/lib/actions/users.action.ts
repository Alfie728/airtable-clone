"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { users, bases } from "~/server/db/schema";

interface Base {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date | null;
}

interface User {
  id: string;
  clerkId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date | null;
}

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

export const getUserBasesById = async (
  userId: string,
): Promise<
  { success: true; bases: Base[] } | { success: false; error: string }
> => {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const userBases = await db
      .select()
      .from(bases)
      .where(eq(bases.userId, userId))
      .orderBy(desc(bases.createdAt));

    return { success: true, bases: userBases };
  } catch (error) {
    console.error("Error fetching user bases:", error);
    return { success: false, error: "Failed to fetch user bases" };
  }
};

export const getUserWithBasesByClerkId = async (
  clerkId: string,
): Promise<
  | { success: true; user: User; bases: Base[] }
  | { success: false; error: string }
> => {
  try {
    const userResult = await getUserByClerkId(clerkId);

    if (!userResult.success || !userResult.user) {
      return { success: false, error: userResult.error ?? "User not found" };
    }

    const basesResult = await getUserBasesById(userResult.user.id);

    if (!basesResult.success) {
      return basesResult;
    }

    return {
      success: true,
      user: userResult.user,
      bases: basesResult.bases,
    };
  } catch (error) {
    console.error("Error fetching user with bases:", error);
    return { success: false, error: "Failed to fetch user with bases" };
  }
};
