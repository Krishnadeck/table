function MergeCellTable(diagramParent, tableData, nodeProps = {}, moodData = {}) {
    PresetTable.call(this, diagramParent, tableData, nodeProps, moodData);
}

MergeCellTable.prototype = Object.create(PresetTable.prototype);
MergeCellTable.prototype.constructor = MergeCellTable;

// Add this method to PresetTable.prototype
MergeCellTable.prototype.mergeCells = function (selectedCellIndex, mergeType) {
    // Parse row and column from the selected cell index
    const [rowIndex, colIndex] = selectedCellIndex.split(",").map(Number);

    // Validate the indices
    if (rowIndex < 0 || rowIndex >= this.tableData.nodes.length || colIndex < 0 || colIndex >= this.tableData.nodes[0].cells.length) {
        console.error("Invalid cell index:", selectedCellIndex);
        return;
    }

    // Get the selected cell's data
    const selectedCell = this.tableData.nodes[rowIndex].cells[colIndex];

    // Ensure nodeproperties exists
    if (!selectedCell.nodeproperties) {
        selectedCell.nodeproperties = {};
    }

    // Initialize rowSpan and colSpan if they don't exist
    if (!selectedCell.nodeproperties.rowSpan) {
        selectedCell.nodeproperties.rowSpan = 1;
    }

    if (!selectedCell.nodeproperties.colSpan) {
        selectedCell.nodeproperties.colSpan = 1;
    }

    // Set visible property if it doesn't exist
    if (selectedCell.nodeproperties.visible === undefined) {
        selectedCell.nodeproperties.visible = true;
    }

    // Define the merge function based on the mergeType
    switch (mergeType) {
        case "mergeRight":
            this.mergeRight(rowIndex, colIndex);
            break;
        case "mergeLeft":
            this.mergeLeft(rowIndex, colIndex);
            break;
        case "mergeUp":
            this.mergeUp(rowIndex, colIndex);
            break;
        case "mergeDown":
            this.mergeDown(rowIndex, colIndex);
            break;
        case "unmerge":
            this.unmergeCell(rowIndex, colIndex);
            break;
        case "mergeRow":
            this.mergeRow(rowIndex, colIndex);
            break;
        case "mergeColumn":
            this.mergeColumn(colIndex);
            break;
        default:
            console.error("Invalid merge type:", mergeType);
            return;
    }

    // Update the table data
    this.updateTableDataAfterMerge();

    return this.tableData;
};

// Helper function to check if a cell is visible
MergeCellTable.prototype.isCellVisible = function (row, col) {
    if (row < 0 || row >= this.tableData.nodes.length) return false;
    if (col < 0 || col >= this.tableData.nodes[row].cells.length) return false;

    const cell = this.tableData.nodes[row].cells[col];
    return cell.nodeproperties && cell.nodeproperties.visible !== false;
};

// Helper function to find the next visible cell in a direction
MergeCellTable.prototype.findNextVisibleCell = function (row, col, direction) {
    const rowCount = this.tableData.nodes.length;
    const colCount = this.tableData.nodes[0].cells.length;

    switch (direction) {
        case "right":
            for (let c = col + 1; c < colCount; c++) {
                if (this.isCellVisible(row, c)) return c;
            }
            break;
        case "left":
            for (let c = col - 1; c >= 0; c--) {
                if (this.isCellVisible(row, c)) return c;
            }
            break;
        case "down":
            for (let r = row + 1; r < rowCount; r++) {
                if (this.isCellVisible(r, col)) return r;
            }
            break;
        case "up":
            for (let r = row - 1; r >= 0; r--) {
                if (this.isCellVisible(r, col)) return r;
            }
            break;
    }
    return -1;
};

// Validate if a merge is possible
MergeCellTable.prototype.canMerge = function (row, col, direction) {
    const currentCell = this.tableData.nodes[row].cells[col];
    const rowSpan = currentCell.nodeproperties?.rowSpan || 1;
    const colSpan = currentCell.nodeproperties?.colSpan || 1;

    switch (direction) {
        case "right": {
            // Check if there's a next column
            const nextCol = col + colSpan;
            if (nextCol >= this.tableData.nodes[0].cells.length) return false;

            // Check if all cells in the span can be merged
            for (let r = row; r < row + rowSpan; r++) {
                if (!this.isCellVisible(r, nextCol)) return false;
            }
            return true;
        }
        case "left": {
            // Use the improved left merge check
            return this.canMergeLeftImproved(row, col);
        }
        case "down": {
            // Check if there's a next row
            const nextRow = row + rowSpan;
            if (nextRow >= this.tableData.nodes.length) return false;

            // Check if all cells in the span can be merged
            for (let c = col; c < col + colSpan; c++) {
                if (!this.isCellVisible(nextRow, c)) return false;
            }
            return true;
        }
        case "up": {
            if (row <= 0) return false;
            const prevRow = row - 1;

            // Check if all cells in the span can be merged
            for (let c = col; c < col + colSpan; c++) {
                if (!this.isCellVisible(prevRow, c)) return false;
            }
            return true;
        }
        default:
            return false;
    }
};

MergeCellTable.prototype.canMergeLeftImproved = function (rowIndex, colIndex) {
    if (colIndex <= 0) return false;

    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];
    const rowSpan = currentCell.nodeproperties?.rowSpan || 1;
    const colSpan = currentCell.nodeproperties?.colSpan || 1;
    const prevColIndex = colIndex - 1;

    // Check if all cells in the current cell's rowSpan can merge with their left neighbors
    for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        // Check if the cell to the left exists and is visible
        if (prevColIndex < 0) return false;

        const leftCell = this.tableData.nodes[r].cells[prevColIndex];

        // The left cell must be visible (not hidden by another merge)
        if (leftCell.nodeproperties && leftCell.nodeproperties.visible === false) {
            return false;
        }

        // Check if the left cell is part of a different vertical merge that would conflict
        const leftCellRowSpan = leftCell.nodeproperties?.rowSpan || 1;
        const leftCellStartRow = r;

        // Find the actual start row of the left cell's merge (if any)
        let actualLeftStartRow = r;
        if (leftCellRowSpan === 1 && r > 0) {
            // Check if this cell might be part of a merge from above
            for (let checkRow = r - 1; checkRow >= 0; checkRow--) {
                const checkCell = this.tableData.nodes[checkRow].cells[prevColIndex];
                const checkRowSpan = checkCell.nodeproperties?.rowSpan || 1;

                if (checkCell.nodeproperties && checkCell.nodeproperties.visible !== false && checkRow + checkRowSpan > r) {
                    // This cell is part of a merge from above
                    actualLeftStartRow = checkRow;
                    break;
                }
            }
        }
    }

    return true;
};

// Merge with the cell to the right
MergeCellTable.prototype.mergeRight = function (rowIndex, colIndex) {
    if (!this.canMerge(rowIndex, colIndex, "right")) {
        console.warn("Cannot merge right from this cell");
        return;
    }

    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];
    const rowSpan = currentCell.nodeproperties.rowSpan || 1;
    const colSpan = currentCell.nodeproperties.colSpan || 1;
    const nextColIndex = colIndex + colSpan;

    // For all rows in the current cell's rowSpan
    for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        const targetCell = this.tableData.nodes[r].cells[nextColIndex];
        const targetColSpan = targetCell.nodeproperties?.colSpan || 1;

        // Only update colSpan on the first row
        if (r === rowIndex) {
            currentCell.nodeproperties.colSpan += targetColSpan;
        }

        // Hide the target cell
        if (!targetCell.nodeproperties) targetCell.nodeproperties = {};
        targetCell.nodeproperties.visible = false;
    }
};

// Merge with the cell to the left
MergeCellTable.prototype.mergeLeft = function (rowIndex, colIndex) {
    if (!this.canMerge(rowIndex, colIndex, "left")) {
        console.warn("Cannot merge left from this cell");
        return;
    }

    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];
    const rowSpan = currentCell.nodeproperties?.rowSpan || 1;
    const colSpan = currentCell.nodeproperties?.colSpan || 1;
    const prevColIndex = colIndex - 1;

    // Store the content from the current cell to preserve it
    const currentCellContent = currentCell.value || "";

    // For each row in the current cell's rowSpan, merge with the cell to the left
    for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        const targetCell = this.tableData.nodes[r].cells[prevColIndex];
        const targetColSpan = targetCell.nodeproperties?.colSpan || 1;
        const targetRowSpan = targetCell.nodeproperties?.rowSpan || 1;

        // Ensure nodeproperties exists on target cell
        if (!targetCell.nodeproperties) {
            targetCell.nodeproperties = {};
        }

        // Only update span properties on the first row (the main cell)
        if (r === rowIndex) {
            // Extend the target cell's colSpan to include the current cell
            targetCell.nodeproperties.colSpan = targetColSpan + colSpan;

            // If the current cell has a larger rowSpan, update the target's rowSpan
            if (rowSpan > targetRowSpan) {
                targetCell.nodeproperties.rowSpan = rowSpan;
            }

            // Preserve content - prefer current cell content if it exists
            if (currentCellContent && currentCellContent.trim() !== "") {
                targetCell.value = currentCellContent;
            }
        }

        // Hide the current cell in this row
        const cellToHide = this.tableData.nodes[r].cells[colIndex];
        if (!cellToHide.nodeproperties) {
            cellToHide.nodeproperties = {};
        }
        cellToHide.nodeproperties.visible = false;

        // If the target cell in this row (not the main target cell) has a smaller rowSpan
        // than our current merge, we need to hide additional cells below it
        if (r > rowIndex && targetRowSpan === 1 && rowSpan > 1) {
            // Hide this individual target cell since it's now part of the larger merge
            if (!targetCell.nodeproperties) {
                targetCell.nodeproperties = {};
            }
            targetCell.nodeproperties.visible = false;
        }
    }

    // Additional step: If the target cell originally had a smaller rowSpan than our current cell,
    // we need to hide any cells that were previously visible in the target column
    const targetMainCell = this.tableData.nodes[rowIndex].cells[prevColIndex];
    const originalTargetRowSpan = targetMainCell.nodeproperties?.rowSpan || 1;

    if (rowSpan > originalTargetRowSpan) {
        // Hide additional cells in the target column that are now part of the extended merge
        for (let r = rowIndex + originalTargetRowSpan; r < rowIndex + rowSpan; r++) {
            const additionalTargetCell = this.tableData.nodes[r].cells[prevColIndex];
            if (!additionalTargetCell.nodeproperties) {
                additionalTargetCell.nodeproperties = {};
            }
            additionalTargetCell.nodeproperties.visible = false;
        }
    }
};

// Merge with the cell below
MergeCellTable.prototype.mergeDown = function (rowIndex, colIndex) {
    if (!this.canMerge(rowIndex, colIndex, "down")) {
        console.warn("Cannot merge down from this cell");
        return;
    }

    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];
    const rowSpan = currentCell.nodeproperties.rowSpan || 1;
    const colSpan = currentCell.nodeproperties.colSpan || 1;
    const nextRowIndex = rowIndex + rowSpan;

    // For all columns in the current cell's colSpan
    for (let c = colIndex; c < colIndex + colSpan; c++) {
        const targetCell = this.tableData.nodes[nextRowIndex].cells[c];

        // Hide the target cell
        if (!targetCell.nodeproperties) targetCell.nodeproperties = {};
        targetCell.nodeproperties.visible = false;
    }

    // Increase rowSpan of the current cell
    currentCell.nodeproperties.rowSpan += 1;
};

// Merge with the cell above
MergeCellTable.prototype.mergeUp = function (rowIndex, colIndex) {
    if (!this.canMerge(rowIndex, colIndex, "up")) {
        console.warn("Cannot merge up from this cell");
        return;
    }

    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];
    const rowSpan = currentCell.nodeproperties.rowSpan || 1;
    const colSpan = currentCell.nodeproperties.colSpan || 1;
    const prevRowIndex = rowIndex - 1;

    // Find visible cells in the upper row within our column span
    let targetCells = [];
    for (let c = colIndex; c < colIndex + colSpan; c++) {
        if (this.isCellVisible(prevRowIndex, c)) {
            targetCells.push({
                col: c,
                cell: this.tableData.nodes[prevRowIndex].cells[c],
            });
        }
    }

    if (targetCells.length > 0) {
        // Use the leftmost cell as the main cell
        const mainTarget = targetCells[0];

        // Update the main target cell
        if (!mainTarget.cell.nodeproperties) mainTarget.cell.nodeproperties = {};
        mainTarget.cell.nodeproperties.rowSpan = (mainTarget.cell.nodeproperties.rowSpan || 1) + rowSpan;
        mainTarget.cell.nodeproperties.colSpan = colSpan;
        mainTarget.cell.value = currentCell.value; // Copy the content

        // Hide other cells in the upper row within our span
        for (let i = 1; i < targetCells.length; i++) {
            const cell = targetCells[i].cell;
            if (!cell.nodeproperties) cell.nodeproperties = {};
            cell.nodeproperties.visible = false;
        }

        // Hide all cells in current row within our span
        for (let c = colIndex; c < colIndex + colSpan; c++) {
            const cell = this.tableData.nodes[rowIndex].cells[c];
            if (!cell.nodeproperties) cell.nodeproperties = {};
            cell.nodeproperties.visible = false;
        }
    }
};

// Unmerge a cell
MergeCellTable.prototype.unmergeCell = function (rowIndex, colIndex) {
    const currentCell = this.tableData.nodes[rowIndex].cells[colIndex];

    // Check if the cell is actually merged
    if (!currentCell.nodeproperties || (currentCell.nodeproperties.rowSpan <= 1 && currentCell.nodeproperties.colSpan <= 1)) {
        console.warn("Cell is not merged");
        return;
    }

    const rowSpan = currentCell.nodeproperties.rowSpan || 1;
    const colSpan = currentCell.nodeproperties.colSpan || 1;

    // Store original values to restore
    const originalValues = {};

    // Make previously hidden cells visible again
    for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        for (let c = colIndex; c < colIndex + colSpan; c++) {
            // Skip the current cell
            if (r === rowIndex && c === colIndex) continue;

            const cell = this.tableData.nodes[r]?.cells[c];
            if (cell) {
                if (!cell.nodeproperties) cell.nodeproperties = {};

                // Store the original value if available, otherwise use empty string
                originalValues[`${r},${c}`] = cell.originalValue || "";

                // Make the cell visible and reset spans
                cell.nodeproperties.visible = true;
                cell.nodeproperties.rowSpan = 1;
                cell.nodeproperties.colSpan = 1;

                // Restore the original value if available
                if (originalValues[`${r},${c}`]) {
                    cell.value = originalValues[`${r},${c}`];
                }
            }
        }
    }

    // Reset the current cell's span values
    currentCell.nodeproperties.rowSpan = 1;
    currentCell.nodeproperties.colSpan = 1;
};

// Update the table data after merging cells
MergeCellTable.prototype.updateTableDataAfterMerge = function () {
    this.arrTableNode.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            cell.updateNodeAttributes(rowIndex, colIndex);
        });
    });
};

// Expose a function to get the current state of the table
MergeCellTable.prototype.getTableData = function () {
    return this.tableData;
};

// Helper to check if a cell is merged
MergeCellTable.prototype.isCellMerged = function (rowIndex, colIndex) {
    const cell = this.tableData.nodes[rowIndex].cells[colIndex];
    return cell.nodeproperties && (cell.nodeproperties.rowSpan > 1 || cell.nodeproperties.colSpan > 1);
};

MergeCellTable.prototype.mergeCellOption = function (valueObj, arrIndex) {
    console.log("mergeCellOption", valueObj, arrIndex);
    if (valueObj.dp.floaterproperty === "mergeSelectedCells") {
        this.mergeSelectedCells(valueObj.dp.selectedindex);
        // Update the table data
        this.updateTableDataAfterMerge();
    } else {
        this.mergeCells(arrIndex.join(","), valueObj.dp.floaterproperty);
    }
};

// Example of how to use the mergeCell functionality:
// const table = new PresetTable(...);
// table.mergeCells('0,1', 'mergeRight');

MergeCellTable.prototype.mergeRow = function (rowIndex, colIndex) {
    // Validate the row index
    if (rowIndex < 0 || rowIndex >= this.tableData.nodes.length) {
        console.error("Invalid row index:", rowIndex);
        return;
    }

    const rowCount = this.tableData.nodes.length;
    const colCount = this.tableData.nodes[0].cells.length;

    // First, identify all visible cells in the row
    let visibleCells = [];
    for (let c = 0; c < colCount; c++) {
        const cell = this.tableData.nodes[rowIndex].cells[c];

        // Check if this cell is visible (not already hidden due to a merge)
        if (!cell.nodeproperties || cell.nodeproperties.visible !== false) {
            visibleCells.push({ colIndex: c, cell });
        }
    }

    // If no visible cells, return
    if (visibleCells.length === 0) {
        console.warn("No visible cells in this row");
        return;
    }

    // Choose the first visible cell as the main cell
    const mainCellInfo = visibleCells[0];
    const mainCell = mainCellInfo.cell;
    const mainCellColIndex = mainCellInfo.colIndex;

    // Ensure nodeproperties exists on the main cell
    if (!mainCell.nodeproperties) {
        mainCell.nodeproperties = {};
    }

    // Calculate the total colSpan needed for the main cell
    let totalColSpan = 0;
    for (const cellInfo of visibleCells) {
        totalColSpan += cellInfo.cell.nodeproperties?.colSpan || 1;
    }

    // Set the main cell's colSpan
    mainCell.nodeproperties.colSpan = totalColSpan;

    // Now hide other visible cells in the row
    for (const cellInfo of visibleCells) {
        if (cellInfo.colIndex !== mainCellColIndex) {
            const cell = cellInfo.cell;
            if (!cell.nodeproperties) {
                cell.nodeproperties = {};
            }

            // Handle cells that are already vertically merged
            if (cell.nodeproperties.rowSpan && cell.nodeproperties.rowSpan > 1) {
                // For cells that span multiple rows, we need to adjust cells below
                const rowSpan = cell.nodeproperties.rowSpan;

                // Hide this cell
                cell.nodeproperties.visible = false;

                // Create a new separate cell in the row below to maintain the vertical merge
                // but only if this isn't the last row
                if (rowIndex + 1 < rowCount) {
                    const cellBelow = this.tableData.nodes[rowIndex + 1].cells[cellInfo.colIndex];
                    if (!cellBelow.nodeproperties) {
                        cellBelow.nodeproperties = {};
                    }

                    // Make the cell below visible and give it the remaining rowSpan
                    cellBelow.nodeproperties.visible = true;
                    cellBelow.nodeproperties.rowSpan = rowSpan - 1;
                    cellBelow.value = cell.value; // Copy the value
                }
            } else {
                // For normal cells, just hide them
                cell.nodeproperties.visible = false;
            }
        }
    }

    return this.tableData;
};

MergeCellTable.prototype.canMergeRow = function (rowIndex, colIndex) {
    // Validate the row index
    if (rowIndex < 0 || rowIndex >= this.tableData.nodes.length) {
        return {
            canMerge: false,
            reason: `Invalid row index: ${rowIndex}`,
        };
    }

    const colCount = this.tableData.nodes[0].cells.length;

    // Check 1: Are there at least 2 visible cells in the row to merge?
    let visibleCells = [];
    for (let c = 0; c < colCount; c++) {
        const cell = this.tableData.nodes[rowIndex].cells[c];

        // Check if this cell is visible (not already hidden due to a merge)
        if (!cell.nodeproperties || cell.nodeproperties.visible !== false) {
            visibleCells.push({ colIndex: c, cell });
        }
    }

    if (visibleCells.length < 2) {
        return {
            canMerge: false,
            reason: `Row ${rowIndex} has fewer than 2 visible cells to merge`,
        };
    }

    // Check 2: Are there any cells with different rowSpan sizes that would cause issues?
    let hasUnevenRowSpans = false;
    let rowSpanMismatchMessage = "";

    // First, identify the main rowSpan size (from the first visible cell)
    const mainRowSpan = visibleCells[0].cell.nodeproperties?.rowSpan || 1;

    for (const cellInfo of visibleCells) {
        const cellRowSpan = cellInfo.cell.nodeproperties?.rowSpan || 1;

        // If this cell has a different rowSpan than our main cell
        if (cellRowSpan !== mainRowSpan) {
            hasUnevenRowSpans = true;
            rowSpanMismatchMessage = `Cell at column ${cellInfo.colIndex} has rowSpan=${cellRowSpan} while other cells have rowSpan=${mainRowSpan}`;
            break;
        }
    }

    // Check 3: Does the row have cells that are part of a merge from a row above?
    let hasTopMergeOverlap = false;
    let topMergeMessage = "";

    // Skip this check for the top row
    if (rowIndex > 0) {
        for (let c = 0; c < colCount; c++) {
            // Check cells in the row above
            const cellAbove = this.tableData.nodes[rowIndex - 1].cells[c];

            // If a cell above has a rowSpan that extends to our row
            if (cellAbove.nodeproperties && cellAbove.nodeproperties.visible !== false && cellAbove.nodeproperties.rowSpan > 1) {
                const rowSpanAbove = cellAbove.nodeproperties.rowSpan;

                // Check if the span reaches to our current row
                if (rowIndex < rowIndex - 1 + rowSpanAbove) {
                    hasTopMergeOverlap = true;
                    topMergeMessage = `Cell at column ${c} in row ${rowIndex - 1} has a rowSpan=${rowSpanAbove} that overlaps with the selected row`;
                    break;
                }
            }
        }
    }

    // Check 4 (ADDED): Check if any column is vertically merged through this row
    // This addresses the scenario where merging a column would conflict with merging a row
    let hasVerticalColumnMerge = false;
    let verticalColumnMergeMessage = "";

    for (let c = 0; c < colCount; c++) {
        // For each column, check if there's a vertical merge that passes through this row
        // First, check cells in rows above for downward vertical merges
        for (let r = 0; r < rowIndex; r++) {
            const cell = this.tableData.nodes[r].cells[c];

            // Skip hidden cells as they're part of another merge
            if (cell.nodeproperties && cell.nodeproperties.visible === false) continue;

            const rowSpan = cell.nodeproperties?.rowSpan || 1;

            // If this cell has a rowSpan that extends through our target row
            if (rowSpan > 1 && r + rowSpan - 1 >= rowIndex) {
                hasVerticalColumnMerge = true;
                verticalColumnMergeMessage = `Column ${c} has a vertical merge from row ${r} that passes through row ${rowIndex}`;
                break;
            }
        }

        if (hasVerticalColumnMerge) break;

        // Then check the current row for cell that starts a vertical merge
        const currentCell = this.tableData.nodes[rowIndex].cells[c];
        if (currentCell.nodeproperties && currentCell.nodeproperties.visible !== false && currentCell.nodeproperties.rowSpan > 1) {
            hasVerticalColumnMerge = true;
            verticalColumnMergeMessage = `Row ${rowIndex} contains a cell at column ${c} that starts a vertical merge`;
            break;
        }
    }

    // Combine all checks
    const canMerge = !hasUnevenRowSpans && !hasTopMergeOverlap && !hasVerticalColumnMerge;

    let reason = "";
    if (hasUnevenRowSpans) {
        reason = rowSpanMismatchMessage;
    } else if (hasTopMergeOverlap) {
        reason = topMergeMessage;
    } else if (hasVerticalColumnMerge) {
        reason = verticalColumnMergeMessage;
    }

    return {
        canMerge,
        reason,
    };
};

// Implementation of mergeColumn function for MergeCellTable

MergeCellTable.prototype.mergeColumn = function (colIndex) {
    // Validate the column index
    if (colIndex < 0 || colIndex >= this.tableData.nodes[0].cells.length) {
        console.error("Invalid column index:", colIndex);
        return;
    }

    const rowCount = this.tableData.nodes.length;
    const colCount = this.tableData.nodes[0].cells.length;

    // First, identify all visible cells in the column
    let visibleCells = [];
    for (let r = 0; r < rowCount; r++) {
        const cell = this.tableData.nodes[r].cells[colIndex];

        // Check if this cell is visible (not already hidden due to a merge)
        if (!cell.nodeproperties || cell.nodeproperties.visible !== false) {
            visibleCells.push({ rowIndex: r, cell });
        }
    }

    // If no visible cells, return
    if (visibleCells.length === 0) {
        console.warn("No visible cells in this column");
        return;
    }

    // Choose the first visible cell as the main cell
    const mainCellInfo = visibleCells[0];
    const mainCell = mainCellInfo.cell;
    const mainCellRowIndex = mainCellInfo.rowIndex;

    // Ensure nodeproperties exists on the main cell
    if (!mainCell.nodeproperties) {
        mainCell.nodeproperties = {};
    }

    // Calculate the total rowSpan needed for the main cell
    let totalRowSpan = 0;
    for (const cellInfo of visibleCells) {
        totalRowSpan += cellInfo.cell.nodeproperties?.rowSpan || 1;
    }

    // Set the main cell's rowSpan
    mainCell.nodeproperties.rowSpan = totalRowSpan;

    // Now hide other visible cells in the column
    for (const cellInfo of visibleCells) {
        if (cellInfo.rowIndex !== mainCellRowIndex) {
            const cell = cellInfo.cell;
            if (!cell.nodeproperties) {
                cell.nodeproperties = {};
            }

            // Handle cells that are already horizontally merged
            if (cell.nodeproperties.colSpan && cell.nodeproperties.colSpan > 1) {
                // For cells that span multiple columns, we need to adjust cells to the right
                const colSpan = cell.nodeproperties.colSpan;

                // Hide this cell
                cell.nodeproperties.visible = false;

                // Create a new separate cell in the column to the right to maintain the horizontal merge
                // but only if this isn't the last column
                if (colIndex + 1 < colCount) {
                    const cellToRight = this.tableData.nodes[cellInfo.rowIndex].cells[colIndex + 1];
                    if (!cellToRight.nodeproperties) {
                        cellToRight.nodeproperties = {};
                    }

                    // Make the cell to the right visible and give it the remaining colSpan
                    cellToRight.nodeproperties.visible = true;
                    cellToRight.nodeproperties.colSpan = colSpan - 1;
                    cellToRight.value = cell.value; // Copy the value
                }
            } else {
                // For normal cells, just hide them
                cell.nodeproperties.visible = false;
            }
        }
    }

    return this.tableData;
};

// Implementation of canMergeColumn function
MergeCellTable.prototype.canMergeColumn = function (colIndex) {
    // Validate the column index
    if (colIndex < 0 || colIndex >= this.tableData.nodes[0].cells.length) {
        return {
            canMerge: false,
            reason: `Invalid column index: ${colIndex}`,
        };
    }

    const rowCount = this.tableData.nodes.length;
    const colCount = this.tableData.nodes[0].cells.length;

    // Check 1: Are there at least 2 visible cells in the column to merge?
    let visibleCells = [];
    for (let r = 0; r < rowCount; r++) {
        const cell = this.tableData.nodes[r].cells[colIndex];

        // Check if this cell is visible (not already hidden due to a merge)
        if (!cell.nodeproperties || cell.nodeproperties.visible !== false) {
            visibleCells.push({ rowIndex: r, cell });
        }
    }

    if (visibleCells.length < 2) {
        return {
            canMerge: false,
            reason: `Column ${colIndex} has fewer than 2 visible cells to merge`,
        };
    }

    // Check 2: Are there any cells with different colSpan sizes that would cause issues?
    let hasUnevenColSpans = false;
    let colSpanMismatchMessage = "";

    // First, identify the main colSpan size (from the first visible cell)
    const mainColSpan = visibleCells[0].cell.nodeproperties?.colSpan || 1;

    for (const cellInfo of visibleCells) {
        const cellColSpan = cellInfo.cell.nodeproperties?.colSpan || 1;

        // If this cell has a different colSpan than our main cell
        if (cellColSpan !== mainColSpan) {
            hasUnevenColSpans = true;
            colSpanMismatchMessage = `Cell at row ${cellInfo.rowIndex} has colSpan=${cellColSpan} while other cells have colSpan=${mainColSpan}`;
            break;
        }
    }

    // Check 3: Does the column have cells that are part of a merge from a column to the left?
    let hasLeftMergeOverlap = false;
    let leftMergeMessage = "";

    // Skip this check for the leftmost column
    if (colIndex > 0) {
        for (let r = 0; r < rowCount; r++) {
            // Check cells in the column to the left
            const cellToLeft = this.tableData.nodes[r].cells[colIndex - 1];

            // If a cell to the left has a colSpan that extends to our column
            if (cellToLeft.nodeproperties && cellToLeft.nodeproperties.visible !== false && cellToLeft.nodeproperties.colSpan > 1) {
                const colSpanToLeft = cellToLeft.nodeproperties.colSpan;

                // Check if the span reaches to our current column
                if (colIndex < colIndex - 1 + colSpanToLeft) {
                    hasLeftMergeOverlap = true;
                    leftMergeMessage = `Cell at row ${r} in column ${colIndex - 1} has a colSpan=${colSpanToLeft} that overlaps with the selected column`;
                    break;
                }
            }
        }
    }

    // Check 4: Does any row contain a horizontal merge that would overlap with our column?
    let hasHorizontalMergeOverlap = false;
    let horizontalMergeMessage = "";

    for (let r = 0; r < rowCount; r++) {
        // Check all cells in this row to find horizontal merges
        for (let c = 0; c < colCount; c++) {
            // Skip the current column and hidden cells
            if (c === colIndex || (this.tableData.nodes[r].cells[c].nodeproperties && this.tableData.nodes[r].cells[c].nodeproperties.visible === false)) {
                continue;
            }

            const cell = this.tableData.nodes[r].cells[c];
            const colSpan = cell.nodeproperties?.colSpan || 1;

            // If this is a horizontal merge that includes or overlaps our column
            if (colSpan > 1) {
                const mergeStart = c;
                const mergeEnd = c + colSpan - 1;

                // Check if this merge includes our column
                if (colIndex >= mergeStart && colIndex <= mergeEnd) {
                    hasHorizontalMergeOverlap = true;
                    horizontalMergeMessage = `Row ${r} has a horizontal merge from column ${mergeStart} to ${mergeEnd} that includes the selected column ${colIndex}`;
                    break;
                }
            }
        }

        if (hasHorizontalMergeOverlap) {
            break;
        }
    }

    // Combine all checks
    const canMerge = !hasUnevenColSpans && !hasLeftMergeOverlap && !hasHorizontalMergeOverlap;

    let reason = "";
    if (hasUnevenColSpans) {
        reason = colSpanMismatchMessage;
    } else if (hasLeftMergeOverlap) {
        reason = leftMergeMessage;
    } else if (hasHorizontalMergeOverlap) {
        reason = horizontalMergeMessage;
    }

    return {
        canMerge,
        reason,
    };
};

/**
 * Complete solution for merging cells that consistently handles all cases
 * including merging with already merged cells
 */
MergeCellTable.prototype.canMergeSelectedCells = function (selectedCellIndexes) {
    if (!selectedCellIndexes || selectedCellIndexes.length < 2) {
        return {
            canMerge: false,
            cellsToMerge: [],
            reason: "At least two cells must be selected to merge",
        };
    }

    // Parse the selected cell indexes into row, col pairs
    const parsedIndexes = selectedCellIndexes.map((index) => {
        const [row, col] = index.split(",").map(Number);
        return { row, col };
    });

    // Validate all indexes are within bounds
    for (const { row, col } of parsedIndexes) {
        if (row < 0 || row >= this.tableData.nodes.length || col < 0 || col >= this.tableData.nodes[0].cells.length) {
            return {
                canMerge: false,
                cellsToMerge: [],
                reason: `Cell index (${row},${col}) is out of bounds`,
            };
        }
    }

    // Determine the bounds of the selected area
    const minRow = Math.min(...parsedIndexes.map(({ row }) => row));
    const maxRow = Math.max(...parsedIndexes.map(({ row }) => row));
    const minCol = Math.min(...parsedIndexes.map(({ col }) => col));
    const maxCol = Math.max(...parsedIndexes.map(({ col }) => col));

    // Get visible cells, hidden cells, and existing spans in the selection
    const visibleCells = new Map(); // Maps cell index to cell data
    const hiddenCells = new Map(); // Maps hidden cell index to its parent span
    const spanRoots = new Map(); // Maps a span's root cell index to its span info

    // First pass: identify visible cells, hidden cells, and spans
    for (let r = 0; r < this.tableData.nodes.length; r++) {
        for (let c = 0; c < this.tableData.nodes[0].cells.length; c++) {
            const cell = this.tableData.nodes[r].cells[c];
            const cellIndex = `${r},${c}`;

            if (cell.nodeproperties && cell.nodeproperties.visible === false) {
                // This is a hidden cell, need to find its parent span
                hiddenCells.set(cellIndex, null); // Will set the parent later
                continue;
            }

            visibleCells.set(cellIndex, cell);

            const rowSpan = cell.nodeproperties?.rowSpan || 1;
            const colSpan = cell.nodeproperties?.colSpan || 1;

            // If this cell spans multiple rows or columns, store it
            if (rowSpan > 1 || colSpan > 1) {
                spanRoots.set(cellIndex, {
                    rowSpan,
                    colSpan,
                    spanArea: [], // Will store all cell indexes covered by this span
                });

                // Mark all cells covered by this span
                for (let sr = r; sr < r + rowSpan; sr++) {
                    for (let sc = c; sc < c + colSpan; sc++) {
                        const spanCellIndex = `${sr},${sc}`;
                        spanRoots.get(cellIndex).spanArea.push(spanCellIndex);

                        // If this is a hidden cell we encountered earlier, link it to this span
                        if (hiddenCells.has(spanCellIndex)) {
                            hiddenCells.set(spanCellIndex, cellIndex);
                        }
                    }
                }
            }
        }
    }

    // Now, check for span conflicts with the selection rectangle
    // 1. Find all spans that have any cell within our selection area
    const spansInSelection = [];
    for (const [rootIndex, spanInfo] of spanRoots.entries()) {
        const rootCell = rootIndex.split(",").map(Number);
        const rootRow = rootCell[0];
        const rootCol = rootCell[1];

        // Check if any part of this span overlaps with our selection rectangle
        let isOverlapping = false;
        for (const spanCell of spanInfo.spanArea) {
            const [spanRow, spanCol] = spanCell.split(",").map(Number);
            if (spanRow >= minRow && spanRow <= maxRow && spanCol >= minCol && spanCol <= maxCol) {
                // This span has at least one cell in our selection
                isOverlapping = true;
                break;
            }
        }

        if (isOverlapping) {
            spansInSelection.push({
                rootIndex,
                rootRow,
                rootCol,
                spanInfo,
            });
        }
    }

    // 2. Find any spans that only partially overlap (these create conflicts)
    for (const span of spansInSelection) {
        // Check if the entire span is within our selection rectangle
        let isCompletelyContained = true;
        for (const spanCell of span.spanInfo.spanArea) {
            const [spanRow, spanCol] = spanCell.split(",").map(Number);
            if (spanRow < minRow || spanRow > maxRow || spanCol < minCol || spanCol > maxCol) {
                // Found a cell in the span that's outside our selection
                isCompletelyContained = false;
                break;
            }
        }

        // If a span is only partially contained, it's a conflict
        if (!isCompletelyContained) {
            return {
                canMerge: false,
                cellsToMerge: [],
                reason: `Selection conflicts with an existing merge at ${span.rootIndex} that extends outside the selection area`,
            };
        }
    }

    // 3. Check for any spans that start outside but extend into our selection
    for (const [rootIndex, spanInfo] of spanRoots.entries()) {
        if (spansInSelection.some((s) => s.rootIndex === rootIndex)) {
            // We already checked this span above
            continue;
        }

        // Check if any part of this span overlaps with our selection
        for (const spanCell of spanInfo.spanArea) {
            const [spanRow, spanCol] = spanCell.split(",").map(Number);
            if (spanRow >= minRow && spanRow <= maxRow && spanCol >= minCol && spanCol <= maxCol) {
                // This is a span that starts outside but extends into our selection
                return {
                    canMerge: false,
                    cellsToMerge: [],
                    reason: `Selection overlaps with an existing merge that starts outside the selection area`,
                };
            }
        }
    }

    // Now, create a list of cells that need to be merged
    const cellsToMerge = [];
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            cellsToMerge.push(`${r},${c}`);
        }
    }

    // If we get here, the merge should be possible
    return {
        canMerge: true,
        cellsToMerge: cellsToMerge,
        mainCell: `${minRow},${minCol}`, // Top-left cell will be the main one
        rowSpan: maxRow - minRow + 1,
        colSpan: maxCol - minCol + 1,
    };
};

/**
 * Function to merge multiple selected cells, handling all complex cases
 */
MergeCellTable.prototype.mergeSelectedCells = function (selectedCellIndexes) {
    // First check if the merge is possible
    const mergeCheck = this.canMergeSelectedCells(selectedCellIndexes);

    if (!mergeCheck.canMerge) {
        console.warn(`Cannot merge selected cells: ${mergeCheck.reason}`);
        return null;
    }

    // First, reset any existing merges in the cells we're going to merge
    // This step is critical to avoid creating nested merges
    for (let r = 0; r < this.tableData.nodes.length; r++) {
        for (let c = 0; c < this.tableData.nodes[0].cells.length; c++) {
            const cellIndex = `${r},${c}`;

            // If this cell is part of our merge
            if (mergeCheck.cellsToMerge.includes(cellIndex)) {
                const cell = this.tableData.nodes[r].cells[c];

                // Reset any span properties and make visible
                if (cell.nodeproperties) {
                    // Keep a copy of cell content
                    const cellContent = cell.value;

                    // Reset properties
                    cell.nodeproperties.rowSpan = 1;
                    cell.nodeproperties.colSpan = 1;
                    cell.nodeproperties.visible = true;

                    // Preserve cell content
                    cell.value = cellContent;
                }
            }
        }
    }

    // Get the main cell that will remain visible
    const [mainRow, mainCol] = mergeCheck.mainCell.split(",").map(Number);
    const mainCell = this.tableData.nodes[mainRow].cells[mainCol];

    // Ensure nodeproperties exists
    if (!mainCell.nodeproperties) {
        mainCell.nodeproperties = {};
    }

    // Set the span of the main cell
    mainCell.nodeproperties.rowSpan = mergeCheck.rowSpan;
    mainCell.nodeproperties.colSpan = mergeCheck.colSpan;

    // Hide all other cells in the merge area
    for (const cellIndex of mergeCheck.cellsToMerge) {
        if (cellIndex === `${mainRow},${mainCol}`) continue;

        const [row, col] = cellIndex.split(",").map(Number);
        const cell = this.tableData.nodes[row].cells[col];

        if (!cell.nodeproperties) {
            cell.nodeproperties = {};
        }

        cell.nodeproperties.visible = false;
    }

    return this.tableData;
};

MergeCellTable.prototype.getInsertOptionsForRow = function (rowIndex) {
    // Validate row index
    if (rowIndex < 0 || rowIndex >= this.tableData.nodes.length) {
        return {
            canShowInsertAbove: false,
            canShowInsertBelow: false,
            reason: `Invalid row index: ${rowIndex}`,
        };
    }

    // Initial result assumes both options can be shown
    const result = {
        canShowInsertAbove: true,
        canShowInsertBelow: true,
    };

    // Check if the current row has any cells hidden due to merges from above
    const currentRow = this.tableData.nodes[rowIndex];
    let isPartOfVerticalMerge = false;

    for (let colIndex = 0; colIndex < currentRow.cells.length; colIndex++) {
        const cell = currentRow.cells[colIndex];

        // If this cell is hidden, it might be due to a vertical merge from above
        if (cell.nodeproperties && cell.nodeproperties.visible === false) {
            isPartOfVerticalMerge = true;
            result.canShowInsertAbove = false;
            result.aboveReason = `Row ${rowIndex} has a hidden cell that is part of a vertical merge from above`;

            // We also need to check if this is a middle row in a multi-row span
            // by looking at the row below
            if (rowIndex < this.tableData.nodes.length - 1) {
                const cellBelow = this.tableData.nodes[rowIndex + 1].cells[colIndex];
                if (cellBelow.nodeproperties && cellBelow.nodeproperties.visible === false) {
                    // This is a middle row in a span - can't insert below either
                    result.canShowInsertBelow = false;
                    result.belowReason = `Row ${rowIndex} is in the middle of a vertical merge`;
                }
            }

            break;
        }
    }

    // If we're not already identified as part of a merge, check for spans from above
    if (!isPartOfVerticalMerge && rowIndex > 0) {
        // Check the row above for spans that might include this row
        const rowAbove = this.tableData.nodes[rowIndex - 1];

        for (let colIndex = 0; colIndex < rowAbove.cells.length; colIndex++) {
            const cell = rowAbove.cells[colIndex];

            // Skip hidden cells
            if (cell.nodeproperties && cell.nodeproperties.visible === false) {
                continue;
            }

            const rowSpan = cell.nodeproperties?.rowSpan || 1;

            // If this cell from above spans into our row
            if (rowSpan > 1 && rowIndex < rowIndex - 1 + rowSpan) {
                result.canShowInsertAbove = false;
                result.aboveReason = `Row ${rowIndex - 1} has a cell that spans into row ${rowIndex}`;

                // If the span extends beyond this row, then this is a middle row
                if (rowSpan > 2 && rowIndex - 1 + rowSpan > rowIndex + 1) {
                    result.canShowInsertBelow = false;
                    result.belowReason = `Row ${rowIndex} is in the middle of a vertical merge`;
                }

                break;
            }
        }
    }

    // If we're still not identified as in the middle of a merge,
    // check if this row starts a merge that spans downward
    if (result.canShowInsertBelow) {
        for (let colIndex = 0; colIndex < currentRow.cells.length; colIndex++) {
            const cell = currentRow.cells[colIndex];

            // Skip hidden cells
            if (cell.nodeproperties && cell.nodeproperties.visible === false) {
                continue;
            }

            const rowSpan = cell.nodeproperties?.rowSpan || 1;

            // If this cell spans into rows below
            if (rowSpan > 1) {
                result.canShowInsertBelow = false;
                result.belowReason = `Row ${rowIndex} has a cell that spans ${rowSpan} rows downward`;
                break;
            }
        }
    }

    return result;
};

/**
 * Simple utility function to check if a specific insert option should be shown
 *
 * @param {number} rowIndex - The index of the selected row
 * @param {string} option - The option to check: "above" or "below"
 * @returns {boolean} Whether the option should be shown
 */
MergeCellTable.prototype.canInsertRowAt = function (rowIndex, option) {
    const insertOptions = this.getInsertOptionsForRow(rowIndex);

    if (option === "above") {
        return insertOptions.canShowInsertAbove;
    } else if (option === "below") {
        return insertOptions.canShowInsertBelow;
    }

    return false;
};

MergeCellTable.prototype.canInsertColumnAt = function (colIndex, position) {
    // Validate column index
    if (colIndex < 0 || colIndex >= this.tableData.nodes[0].cells.length) {
        console.error("Invalid column index:", colIndex);
        return false;
    }

    // Normalize the position parameter
    const normalizedPosition = position.toLowerCase();
    if (normalizedPosition !== "left" && normalizedPosition !== "right") {
        console.error("Invalid position parameter. Must be 'left' or 'right'.");
        return false;
    }

    const rowCount = this.tableData.nodes.length;

    // For "left" position, check if any cell in the column is part of a horizontal merge
    // that extends from a column to the left
    if (normalizedPosition === "left") {
        // If this is the first column, we can always insert to its left
        if (colIndex === 0) return true;

        for (let r = 0; r < rowCount; r++) {
            // Check if this cell is hidden (part of a merge)
            const cell = this.tableData.nodes[r].cells[colIndex];
            if (cell.nodeproperties && cell.nodeproperties.visible === false) {
                // Find where this merge starts by checking all cells to the left
                let isPartOfMerge = false;
                for (let c = 0; c < colIndex; c++) {
                    const leftCell = this.tableData.nodes[r].cells[c];
                    if (leftCell && (!leftCell.nodeproperties || leftCell.nodeproperties.visible !== false) && leftCell.nodeproperties && leftCell.nodeproperties.colSpan > 1) {
                        // Check if this left cell's span includes our column
                        if (colIndex < c + leftCell.nodeproperties.colSpan) {
                            isPartOfMerge = true;
                            break;
                        }
                    }
                }
                if (isPartOfMerge) {
                    return false;
                }
            }

            // Check if cell to the left has a colSpan that extends to this column
            const leftCell = this.tableData.nodes[r].cells[colIndex - 1];
            if (leftCell && (!leftCell.nodeproperties || leftCell.nodeproperties.visible !== false) && leftCell.nodeproperties && leftCell.nodeproperties.colSpan > 1) {
                // If the left cell spans into our column, we can't insert
                if (colIndex < colIndex - 1 + leftCell.nodeproperties.colSpan) {
                    return false;
                }
            }
        }
    }

    // For "right" position, check if any cell in the column has a colSpan > 1
    if (normalizedPosition === "right") {
        for (let r = 0; r < rowCount; r++) {
            const cell = this.tableData.nodes[r].cells[colIndex];

            // Skip hidden cells
            if (cell.nodeproperties && cell.nodeproperties.visible === false) {
                // Find the source of this merge
                let mergeSource = null;
                // Look leftward to find the source cell
                for (let c = colIndex - 1; c >= 0; c--) {
                    const potentialSource = this.tableData.nodes[r].cells[c];
                    if (potentialSource && (!potentialSource.nodeproperties || potentialSource.nodeproperties.visible !== false) && potentialSource.nodeproperties && potentialSource.nodeproperties.colSpan > 1) {
                        // Check if this source's span includes our cell
                        if (colIndex < c + potentialSource.nodeproperties.colSpan) {
                            mergeSource = {
                                col: c,
                                colSpan: potentialSource.nodeproperties.colSpan,
                                spanEnd: c + potentialSource.nodeproperties.colSpan - 1,
                            };
                            break;
                        }
                    }
                }

                // If this cell is part of a merge that spans beyond this column, we can't insert
                if (mergeSource && mergeSource.spanEnd > colIndex) {
                    return false;
                }
                continue;
            }

            // If cell has colSpan > 1, we can't insert to its right
            if (cell.nodeproperties && cell.nodeproperties.colSpan > 1) {
                return false;
            }
        }
    }

    // If we got here, insertion is allowed
    return true;
};

/**
 * Find the source cell of a vertical merge for any cell
 * Helper function to determine merge relationships
 *
 * @param {number} rowIndex - Row index of the cell to check
 * @param {number} colIndex - Column index of the cell to check
 * @returns {Object|null} Source cell info or null if not in a merge
 */
MergeCellTable.prototype.findVerticalMergeSource = function (rowIndex, colIndex) {
    const cell = this.tableData.nodes[rowIndex]?.cells[colIndex];

    // If this is already a visible cell with rowSpan > 1, it's a source
    if (cell && (!cell.nodeproperties || cell.nodeproperties.visible !== false)) {
        const rowSpan = cell.nodeproperties?.rowSpan || 1;
        if (rowSpan > 1) {
            return {
                row: rowIndex,
                col: colIndex,
                rowSpan: rowSpan,
                isSource: true,
            };
        }
    }

    // If this is a hidden cell, find its source by looking upward
    if (cell && cell.nodeproperties && cell.nodeproperties.visible === false) {
        // Look for the source cell above
        for (let r = rowIndex - 1; r >= 0; r--) {
            const potentialSource = this.tableData.nodes[r]?.cells[colIndex];

            if (potentialSource && (!potentialSource.nodeproperties || potentialSource.nodeproperties.visible !== false)) {
                const rowSpan = potentialSource.nodeproperties?.rowSpan || 1;

                // Check if this source's span includes our cell
                if (rowSpan > 1 && r + rowSpan > rowIndex) {
                    return {
                        row: r,
                        col: colIndex,
                        rowSpan: rowSpan,
                        spanEnd: r + rowSpan - 1,
                    };
                }
            }
        }
    }

    return null;
};

MergeCellTable.prototype.fillAuto = function (obj, setwidth = true, setheight = true) {
    this.arrTableNode.forEach((row, i) => {
        if (setheight) this.tableParent.style.setProperty("--height" + i, "auto");
        row.forEach((cell, j) => {
            if (setwidth) this.tableParent.style.setProperty("--width" + j, "auto");
            cell.autoDimension(setwidth, setheight);
        });
    });
};

//fill table to parent size if table size less than parent size or it find the bigger cell and apply the size to all cell
MergeCellTable.prototype.fillTable = function (obj) {
    let offset = 60;
    if (this.appmode == "PRESENT") {
        this.tableParent.parentElement.dataset.scrollEnableV == "true" ? (offset = 0) : (offset = 60);
        this.tableParent.parentElement.style.setProperty("padding", "0px", "important");
    }
    let width = this.tableParent.parentElement.clientWidth - offset;
    let height = this.tableParent.parentElement.clientHeight - offset;

    let tableTitleHolder = this.tableParent.querySelector("[name='diagramTitle']");
    let tableSourceHolder = this.tableParent.querySelector("[name='sourceText']");
    if (tableTitleHolder) {
        height = height - tableTitleHolder.clientHeight - (this.appmode == "PRESENT" ? 30 : 0);
    }
    if (tableSourceHolder) {
        height = height - tableSourceHolder.clientHeight - (this.appmode == "PRESENT" ? 30 : 0);
    }

    this.tableParent.style.setProperty("width", "auto");
    this.tableParent.style.setProperty("height", "auto");
    this.tableParent.firstElementChild.style.setProperty("width", width + "px");
    this.tableParent.firstElementChild.style.setProperty("height", height + "px");
};

//fill table to parent size if table size less than parent size in ratio
MergeCellTable.prototype.fillTableRatio = function (obj) {
    this.fillTable(obj);
};

//Set auto to cell size
MergeCellTable.prototype.fillAuto = function (setWidth = true, setHeight = true) {
    this.tableParent.style.setProperty("width", "auto");
    this.tableParent.style.setProperty("height", "auto");
    this.tableParent.firstElementChild.style.setProperty("width", "auto");
    this.tableParent.firstElementChild.style.setProperty("height", "auto");
};

MergeCellTable.prototype.createElements = function () {
    this.createTable();
    this.updateEvents();
    this.callTableFillIfNeed();
};

MergeCellTable.prototype.copy = function (obj) {
    let isCol = obj.property.includes("COL");
    let targetElement = this.tableParent.querySelector(`[id="${obj.targetid}"]`);
    let sourceIndex;
    let index;
    if (targetElement?.dataset?.index) {
        sourceIndex = targetElement?.dataset?.index;
        index = parseInt(sourceIndex) + 1;
    } else {
        index = isCol ? this.colCount : this.rowCount;
        sourceIndex = isCol ? index - 1 : index - 1;
    }
    if (isCol) {
        this.tableData.nodes.forEach((row) => {
            let newData = JSON.parse(JSON.stringify(row.cells[sourceIndex]));
            if (newData.nodeproperties) newData.nodeproperties.visible = true;
            row.cells.splice(index, 0, newData);
        });
        this.tableParent.setAttribute("data-table-Altered", "");
        this.createSetupTable();
    } else {
        let newData = JSON.parse(JSON.stringify(this.tableData.nodes[sourceIndex]));
        newData.cells.forEach((cell) => {
            if (cell.nodeproperties) cell.nodeproperties.visible = true;
        });
        this.tableData.nodes.splice(index, 0, newData);
        this.tableParent.setAttribute("data-table-Altered", "");
        this.createSetupTable();
    }

    return index;
};

MergeCellTable.prototype.keyupSelectionEvent = function (event) {};

MergeCellTable.prototype.clearSelection = function () {
    this.clearCtrlSelection();
    this.clearMetaSelection();
};

MergeCellTable.prototype.clearCtrlSelection = function (valueObj) {
    this.ctrlKeySelectedIndex?.forEach((index) => {
        let [rowIndex, colIndex] = index.split(",").map(Number);
        let cell = this.arrTableNode[rowIndex][colIndex];
        cell.mainParent.parentElement.removeAttribute("data-selectedtype");
    });
    this.ctrlKeySelectedIndex = null;
};

MergeCellTable.prototype.clearMetaSelection = function (valueObj) {
    this.arrPossibleMergeCells?.forEach((index) => {
        let [rowIndex, colIndex] = index.split(",").map(Number);
        let cell = this.arrTableNode[rowIndex][colIndex];
        cell.mainParent.parentElement.removeAttribute("data-selectedtype");
    });
    this.arrPossibleMergeCells = null;
    this.arrSelectedIndexes = null;
    this.focusedCellIndex = null;
};

MergeCellTable.prototype.cellBgColor = function (valueObj) {
    valueObj?.value?.selectedIndex?.forEach((index) => {
        let [rowIndex, colIndex] = index.split(",").map(Number);
        let cellParent = this.arrTableNode[rowIndex]?.[colIndex]?.mainParent.parentElement;
        cellParent.style.setProperty("background-color", valueObj.value.value, "important");
    });
};

MergeCellTable.prototype.clearUnsupportedOption = function (dictProps) {
    let arrException = ["changecontenttype"];
    for (let key in dictProps) {
        if (!arrException.includes(key)) {
            delete dictProps[key];
        }
    }
};

MergeCellTable.prototype.getCellType = function (arrIndex) {
    let objCellType = {};
    let objBold = {};
    let objItalic = {};
    let objListType = {};
    arrIndex?.forEach((index) => {
        let [rowIndex, colIndex] = index.split(",").map(Number);
        let cell = this.tableData.nodes[rowIndex].cells[colIndex];
        objCellType[cell.nodename] = cell.nodename;

        let titleHolder = DiagramUtils.getValueByKey(cell, "titleHolder");
        let subTitleHolder = DiagramUtils.getValueByKey(cell, "subTitleHolder");
        if (titleHolder?.textproperties) objBold[titleHolder.textproperties.fontbold] = objBold[titleHolder.textproperties.fontbold ? "bold" : "normal"] ? [...objBold[titleHolder.textproperties.fontbold], index] : [index];
        if (subTitleHolder?.textproperties) objBold[subTitleHolder.textproperties.fontbold] = objBold[subTitleHolder.textproperties.fontbold ? "bold" : "normal"] ? [...objBold[subTitleHolder.textproperties.fontbold], index] : [index];

        if (titleHolder?.textproperties) objItalic[titleHolder.textproperties.fontitalic] = objItalic[titleHolder.textproperties.fontitalic ? "italic" : "normal"] ? [...objItalic[titleHolder.textproperties.fontitalic], index] : [index];
        if (subTitleHolder?.textproperties) objItalic[subTitleHolder.textproperties.fontitalic] = objItalic[subTitleHolder.textproperties.fontitalic ? "italic" : "normal"] ? [...objItalic[subTitleHolder.textproperties.fontitalic], index] : [index];

        if (subTitleHolder) objListType[subTitleHolder.sublist] = objListType[subTitleHolder.sublist] ? [...objListType[subTitleHolder.sublist], index] : [index];
    });

    let objBoldKey = Object.keys(objBold);
    let isBold = false;
    if (objBoldKey?.length === 1 && !objBoldKey.includes("undefined") && !objBoldKey.includes("unset")) {
        isBold = true;
    }

    let objItalicKey = Object.keys(objItalic);
    let isItalic = false;
    if (objItalicKey?.length === 1 && !objItalicKey.includes("undefined") && !objItalicKey.includes("unset")) {
        isItalic = true;
    }

    let objListTypeKey = Object.keys(objListType);
    let isList = null;
    if (objListTypeKey?.length > 0) {
        isList = objListTypeKey[0];
    }

    if (Object.keys(objCellType).length === 1) {
        return { cellType: objCellType[Object.keys(objCellType)[0]], isBold, isItalic, isList };
    }
    return null;
};

MergeCellTable.prototype.setupInLineFloaterOption = function (elTarget, strSelectionType, dictProps, event) {
    if (elTarget.getAttribute("name") == "diagramTitle" || elTarget.getAttribute("name") == "sourceText") {
        dictProps.tabletitle = {};
        return;
    }
    PresetTable.prototype.setupInLineFloaterOption.call(this, elTarget, strSelectionType, dictProps);
    let [rowIndex, colIndex] = elTarget.dataset.index.split(",").map(Number);

    this.arrPossibleMergeCells?.forEach((index) => {
        let [rowIndex, colIndex] = index.split(",").map(Number);
        let cell = this.arrTableNode[rowIndex][colIndex];
        cell.mainParent.parentElement.removeAttribute("data-selectedtype");
    });

    let supportOption = [];
    if (this.canMerge(rowIndex, colIndex, "right")) {
        supportOption.push({ floaterproperty: "mergeRight", label: "Merge Right" });
    }
    if (this.canMerge(rowIndex, colIndex, "down")) {
        supportOption.push({ floaterproperty: "mergeDown", label: "Merge Down" });
    }
    if (this.canMerge(rowIndex, colIndex, "left")) {
        supportOption.push({ floaterproperty: "mergeLeft", label: "Merge Left" });
    }
    if (this.canMerge(rowIndex, colIndex, "up")) {
        supportOption.push({ floaterproperty: "mergeUp", label: "Merge Up" });
    }
    if (this.isCellMerged(rowIndex, colIndex)) {
        supportOption.push({ floaterproperty: "unmerge", label: "Unmerge" });
    }

    let { canMerge: canMergeRow } = this.canMergeRow(rowIndex, colIndex);
    if (canMergeRow) {
        supportOption.push({ floaterproperty: "mergeRow", label: "Merge Row" });
    }

    // Add column merge option if applicable
    let { canMerge: canMergeCol } = this.canMergeColumn(colIndex);
    if (canMergeCol) {
        supportOption.push({ floaterproperty: "mergeColumn", label: "Merge Column" });
    }

    let mergeOption = {
        dpsource: supportOption,
        selectedindex: -1,
        floaterproperty: "mergecell",
    };

    dictProps.mergeOption = mergeOption;

    let cellParent = this.arrTableNode[rowIndex]?.[colIndex]?.mainParent.parentElement;
    let bgColor = cellParent ? window.getComputedStyle(cellParent).backgroundColor : "";
    dictProps.cellBgColor = {
        selectedCellIndex: [`${rowIndex},${colIndex}`],
        val: bgColor,
    };

    if (event?.shiftKey && this.focusedCellIndex?.[0] !== `${rowIndex},${colIndex}`) {
        window.getSelection().removeAllRanges();
        this.clearCtrlSelection();
        this.arrSelectedIndexes = this.arrSelectedIndexes || this.focusedCellIndex || [];
        let index = elTarget.dataset.index;
        if (!this.arrSelectedIndexes.includes(index)) this.arrSelectedIndexes.push(index);
        let result = this.canMergeSelectedCells(this.arrSelectedIndexes);
        if (this.arrSelectedIndexes.length > 1 && result.canMerge) {
            this.clearUnsupportedOption(dictProps);
            dictProps.mergeOption = {
                selectedindex: -1,
                floaterproperty: "mergecell",
            };
            dictProps.mergeOption.dpsource = [{ floaterproperty: "mergeSelectedCells", label: "Merge Selected Cells", selectedindex: this.arrSelectedIndexes }];
        } else delete dictProps.mergeOption;

        this.arrPossibleMergeCells = result.cellsToMerge?.length > 0 ? result.cellsToMerge : this.arrSelectedIndexes;
        this.arrPossibleMergeCells?.forEach((index) => {
            let [rowIndex, colIndex] = index.split(",").map(Number);
            let cell = this.arrTableNode[rowIndex][colIndex];
            cell.mainParent.parentElement.dataset.selectedtype = "shift";
        });

        dictProps.cellBgColor = {
            selectedCellIndex: this.arrPossibleMergeCells || this.focusedCellIndex,
        };
    } else if (this.arrSelectedIndexes && !event?.shiftKey) {
        this.clearMetaSelection();
        this.arrPossibleMergeCells = [`${rowIndex},${colIndex}`];
    } else if (this.arrPossibleMergeCells && event?.shiftKey) {
        this.arrPossibleMergeCells?.forEach((index) => {
            let [rowIndex, colIndex] = index.split(",").map(Number);
            let cell = this.arrTableNode[rowIndex][colIndex];
            cell.mainParent.parentElement.dataset.selectedtype = "shift";
        });
    }

    if (event?.metaKey || event?.ctrlKey) {
        this.clearMetaSelection();
        this.ctrlKeySelectedIndex = this.ctrlKeySelectedIndex || [];
        if (!this.ctrlKeySelectedIndex.includes(`${rowIndex},${colIndex}`)) this.ctrlKeySelectedIndex.push(`${rowIndex},${colIndex}`);
        this.clearUnsupportedOption(dictProps);
        this.ctrlKeySelectedIndex.forEach((index) => {
            let [rowIndex, colIndex] = index.split(",").map(Number);
            let cell = this.arrTableNode[rowIndex][colIndex];
            cell.mainParent.parentElement.dataset.selectedtype = "meta";
        });
        delete dictProps.mergeOption;
        dictProps.cellBgColor = {
            selectedCellIndex: this.ctrlKeySelectedIndex || this.focusedCellIndex,
        };
    } else if (this.ctrlKeySelectedIndex) {
        this.clearCtrlSelection();
    }

    let arrCellIndex = this.arrPossibleMergeCells || this.ctrlKeySelectedIndex;
    if (arrCellIndex) dictProps.selectedCellIndexs = arrCellIndex;
    let { cellType, isBold, isItalic, isList } = arrCellIndex?.length > 1 ? this.getCellType(arrCellIndex) : {};

    if (cellType && ["label", "heading", "headingLabel", "number", "numberLabel", "currency", "date"].includes(cellType)) {
        dictProps.addTextOtion = { isBold, isItalic };

        if (isList) {
            dictProps.textlistdecimal = {
                floaterproperty: "textlistdecimal",
                value: isList === "decimal",
            };
            dictProps.textlistbullet = {
                floaterproperty: "textlistbullet",
                value: isList === "bullet",
            };
        }
    }

    if (arrCellIndex?.length > 1) {
        dictProps.nodealign = {
            dpsource: [
                {
                    property: "left",
                    data: "left",
                    label: "left",
                    icon: "ic_text_align_left",
                },
                {
                    property: "center",
                    data: "center",
                    label: "center",
                    icon: "ic_text_align_center",
                },
                {
                    property: "right",
                    data: "right",
                    label: "right",
                    icon: "ic_text_align_right",
                },
            ],
            label: "cellalignment",
            floaterproperty: "nodealign",
            icon: "ic_text_align_left",
            val: "center",
            selectedindex: 1,
        };
    }

    this.focusedCellIndex = [`${rowIndex},${colIndex}`];
};

MergeCellTable.prototype.setupInLineHeaderFloaterOption = function (index, isRowClick, dictProps) {
    if (isRowClick) {
        let ab = this.canInsertRowAt(Number(index), "above");
        console.log("canInsertRowAt above - ", ab);
        let be = this.canInsertRowAt(Number(index), "below");
        console.log("canInsertRowAt below - ", be);

        if (!ab) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "insertrowbefore");
            dictProps.headeroption.dpsource.splice(index, 1);
        }
        if (!be) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "insertrowafter");
            dictProps.headeroption.dpsource.splice(index, 1);
        }

        if (!ab || !be) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "deleterow");
            dictProps.headeroption.dpsource.splice(index, 1);
        }

        let { canMerge: canMergeRow } = this.canMergeRow(index);
        if (canMergeRow) {
            dictProps.headeroption.dpsource.push({ property: "mergerow", floaterproperty: "mergeRow", label: "Merge Row", data: "mergerow" });
        }

        console.log("dictProps.headeroption.dpsource - ", dictProps.headeroption.dpsource);
    } else {
        let canInsertColumnAtLeft = this.canInsertColumnAt(Number(index), "left");
        let canInsertColumnAtRight = this.canInsertColumnAt(Number(index), "right");
        console.log("canInsertColumnAtLeft - ", canInsertColumnAtLeft);
        console.log("canInsertColumnAtRight - ", canInsertColumnAtRight);

        if (!canInsertColumnAtLeft) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "insertcolbefore");
            dictProps.headeroption.dpsource.splice(index, 1);
        }
        if (!canInsertColumnAtRight) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "insertcolafter");
            dictProps.headeroption.dpsource.splice(index, 1);
        }

        if (!canInsertColumnAtLeft || !canInsertColumnAtRight) {
            let index = dictProps.headeroption.dpsource.findIndex((item) => item.property === "deletecol");
            dictProps.headeroption.dpsource.splice(index, 1);
        }

        let { canMerge: canMergeCol } = this.canMergeColumn(index);
        if (canMergeCol) {
            dictProps.headeroption.dpsource.push({ property: "mergecolumn", floaterproperty: "mergeColumn", label: "Merge Column", data: "mergecolumn" });
        }
    }
};

MergeCellTable.prototype.setDiagramSpecficOption = function (dictProps) {
    if (this.tableData.properties.tableresize != "aspect-fill") {
        let position = this.tableParent.dataset.tableposition || "4";
        dictProps.tableposition = {
            selectedindex: position,
            floaterproperty: "tableposition",
            val: position,
        };
    }

    dictProps.tabletitle = {
        state: this.tableParent.dataset.tabletitle == "true" ? true : false,
        floaterproperty: "tabletitle",
        data: "tabletitle",
        label: "Table Title",
        icon: "ic_table_title",
    };

    dictProps.tablesource = {
        state: this.tableParent.dataset.tablesource == "true" ? true : false,
        floaterproperty: "tablesource",
        data: "tablesource",
        label: "Source Text",
        icon: "ic_source_text",
    };
};

MergeCellTable.prototype.updateTablePosition = function (valueObj) {
    this.tableParent.dataset.tableposition = valueObj.value.index;
    this.tableData.properties.tableposition = valueObj.value.index;
    console.log("tableData.properties.tableposition - ", this.tableData.properties.tableposition);
    setTimeout(() => {
        this.updateBtnPosition();
    }, 0);
};
