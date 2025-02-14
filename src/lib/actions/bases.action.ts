"use server";

import { eq, inArray, desc } from "drizzle-orm";
import { db } from "~/server/db";
import {
  bases,
  tables,
  columns,
  viewFilters,
  views,
  rows,
  cells,
} from "~/server/db/schema";
import { getUserByClerkId } from "./users.action";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import type {
  SerializedBase,
  BaseResponse,
  BaseListResponse,
  BaseRenameResponse,
} from "~/types/base";

function serializeBase(base: typeof bases.$inferSelect): SerializedBase {
  return {
    ...base,
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt?.toISOString() ?? base.createdAt.toISOString(),
  };
}

export const getUserBases = async (userId: string) => {
  const { success, user } = await getUserByClerkId(userId);
  if (!success || !user) {
    return { success: false, error: "User not found" };
  }

  try {
    const userBases = await db
      .select()
      .from(bases)
      .where(eq(bases.userId, user.id))
      .orderBy(desc(bases.createdAt));

    const serializedBases = userBases.map(serializeBase);
    return { success: true, bases: serializedBases };
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
    const defaultTableId = crypto.randomUUID();
    const [newTable] = await db
      .insert(tables)
      .values({
        id: defaultTableId,
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
    return { baseId: newBase.id, defaultTableId: newTable.id };
  } catch (error) {
    console.error("Error creating base:", error);
    throw error instanceof Error ? error : new Error("Failed to create base");
  }
}

export async function getBaseById(baseId: string) {
  try {
    const [base] = await db
      .select()
      .from(bases)
      .where(eq(bases.id, baseId))
      .limit(1);

    return base ? serializeBase(base) : null;
  } catch (error) {
    console.error("Error getting base:", error);
    return null;
  }
}

export async function deleteBase(baseId: string) {
  try {
    // Delete in order of dependencies using raw SQL
    // First delete view filters
    await db.execute(sql`
      DELETE FROM "airtable-clone_view_filters"
      WHERE view_id IN (
        SELECT v.id 
        FROM "airtable-clone_views" v
        JOIN "airtable-clone_tables" t ON v.table_id = t.id
        WHERE t.base_id = ${baseId}
      );
    `);

    // Delete views
    await db.execute(sql`
      DELETE FROM "airtable-clone_views"
      WHERE table_id IN (
        SELECT id 
        FROM "airtable-clone_tables"
        WHERE base_id = ${baseId}
      );
    `);

    // Delete cells
    await db.execute(sql`
      DELETE FROM "airtable-clone_cells"
      WHERE row_id IN (
        SELECT r.id 
        FROM "airtable-clone_rows" r
        JOIN "airtable-clone_tables" t ON r.table_id = t.id
        WHERE t.base_id = ${baseId}
      );
    `);

    // Delete rows
    await db.execute(sql`
      DELETE FROM "airtable-clone_rows"
      WHERE table_id IN (
        SELECT id 
        FROM "airtable-clone_tables"
        WHERE base_id = ${baseId}
      );
    `);

    // Delete columns
    await db.execute(sql`
      DELETE FROM "airtable-clone_columns"
      WHERE table_id IN (
        SELECT id 
        FROM "airtable-clone_tables"
        WHERE base_id = ${baseId}
      );
    `);

    // Delete tables
    await db.execute(sql`
      DELETE FROM "airtable-clone_tables"
      WHERE base_id = ${baseId};
    `);

    // Finally delete the base
    const [deletedBase] = await db
      .delete(bases)
      .where(eq(bases.id, baseId))
      .returning();

    if (!deletedBase) {
      throw new Error("Base not found");
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting base:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete base",
    };
  }
}

export async function renameBase(
  baseId: string,
  newName: string,
): Promise<BaseRenameResponse> {
  try {
    const [updatedBase] = await db
      .update(bases)
      .set({ name: newName, updatedAt: new Date() })
      .where(eq(bases.id, baseId))
      .returning();

    if (!updatedBase) {
      throw new Error("Base not found");
    }

    revalidatePath("/");
    return { success: true, base: serializeBase(updatedBase) };
  } catch (error) {
    console.error("Error renaming base:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename base",
    };
  }
}
