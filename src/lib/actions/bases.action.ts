"use server";

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { bases, tables, columns } from "~/server/db/schema";
import { getUserByClerkId } from "./users.action";
import { revalidatePath } from "next/cache";

export const getUserBases = async (userId: string) => {
  const { success, user } = await getUserByClerkId(userId);
  if (!success || !user) {
    return { success: false, error: "User not found" };
  }

  try {
    const userBases = await db
      .select()
      .from(bases)
      .where(eq(bases.userId, user.id));

    return { success: true, bases: userBases };
  } catch (error) {
    console.error("Error getting user bases", error);
    return { success: false, error: "Failed to get user bases" };
  }
};

export async function createBase(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      throw new Error("Name is required");
    }

    // Get the current user
    const clerkId = formData.get("userId") as string;
    if (!clerkId) {
      throw new Error("User ID is required");
    }

    const { success, user, error } = await getUserByClerkId(clerkId);
    if (!success || !user) {
      throw new Error(error ?? "User not found");
    }

    // Create base with default table and columns
    const [newBase] = await db
      .insert(bases)
      .values({
        name,
        description,
        userId: user.id,
      })
      .returning();

    if (!newBase) {
      throw new Error("Failed to create base");
    }

    // Create default table
    const [newTable] = await db
      .insert(tables)
      .values({
        name: "Table 1",
        baseId: newBase.id,
        rowCount: 0,
      })
      .returning();

    if (!newTable) {
      throw new Error("Failed to create table");
    }

    // Create default columns
    await db.insert(columns).values([
      {
        name: "Name",
        type: "text",
        tableId: newTable.id,
        order: 1,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      },
      {
        name: "Notes",
        type: "text",
        tableId: newTable.id,
        order: 2,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      },
    ]);

    revalidatePath("/");
    return { baseId: newBase.id };
  } catch (error) {
    console.error("Error creating base:", error);
    throw error instanceof Error ? error : new Error("Failed to create base");
  }
}
