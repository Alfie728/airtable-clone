import "dotenv/config";
import { db } from "./index";
import {
  users,
  userSettings,
  bases,
  tables,
  columns,
  rows,
  cells,
  views,
  columnTypeEnum,
} from "./schema";
import { sql } from "drizzle-orm";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";

async function seedBase(baseId: string) {
  // Create a table
  const [table] = await db
    .insert(tables)
    .values({
      name: faker.helpers.arrayElement([
        "Tasks",
        "Projects",
        "Milestones",
        "Issues",
        "Sprints",
      ]),
      description: faker.lorem.sentence(),
      baseId,
      rowCount: 5,
    })
    .returning();

  if (!table) throw new Error("Failed to create table");

  // Create columns
  const columnData = [
    { name: "Task Name", type: "text" as const, order: 1 },
    { name: "Status", type: "text" as const, order: 2 },
    { name: "Priority", type: "text" as const, order: 3 },
    { name: "Due Date", type: "text" as const, order: 4 },
    { name: "Notes", type: "text" as const, order: 5 },
  ];

  const createdColumns = await Promise.all(
    columnData.map(async (col) => {
      const [column] = await db
        .insert(columns)
        .values({
          name: col.name,
          type: col.type,
          tableId: table.id,
          order: col.order,
          width: faker.number.int({ min: 150, max: 300 }),
          isSearchable: true,
          isSortable: true,
          isVisible: true,
        })
        .returning();
      if (!column) throw new Error(`Failed to create column ${col.name}`);
      return column;
    }),
  );

  // Create rows
  const createdRows = await Promise.all(
    Array.from({ length: 5 }, async (_, index) => {
      const [row] = await db
        .insert(rows)
        .values({
          tableId: table.id,
          order: index + 1,
        })
        .returning();
      if (!row) throw new Error(`Failed to create row ${index + 1}`);
      return row;
    }),
  );

  // Generate cell data
  await Promise.all(
    createdRows.map(async (row) => {
      const cellsData = [
        {
          value: faker.company.catchPhrase(),
          columnId: createdColumns[0]?.id,
        },
        {
          value: faker.helpers.arrayElement([
            "Not Started",
            "In Progress",
            "In Review",
            "Done",
            "Blocked",
          ]),
          columnId: createdColumns[1]?.id,
        },
        {
          value: faker.helpers.arrayElement([
            "Low",
            "Medium",
            "High",
            "Critical",
          ]),
          columnId: createdColumns[2]?.id,
        },
        {
          value: faker.date.future().toISOString().split("T")[0],
          columnId: createdColumns[3]?.id,
        },
        {
          value: faker.lorem.sentence(),
          columnId: createdColumns[4]?.id,
        },
      ].filter(
        (cell): cell is { value: string; columnId: string } =>
          typeof cell.value === "string" && typeof cell.columnId === "string",
      );

      await Promise.all(
        cellsData.map(async (cell) => {
          await db.insert(cells).values({
            value: cell.value,
            displayValue: cell.value,
            rowId: row.id,
            columnId: cell.columnId,
            searchVector: sql`to_tsvector(${cell.value})`,
          });
        }),
      );
    }),
  );

  // Create a default view
  await db.insert(views).values({
    name: faker.helpers.arrayElement([
      "Default View",
      "Kanban View",
      "Calendar View",
      "List View",
    ]),
    description: faker.lorem.sentence(),
    tableId: table.id,
    isDefault: true,
    columnsOrder: createdColumns.map((col) => col.id),
    hiddenColumns: [],
    rowsPerPage: faker.number.int({ min: 50, max: 200 }),
  });

  return table;
}

async function seed(baseId?: string) {
  console.log("🌱 Seeding database...");

  try {
    if (baseId) {
      // Check if base exists
      const existingBase = await db
        .select()
        .from(bases)
        .where(eq(bases.id, baseId))
        .limit(1);
      if (!existingBase.length) {
        throw new Error(`Base with ID ${baseId} not found`);
      }

      await seedBase(baseId);
      console.log(`✅ Seeded base ${baseId} with new data!`);
      return;
    }

    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: faker.internet.email(),
      })
      .returning();

    if (!user) throw new Error("Failed to create user");

    // Create user settings
    await db.insert(userSettings).values({
      userId: user.id,
      theme: faker.helpers.arrayElement(["light", "dark"]),
      defaultRowsPerPage: faker.number.int({ min: 50, max: 200 }),
      preferences: {},
    });

    // Create a base
    const [base] = await db
      .insert(bases)
      .values({
        name: faker.helpers.arrayElement([
          "Project Management",
          "Marketing Campaigns",
          "Product Development",
          "Customer Support",
          "Sales Pipeline",
        ]),
        description: faker.lorem.sentence(),
        userId: user.id,
      })
      .returning();

    if (!base) throw new Error("Failed to create base");

    await seedBase(base.id);
    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("Error in seed function:", error);
    throw error;
  }
}

// Get baseId from command line arguments
const baseId = process.argv[2];

// Execute the seed function
seed(baseId).catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
