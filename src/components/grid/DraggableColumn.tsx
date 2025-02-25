"use client";

import type { DraggableColumnProps } from "~/types/grid";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";
import { GripVertical } from "lucide-react";
import { flexRender } from "@tanstack/react-table";

export function DraggableColumn({
  header,
  cells,
  virtualizer,
}: DraggableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: header.id,
      animateLayoutChanges: () => false,
    });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative" as const,
    transform: CSS.Translate.toString(transform),
    whiteSpace: "nowrap" as const,
    width: header.getSize() ?? "auto",
    zIndex: isDragging ? 1 : 0,
  };

  const isSorted = header.column.getIsSorted();
  const isFiltered = header.column.getIsFiltered();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col border-r border-gray-300 bg-white",
        isDragging && "shadow-xl ring-1 ring-gray-200",
        !isDragging && "cursor-default",
        isSorted && "bg-[#FCF8F6]",
        isFiltered && "bg-[#ebfbec4d]",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-20 border-b border-gray-300 bg-gray-50 shadow-sm",
          isSorted && "bg-[#FCF8F6]",
          isFiltered && "bg-[#ebfbec4d]",
        )}
      >
        <div className="group flex h-8 items-center px-2 text-left text-xs font-medium text-gray-600">
          <div className="flex w-full items-center">
            {header.column.columnDef.header &&
              typeof header.column.columnDef.header === "function" &&
              header.column.columnDef.header(header.getContext())}
          </div>
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "ml-1 p-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <GripVertical className="h-3 w-3 text-gray-400" />
          </button>
        </div>
      </div>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
        className={cn(isSorted && "bg-[#FFF2EA]", isFiltered && "bg-[#CFF5D1]")}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const cell = cells[virtualRow.index];
          if (!cell) {
            return (
              <div
                key={`empty-${virtualRow.index}`}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  width: "100%",
                }}
                className="flex items-center border-b border-gray-100 px-2 py-1 text-sm text-gray-400"
              >
                —
              </div>
            );
          }

          return (
            <div
              key={cell.id}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                width: "100%",
                opacity: cell.isDragging ? 0.8 : 1,
              }}
              className={cn(
                "flex items-center border-b border-gray-300 px-2 py-1 text-sm",
                cell.isDragging && "bg-white",
                !isDragging && "hover:bg-gray-50/50",
              )}
            >
              {cell.column.columnDef.cell &&
                typeof cell.column.columnDef.cell === "function" &&
                cell.column.columnDef.cell(cell.getContext())}
            </div>
          );
        })}
      </div>
    </div>
  );
}
