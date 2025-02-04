"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "~/server/db";
import { bases } from "~/server/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { Base } from "~/types/base";

const createBaseSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

export async function createBase(input: z.infer<typeof createBaseSchema>) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const parsedInput = createBaseSchema.parse(input);

    const [base] = await db
      .insert(bases)
      .values({
        name: parsedInput.name,
        description: parsedInput.description,
        userId,
      })
      .returning();

    revalidatePath("/");
    return base;
  } catch (error) {
    console.error("Failed to create base:", error);
    throw error;
  }
}

export async function getUserBases(): Promise<Base[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const userBases = await db
      .select()
      .from(bases)
      .where(eq(bases.userId, userId))
      .orderBy(bases.createdAt);

    return userBases;
  } catch (error) {
    console.error("Failed to fetch user bases:", error);
    throw error;
  }
}
