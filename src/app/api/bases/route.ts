import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "~/server/db";
import { bases } from "~/server/db/schema";

const createBaseSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

type CreateBaseInput = z.infer<typeof createBaseSchema>;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = (await request.json()) as Partial<CreateBaseInput>;
    const body = createBaseSchema.parse(json);

    const [base] = await db
      .insert(bases)
      .values({
        name: body.name,
        description: body.description,
        userId,
      })
      .returning();

    return NextResponse.json(base);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
