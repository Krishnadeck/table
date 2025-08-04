import React from "react";

const OptionsView = ({ selectedCells, onOptionAction, data }) => {
    if (selectedCells.length === 0) {
        return null;
    }

    const isSingleCell = selectedCells.length === 1;
    const isMultipleCells = selectedCells.length > 1;

    // Follow the exact logic from MergeCellTable.setupInLineFloaterOption
    const shouldShowMergeOptions = () => {
        // For single cell, always show directional merge options
        if (selectedCells.length === 1) {
            return true;
        }

        // For multiple cells, check if merge is possible
        if (selectedCells.length > 1) {
            // Use the same logic as MergeCellTable: check if canMergeSelectedCells returns canMerge: true
            const result = canMergeSelectedCells();
            return result.canMerge;
        }

        return false;
    };

    // Check if merge is possible for selected cells (similar to MergeCellTable.canMergeSelectedCells)
    const canMergeSelectedCells = () => {
        if (!selectedCells || selectedCells.length < 2) {
            return {
                canMerge: false,
                reason: "At least two cells must be selected to merge",
            };
        }

        // Parse the selected cell indexes into row, col pairs
        const parsedIndexes = selectedCells.map((index) => {
            const [row, col] = index.split(",").map(Number);
            return { row, col };
        });

        // Validate all indexes are within bounds
        for (const { row, col } of parsedIndexes) {
            if (row < 0 || row >= data.length || col < 0 || col >= data[0].length) {
                return {
                    canMerge: false,
                    reason: `Cell index (${row},${col}) is out of bounds`,
                };
            }
        }

        // Determine the bounds of the selected area
        const minRow = Math.min(...parsedIndexes.map(({ row }) => row));
        const maxRow = Math.max(...parsedIndexes.map(({ row }) => row));
        const minCol = Math.min(...parsedIndexes.map(({ col }) => col));
        const maxCol = Math.max(...parsedIndexes.map(({ col }) => col));

        // Check if selection is rectangular (accounting for hidden cells)
        const expectedCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        const visibleCellsInArea = [];

        // Count only visible cells in the rectangular area
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (data[r] && data[r][c] && data[r][c].mergeInfo.visible !== false) {
                    visibleCellsInArea.push(`${r},${c}`);
                }
            }
        }

        if (selectedCells.length !== visibleCellsInArea.length) {
            return {
                canMerge: false,
                reason: "Selection must be rectangular",
            };
        }

        // Check for conflicts with existing merged cells
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const cell = data[r][c];

                // Check if this cell is part of an existing merge that extends outside our selection
                if (cell && cell.mergeInfo.visible !== false) {
                    const rowSpan = cell.mergeInfo.rowSpan || 1;
                    const colSpan = cell.mergeInfo.colSpan || 1;

                    // Check if this merge extends outside our selection area
                    if (r + rowSpan - 1 > maxRow || c + colSpan - 1 > maxCol) {
                        return {
                            canMerge: false,
                            reason: "Selection conflicts with existing merged cells",
                        };
                    }
                }
            }
        }

        return {
            canMerge: true,
            reason: "Merge is possible",
        };
    };

    const shouldHideMergeOptions = !shouldShowMergeOptions();

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-300 h-25 z-50">
            <div className="h-full flex items-center justify-center px-6">
                <div className="flex items-center space-x-4">
                    {/* Selection Info */}
                    <div className="text-sm font-semibold text-gray-700 border-r border-gray-300 pr-4">
                        Selected: {selectedCells.length} cell{selectedCells.length !== 1 ? "s" : ""}
                    </div>

                    {/* Merge Options - Show directional merge for single cell, merge all for multiple cells */}
                    {!shouldHideMergeOptions &&
                        (isSingleCell ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-600">Merge:</span>
                                <button onClick={() => onOptionAction("mergeRight", selectedCells[0])} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center justify-center transition-colors" title="Merge Right">
                                    →
                                </button>
                                <button onClick={() => onOptionAction("mergeDown", selectedCells[0])} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center justify-center transition-colors" title="Merge Down">
                                    ↓
                                </button>
                                <button onClick={() => onOptionAction("mergeLeft", selectedCells[0])} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center justify-center transition-colors" title="Merge Left">
                                    ←
                                </button>
                                <button onClick={() => onOptionAction("mergeUp", selectedCells[0])} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center justify-center transition-colors" title="Merge Up">
                                    ↑
                                </button>
                                <button onClick={() => onOptionAction("unmerge", selectedCells[0])} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors" title="Unmerge">
                                    Unmerge
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-600">Merge:</span>
                                <button onClick={() => onOptionAction("mergeSelected", selectedCells)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                                    Merge Selected
                                </button>
                            </div>
                        ))}

                    {/* Cell Operations */}
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-600">Operations:</span>
                        <button onClick={() => onOptionAction("deleteCells")} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors">
                            Delete
                        </button>
                        <button onClick={() => onOptionAction("copyCells")} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
                            Copy
                        </button>
                        <button onClick={() => onOptionAction("pasteCells")} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors">
                            Paste
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptionsView;
