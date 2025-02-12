"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "~/server/db";
import {
  users,
  bases,
  tables,
  views,
  columns,
  rows,
  cells,
} from "~/server/db/schema";
import { sql } from "drizzle-orm";
import { userSettings, auditLogs } from "~/server/db/schema";

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
    // First check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, user.clerkId))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: true, user: existingUser[0] };
    }

    // Check if email exists but with different clerkId
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    if (existingEmail.length > 0 && existingEmail[0]?.clerkId) {
      await deleteUser(existingEmail[0].clerkId);
    }

    // Create the new user
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: user.clerkId,
        email: user.email,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Create default user settings
    try {
      await db.insert(userSettings).values({
        userId: newUser.id,
        theme: "light",
        defaultRowsPerPage: 100,
        preferences: {},
      });
    } catch (error) {
      console.error("Failed to create user settings:", error);
      // Non-critical failure, continue
    }

    // Log the user creation
    try {
      await db.insert(auditLogs).values({
        userId: newUser.id,
        action: "CREATE_USER",
        entityType: "USER",
        entityId: newUser.id,
        metadata: { email: user.email },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Non-critical failure, continue
    }

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Failed to create user:", {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      user,
    });
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

export const deleteUser = async (clerkId: string) => {
  try {
    if (!clerkId) {
      return { success: false, error: "Clerk ID is required" };
    }

    // First verify the user exists and get their ID
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!userResult.length) {
      return { success: false, error: "User not found" };
    }

    const user = userResult[0];
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Execute cascading deletion using SQL
    await db.execute(sql`
      -- First, store the user ID
      WITH user_to_delete AS (
        SELECT id FROM "airtable-clone_users" 
        WHERE clerk_id = ${clerkId}
      )
      -- Delete cells
      DELETE FROM "airtable-clone_cells"
      WHERE column_id IN (
        SELECT c.id 
        FROM "airtable-clone_columns" c
        JOIN "airtable-clone_tables" t ON c.table_id = t.id
        JOIN "airtable-clone_base" b ON t.base_id = b.id
        WHERE b.user_id IN (SELECT id FROM user_to_delete)
      );
    `);

    await db.execute(sql`
      -- Delete rows
      DELETE FROM "airtable-clone_rows"
      WHERE table_id IN (
        SELECT t.id 
        FROM "airtable-clone_tables" t
        JOIN "airtable-clone_base" b ON t.base_id = b.id
        JOIN "airtable-clone_users" u ON b.user_id = u.id
        WHERE u.clerk_id = ${clerkId}
      );
    `);

    await db.execute(sql`
      -- Delete view sorts and filters
      DELETE FROM "airtable-clone_view_filters"
      WHERE view_id IN (
        SELECT v.id 
        FROM "airtable-clone_views" v
        JOIN "airtable-clone_tables" t ON v.table_id = t.id
        JOIN "airtable-clone_base" b ON t.base_id = b.id
        JOIN "airtable-clone_users" u ON b.user_id = u.id
        WHERE u.clerk_id = ${clerkId}
      );
    `);

    await db.execute(sql`
      -- Delete views
      DELETE FROM "airtable-clone_views"
      WHERE table_id IN (
        SELECT t.id 
        FROM "airtable-clone_tables" t
        JOIN "airtable-clone_base" b ON t.base_id = b.id
        JOIN "airtable-clone_users" u ON b.user_id = u.id
        WHERE u.clerk_id = ${clerkId}
      );
    `);

    await db.execute(sql`
      -- Delete columns
      DELETE FROM "airtable-clone_columns"
      WHERE table_id IN (
        SELECT t.id 
        FROM "airtable-clone_tables" t
        JOIN "airtable-clone_base" b ON t.base_id = b.id
        JOIN "airtable-clone_users" u ON b.user_id = u.id
        WHERE u.clerk_id = ${clerkId}
      );
    `);

    await db.execute(sql`
      -- Delete tables
      DELETE FROM "airtable-clone_tables"
      WHERE base_id IN (
        SELECT b.id 
        FROM "airtable-clone_base" b
        JOIN "airtable-clone_users" u ON b.user_id = u.id
        WHERE u.clerk_id = ${clerkId}
      );
    `);

    await db.execute(sql`
      -- Delete bases
      DELETE FROM "airtable-clone_base"
      WHERE user_id IN (
        SELECT id FROM "airtable-clone_users"
        WHERE clerk_id = ${clerkId}
      );
    `);

    // Delete user settings
    await db.execute(sql`
      DELETE FROM "airtable-clone_user_settings"
      WHERE user_id IN (
        SELECT id FROM "airtable-clone_users"
        WHERE clerk_id = ${clerkId}
      );
    `);

    try {
      // Log the deletion before actually deleting the user
      await db.insert(auditLogs).values({
        userId: user.id,
        action: "DELETE_USER",
        entityType: "USER",
        entityId: user.id,
        metadata: { clerkId },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Continue with deletion
    }

    // Finally delete the user
    await db.execute(sql`
      DELETE FROM "airtable-clone_users"
      WHERE clerk_id = ${clerkId};
    `);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      clerkId,
    });
    return { success: false, error: "Failed to delete user" };
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
