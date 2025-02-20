"use server";

import { db } from "~/server/db";
import { viewFilters } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import type { FilterPreference } from "~/types/filter";

export async function updateViewFilter(
  viewId: string,
  filters: FilterPreference[],
) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // Delete existing filters
    await db.delete(viewFilters).where(eq(viewFilters.viewId, viewId));

    if (filters.length === 0) {
      return { success: true };
    }

    // Insert new filters
    const newFilters = await db
      .insert(viewFilters)
      .values(
        filters.map((filter) => ({
          viewId,
          columnId: filter.columnId,
          operator: filter.operator,
          value: filter.value,
          order: filter.order,
        })),
      )
      .returning();

    return { success: true, filters: newFilters };
  } catch (error) {
    console.error("Error updating view filters:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update filters",
    };
  }
}

export async function getViewFilters(viewId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const filters = await db
      .select()
      .from(viewFilters)
      .where(eq(viewFilters.viewId, viewId))
      .orderBy(viewFilters.order);

    return { success: true, filters };
  } catch (error) {
    console.error("Error getting view filters:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get filters",
    };
  }
}
