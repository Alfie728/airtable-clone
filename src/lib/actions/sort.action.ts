"use server";

import { db } from "~/server/db";
import { viewSorts } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export interface SortPreference {
  id: string;
  columnId: string;
  direction: "asc" | "desc";
  order: number;
}

export interface SortResponse {
  success: boolean;
  error?: string;
  sorts?: SortPreference[];
}

export async function updateViewSort(
  viewId: string,
  sorts: { columnId: string; direction: "asc" | "desc" }[],
): Promise<SortResponse> {
  try {
    // Delete existing sorts
    await db.delete(viewSorts).where(eq(viewSorts.viewId, viewId));

    // Insert new sorts
    if (sorts.length > 0) {
      const newSorts = await db
        .insert(viewSorts)
        .values(
          sorts.map((sort, index) => ({
            viewId,
            columnId: sort.columnId,
            direction: sort.direction,
            order: index,
          })),
        )
        .returning();

      return {
        success: true,
        sorts: newSorts.map((sort) => ({
          id: sort.id,
          columnId: sort.columnId,
          direction: sort.direction,
          order: sort.order,
        })),
      };
    }

    return { success: true, sorts: [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update view sorts",
    };
  }
}

export async function getViewSorts(viewId: string): Promise<SortResponse> {
  try {
    const sorts = await db
      .select()
      .from(viewSorts)
      .where(eq(viewSorts.viewId, viewId))
      .orderBy(viewSorts.order);

    return {
      success: true,
      sorts: sorts.map((sort) => ({
        id: sort.id,
        columnId: sort.columnId,
        direction: sort.direction,
        order: sort.order,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get view sorts",
    };
  }
}
