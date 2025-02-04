// "use client"

// import { useState } from "react"
import {
  ChevronDown,
  Clock,
  Grid,
  Calendar,
  ImageIcon,
  Layout,
  List,
  TimerIcon as Timeline,
  Plus,
  Search,
  Eye,
  Filter,
  Group,
  SortAsc,
  Palette,
  Share2,
  Menu,
  HelpCircle,
  UserCircle,
  Settings,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/server/db";

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

const columns = [
  { id: "name", label: "Name", width: 200 },
  { id: "email", label: "Email", width: 250 },
  { id: "date", label: "Date", width: 150 },
  { id: "status", label: "Status", width: 150 },
];

export default async function Page() {
  const data = await db.query.posts.findMany();
  console.log(data);
  // const [data, setData] = useState(mockData)
  // const [selectedCell, setSelectedCell] = useState<{ rowId: number | null; colId: string | null }>({
  //   rowId: null,
  //   colId: null,
  // })
  // const [selectedView, setSelectedView] = useState("grid")

  // const handleCellClick = (rowId: number, colId: string) => {
  //   setSelectedCell({ rowId, colId })
  // }

  // const handleCellChange = (rowId: number, colId: string, value: string) => {
  //   const newData = data.map((row) => (row.id === rowId ? { ...row, [colId]: value } : row))
  //   setData(newData)
  // }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top Navigation */}
      <nav className="flex items-center border-b px-4 py-2">
        <div className="flex items-center gap-8">
          <Button variant="ghost" className="gap-2 font-semibold">
            First
            <ChevronDown className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <Button variant="ghost">Data</Button>
            <Button variant="ghost">Automations</Button>
            <Button variant="ghost">Interfaces</Button>
            <Button variant="ghost">Forms</Button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Clock className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="gap-2">
            Share
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <UserCircle className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="gap-2 font-semibold">
            Table 1
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="gap-2">
            <Plus className="h-4 w-4" />
            Add or import
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost">Extensions</Button>
          <Button variant="ghost" className="gap-2">
            Tools
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-60 border-r p-4">
          <div className="mb-4">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Eye className="h-4 w-4" />
              Views
            </Button>
          </div>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Find a view"
              className="h-8 bg-gray-50"
            />
          </div>
          {/* Views 
          <div className="space-y-1">
            <Button
              variant={selectedView === "grid" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setSelectedView("grid")}
            >
              <Grid className="h-4 w-4" />
              Grid view
            </Button>
          </div>
          */}
          <div className="mt-8">
            <div className="mb-2 text-sm font-medium text-gray-500">
              Create...
            </div>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Grid className="h-4 w-4" />
                Grid
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <ImageIcon className="h-4 w-4" />
                Gallery
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" />
                Kanban
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Timeline className="h-4 w-4" />
                Timeline
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <List className="h-4 w-4" />
                List
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* View Controls */}
          <div className="flex items-center border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="gap-2">
                Grid view
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost">Hide fields</Button>
              <Button variant="ghost" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="ghost" className="gap-2">
                <Group className="h-4 w-4" />
                Group
              </Button>
              <Button variant="ghost" className="gap-2">
                <SortAsc className="h-4 w-4" />
                Sort
              </Button>
              <Button variant="ghost" className="gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Button>
              <Button variant="ghost">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share and sync
              </Button>
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="p-4">
            <div className="rounded border">
              {/* Header */}
              <div className="grid grid-cols-5 border-b bg-gray-50 text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2 border-r p-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Name
                  <ChevronDown className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 border-r p-2">
                  Notes
                  <ChevronDown className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 border-r p-2">
                  Assignee
                  <ChevronDown className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 border-r p-2">
                  Status
                  <ChevronDown className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 p-2">
                  Notes 2
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {/* Rows */}
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-5 border-b hover:bg-blue-50/50"
                >
                  <div className="flex items-center border-r p-2">
                    <div className="mr-2 w-6 text-gray-400">{row}</div>
                  </div>
                  <div className="border-r p-2"></div>
                  <div className="border-r p-2"></div>
                  <div className="border-r p-2"></div>
                  <div className="p-2"></div>
                </div>
              ))}

              {/* Add Row */}
              <div className="grid grid-cols-5">
                <div className="flex items-center p-2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add...
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
