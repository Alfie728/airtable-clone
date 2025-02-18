"use client";

import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { useRows } from "~/hooks/useRows";

const BULK_ADD_ROWS_COUNT = 5000;

interface GridFooterProps {
  tableId: string;
  selectedRows: string[];
  onSelectionChange: (selectedRows: string[]) => void;
  addRowAction: () => void;
  addBulkRowsAction: (count: number) => void;
  isAddingRow: boolean;
  isBatchAdding: boolean;
  onRowsDeleted: (deletedRowIds: string[]) => void;
}

export function GridFooter({
  tableId,
  selectedRows,
  onSelectionChange,
  addRowAction,
  addBulkRowsAction,
  isAddingRow,
  isBatchAdding,
  onRowsDeleted,
}: GridFooterProps) {
  const { bulkDeleteRows, isBulkDeletingRows } = useRows(tableId);

  const handleBulkDelete = async () => {
    try {
      // Update local state immediately
      onRowsDeleted(selectedRows);

      // Call server action
      await bulkDeleteRows(selectedRows);
      toast.success("Rows deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rows",
      );
    }
  };

  const handleAddBulkRows = () => {
    void addBulkRowsAction(BULK_ADD_ROWS_COUNT);
  };

  return (
    <div className="border-t border-gray-300 bg-white p-2">
      <div className="flex gap-2">
        {selectedRows.length > 0 ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleBulkDelete()}
              className="h-7 gap-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-600"
              disabled={isBulkDeletingRows}
            >
              {isBulkDeletingRows ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  Delete {selectedRows.length} row
                  {selectedRows.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-7 gap-2 text-xs hover:bg-gray-50"
            >
              <X className="h-3 w-3" />
              Clear selection
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void addRowAction()}
              className="h-7 gap-2 text-xs hover:bg-gray-50"
              disabled={isAddingRow}
            >
              {isAddingRow ? (
                "Adding..."
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Add record
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddBulkRows}
              className="h-7 gap-2 text-xs hover:bg-gray-50"
              disabled={isBatchAdding}
            >
              {isBatchAdding
                ? `Adding ${BULK_ADD_ROWS_COUNT} rows...`
                : `Add ${BULK_ADD_ROWS_COUNT} rows`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}