import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { bases } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { baseId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const base = await db.query.bases.findFirst({
      where: eq(bases.id, params.baseId),
    });

    if (!base) {
      return new NextResponse("Base not found", { status: 404 });
    }

    if (base.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(base);
  } catch (error) {
    console.error("Error fetching base:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
