import { db } from "~/server/db";

export const dynamic = "force-dynamic";

import { TopNavigation } from "~/components/layout/TopNavigation";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { Sidebar } from "~/components/layout/Sidebar";
import { GridControls } from "~/components/grid/GridControls";
import { DataGrid } from "~/components/grid/DataGrid";

const mockData = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    date: "2023-05-01",
    status: "Active",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    date: "2023-05-02",
    status: "Inactive",
  },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob@example.com",
    date: "2023-05-03",
    status: "Active",
  },
  {
    id: 4,
    name: "Alice Brown",
    email: "alice@example.com",
    date: "2023-05-04",
    status: "Pending",
  },
  {
    id: 5,
    name: "Charlie Davis",
    email: "charlie@example.com",
    date: "2023-05-05",
    status: "Active",
  },
];

// const columns = [
//   { id: "name", label: "Name", width: 200 },
//   { id: "email", label: "Email", width: 250 },
//   { id: "date", label: "Date", width: 150 },
//   { id: "status", label: "Status", width: 150 },
// ];

export default async function Page() {
  const data = await db.query.posts.findMany();
  console.log(data);

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNavigation />
      <SecondaryNavigation />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1">
          <GridControls />
          <div className="p-4">
            <DataGrid data={mockData} />
          </div>
        </div>
      </div>
    </div>
  );
}
