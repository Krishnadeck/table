import React, { useState } from "react";
import Table from "./components/Table";
import OptionsView from "./components/OptionsView";
import DataViewer from "./components/DataViewer";
import { createCell, createEmptyRow, createEmptyColumn, canMerge, findNextVisibleCell } from "./utils/tableUtils";
import "./App.css";

function App() {
    // Sample data for the table (including headers as first row)
    const [data, setData] = useState([
        [createCell("a1"), createCell("b1"), createCell("c1"), createCell("d1")],
        [createCell("a2"), createCell("b2"), createCell("c2"), createCell("d2")],
        [createCell("a3"), createCell("b3"), createCell("c3"), createCell("d3")],
        [createCell("a4"), createCell("b4"), createCell("c4"), createCell("d4")],
        [createCell("a5"), createCell("b5"), createCell("c5"), createCell("d5")],
    ]);

    // Table properties
    const [tableProperties, setTableProperties] = useState({
        style: "type1",
        name: "table - text",
    });

    // Cell selection state
    const [selectedCells, setSelectedCells] = useState([]);

    const handleAddRow = () => {
        const newRow = createEmptyRow(data[0].length); // Create empty cells for new row
        setData([...data, newRow]);
    };

    const handleAddColumn = () => {
        const newHeader = createCell(`Column ${String.fromCharCode(65 + data[0].length)}`); // Generate new header name

        // Add empty cell to each existing row
        const updatedData = data.map((row) => [...row, createCell("")]);
        setData(updatedData);
    };

    const handleDeleteRow = (rowIndex) => {
        if (rowIndex === -1) {
            // Delete header row (not recommended, but possible)
            alert("Cannot delete header row. Please delete individual data rows instead.");
            return;
        }

        if (data.length <= 1) {
            alert("Cannot delete the last row. At least one data row must remain.");
            return;
        }

        const updatedData = data.filter((_, index) => index !== rowIndex);
        setData(updatedData);
    };

    const handleDeleteColumn = (columnIndex) => {
        if (data[0].length <= 1) {
            alert("Cannot delete the last column. At least one column must remain.");
            return;
        }

        // Remove the corresponding column from each row
        const updatedData = data.map((row) => row.filter((_, index) => index !== columnIndex));
        setData(updatedData);
    };

    const handleSwapRows = (fromIndex, toIndex) => {
        const updatedData = [...data];

        if (fromIndex === -1) {
            // Swapping header row (not recommended, but possible)
            alert("Cannot swap header row. Please swap individual data rows instead.");
            return;
        }

        if (toIndex === -1) {
            // Swapping with header row (not recommended, but possible)
            alert("Cannot swap with header row. Please swap individual data rows instead.");
            return;
        }

        // Swap the rows
        [updatedData[fromIndex], updatedData[toIndex]] = [updatedData[toIndex], updatedData[fromIndex]];
        setData(updatedData);
    };

    const handleSwapColumns = (fromIndex, toIndex) => {
        const updatedData = data.map((row) => [...row]);

        // Swap the columns in each row
        updatedData.forEach((row) => {
            [row[fromIndex], row[toIndex]] = [row[toIndex], row[fromIndex]];
        });

        setData(updatedData);
    };

    // Merge functionality
    const handleMergeRight = (rowIndex, colIndex) => {
        const updatedData = [...data];
        const currentCell = updatedData[rowIndex][colIndex];

        if (!canMerge(updatedData, rowIndex, colIndex, "right")) {
            alert("Cannot merge right - no visible cell to merge with");
            return;
        }

        const rowSpan = currentCell.mergeInfo.rowSpan || 1;
        const colSpan = currentCell.mergeInfo.colSpan || 1;
        const nextColIndex = colIndex + colSpan;

        // For all rows in the current cell's rowSpan
        for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
            const targetCell = updatedData[r][nextColIndex];
            const targetColSpan = targetCell.mergeInfo?.colSpan || 1;

            // Only update colSpan on the first row
            if (r === rowIndex) {
                currentCell.mergeInfo.colSpan += targetColSpan;
            }

            // Hide the target cell
            targetCell.mergeInfo.visible = false;
        }

        setData(updatedData);
    };

    const handleMergeDown = (rowIndex, colIndex) => {
        const updatedData = [...data];
        const currentCell = updatedData[rowIndex][colIndex];

        if (!canMerge(updatedData, rowIndex, colIndex, "down")) {
            alert("Cannot merge down - no visible cell to merge with");
            return;
        }

        const rowSpan = currentCell.mergeInfo.rowSpan || 1;
        const colSpan = currentCell.mergeInfo.colSpan || 1;
        const nextRowIndex = rowIndex + rowSpan;

        // For all columns in the current cell's colSpan
        for (let c = colIndex; c < colIndex + colSpan; c++) {
            const targetCell = updatedData[nextRowIndex][c];

            // Hide the target cell
            targetCell.mergeInfo.visible = false;
        }

        // Increase rowSpan of the current cell
        currentCell.mergeInfo.rowSpan += 1;

        setData(updatedData);
    };

    const handleMergeLeft = (rowIndex, colIndex) => {
        const updatedData = [...data];
        const currentCell = updatedData[rowIndex][colIndex];

        if (!canMerge(updatedData, rowIndex, colIndex, "left")) {
            alert("Cannot merge left - no visible cell to merge with");
            return;
        }

        const rowSpan = currentCell.mergeInfo.rowSpan || 1;
        const colSpan = currentCell.mergeInfo.colSpan || 1;
        const prevColIndex = colIndex - 1;

        // Store the content from the current cell to preserve it
        const currentCellContent = currentCell.content.text || "";

        // For each row in the current cell's rowSpan, merge with the cell to the left
        for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
            const targetCell = updatedData[r][prevColIndex];
            const targetColSpan = targetCell.mergeInfo?.colSpan || 1;
            const targetRowSpan = targetCell.mergeInfo?.rowSpan || 1;

            // Only update span properties on the first row (the main cell)
            if (r === rowIndex) {
                // Extend the target cell's colSpan to include the current cell
                targetCell.mergeInfo.colSpan = targetColSpan + colSpan;

                // If the current cell has a larger rowSpan, update the target's rowSpan
                if (rowSpan > targetRowSpan) {
                    targetCell.mergeInfo.rowSpan = rowSpan;
                }

                // Preserve content - prefer current cell content if it exists
                if (currentCellContent && currentCellContent.trim() !== "") {
                    targetCell.content.text = currentCellContent;
                }
            }

            // Hide the current cell in this row
            const cellToHide = updatedData[r][colIndex];
            cellToHide.mergeInfo.visible = false;
        }

        setData(updatedData);
    };

    const handleMergeUp = (rowIndex, colIndex) => {
        const updatedData = [...data];
        const currentCell = updatedData[rowIndex][colIndex];

        if (!canMerge(updatedData, rowIndex, colIndex, "up")) {
            alert("Cannot merge up - no visible cell to merge with");
            return;
        }

        const rowSpan = currentCell.mergeInfo.rowSpan || 1;
        const colSpan = currentCell.mergeInfo.colSpan || 1;
        const prevRowIndex = rowIndex - 1;

        // Find visible cells in the upper row within our column span
        let targetCells = [];
        for (let c = colIndex; c < colIndex + colSpan; c++) {
            if (updatedData[prevRowIndex][c].mergeInfo.visible !== false) {
                targetCells.push({
                    col: c,
                    cell: updatedData[prevRowIndex][c],
                });
            }
        }

        if (targetCells.length > 0) {
            // Use the leftmost cell as the main cell
            const mainTarget = targetCells[0];

            // Update the main target cell
            mainTarget.cell.mergeInfo.rowSpan = (mainTarget.cell.mergeInfo.rowSpan || 1) + rowSpan;
            mainTarget.cell.mergeInfo.colSpan = colSpan;
            mainTarget.cell.content.text = currentCell.content.text; // Copy the content

            // Hide other cells in the upper row within our span
            for (let i = 1; i < targetCells.length; i++) {
                const cell = targetCells[i].cell;
                cell.mergeInfo.visible = false;
            }

            // Hide all cells in current row within our span
            for (let c = colIndex; c < colIndex + colSpan; c++) {
                const cell = updatedData[rowIndex][c];
                cell.mergeInfo.visible = false;
            }
        }

        setData(updatedData);
    };

    const handleUnmerge = (rowIndex, colIndex) => {
        const updatedData = [...data];
        const currentCell = updatedData[rowIndex][colIndex];

        if (currentCell.mergeInfo.rowSpan <= 1 && currentCell.mergeInfo.colSpan <= 1) {
            alert("Cell is not merged");
            return;
        }

        // Reset spans
        currentCell.mergeInfo.rowSpan = 1;
        currentCell.mergeInfo.colSpan = 1;

        // Make all cells in the merge area visible again
        for (let r = rowIndex; r < updatedData.length; r++) {
            for (let c = colIndex; c < updatedData[r].length; c++) {
                if (r === rowIndex && c === colIndex) continue;

                const cell = updatedData[r][c];
                if (cell && !cell.mergeInfo.visible) {
                    cell.mergeInfo.visible = true;
                    cell.mergeInfo.rowSpan = 1;
                    cell.mergeInfo.colSpan = 1;
                }
            }
        }

        setData(updatedData);
    };

    // Cell operation handlers
    const handleDeleteCells = (selectedCells) => {
        const updatedData = [...data];

        selectedCells.forEach((cellKey) => {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            if (updatedData[rowIndex] && updatedData[rowIndex][cellIndex]) {
                updatedData[rowIndex][cellIndex].content.text = "";
            }
        });

        setData(updatedData);
    };

    const handleCopyCells = (selectedCells) => {
        const cellData = selectedCells.map((cellKey) => {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            return {
                rowIndex,
                cellIndex,
                content: data[rowIndex][cellIndex].content.text,
            };
        });

        localStorage.setItem("copiedCells", JSON.stringify(cellData));
        alert(`Copied ${selectedCells.length} cell(s) to clipboard`);
    };

    const handlePasteCells = () => {
        const copiedData = localStorage.getItem("copiedCells");
        if (!copiedData) {
            alert("No cells copied to clipboard");
            return;
        }

        const cellData = JSON.parse(copiedData);
        const updatedData = [...data];

        cellData.forEach(({ rowIndex, cellIndex, content }) => {
            if (updatedData[rowIndex] && updatedData[rowIndex][cellIndex]) {
                updatedData[rowIndex][cellIndex].content.text = content;
            }
        });

        setData(updatedData);
        alert(`Pasted ${cellData.length} cell(s)`);
    };

    // Merge selected cells handler
    const handleMergeSelected = (selectedCells) => {
        if (selectedCells.length < 2) {
            alert("Please select at least 2 cells to merge");
            return;
        }

        const updatedData = [...data];

        // Parse all selected cell coordinates
        const cellCoords = selectedCells.map((cellKey) => {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            return { rowIndex, cellIndex };
        });

        // Sort by row first, then by column
        cellCoords.sort((a, b) => {
            if (a.rowIndex !== b.rowIndex) {
                return a.rowIndex - b.rowIndex;
            }
            return a.cellIndex - b.cellIndex;
        });

        // Find the bounds of the selection
        const minRow = Math.min(...cellCoords.map((c) => c.rowIndex));
        const maxRow = Math.max(...cellCoords.map((c) => c.rowIndex));
        const minCol = Math.min(...cellCoords.map((c) => c.cellIndex));
        const maxCol = Math.max(...cellCoords.map((c) => c.cellIndex));

        // Check if selection is rectangular (accounting for hidden cells)
        const expectedCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        const visibleCellsInArea = [];

        // Count only visible cells in the rectangular area
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (updatedData[r] && updatedData[r][c] && updatedData[r][c].mergeInfo.visible !== false) {
                    visibleCellsInArea.push(`${r},${c}`);
                }
            }
        }

        if (cellCoords.length !== visibleCellsInArea.length) {
            alert("Please select a rectangular area for merging");
            return;
        }

        // Use the top-left cell as the main cell
        const mainCell = updatedData[minRow][minCol];
        const mainCellContent = mainCell.content.text;

        // Calculate spans
        const rowSpan = maxRow - minRow + 1;
        const colSpan = maxCol - minCol + 1;

        // Update the main cell
        mainCell.mergeInfo.rowSpan = rowSpan;
        mainCell.mergeInfo.colSpan = colSpan;
        mainCell.mergeInfo.visible = true;

        // Hide all other cells in the selection
        cellCoords.forEach(({ rowIndex, cellIndex }) => {
            if (rowIndex === minRow && cellIndex === minCol) {
                return; // Skip the main cell
            }
            const cell = updatedData[rowIndex][cellIndex];
            cell.mergeInfo.visible = false;
            cell.mergeInfo.rowSpan = 1;
            cell.mergeInfo.colSpan = 1;
        });

        setData(updatedData);
        alert(`Merged ${selectedCells.length} cells into one`);
    };

    // Centralized option handler
    const handleOptionAction = (action, cellKey = null) => {
        if (action === "deleteCells") {
            handleDeleteCells(selectedCells);
        } else if (action === "copyCells") {
            handleCopyCells(selectedCells);
        } else if (action === "pasteCells") {
            handlePasteCells();
        } else if (action === "mergeRight" && cellKey) {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            handleMergeRight(rowIndex, cellIndex);
        } else if (action === "mergeDown" && cellKey) {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            handleMergeDown(rowIndex, cellIndex);
        } else if (action === "mergeLeft" && cellKey) {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            handleMergeLeft(rowIndex, cellIndex);
        } else if (action === "mergeUp" && cellKey) {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            handleMergeUp(rowIndex, cellIndex);
        } else if (action === "unmerge" && cellKey) {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            handleUnmerge(rowIndex, cellIndex);
        } else if (action === "mergeSelected") {
            handleMergeSelected(cellKey);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Employee Directory</h1>
                <Table data={data} title="Employee Information" selectedCells={selectedCells} onCellSelectionChange={setSelectedCells} onAddRow={handleAddRow} onAddColumn={handleAddColumn} onDeleteRow={handleDeleteRow} onDeleteColumn={handleDeleteColumn} onSwapRows={handleSwapRows} onSwapColumns={handleSwapColumns} />
            </div>

            {/* Options View */}
            <OptionsView selectedCells={selectedCells} onOptionAction={handleOptionAction} data={data} />

            {/* Data Viewer */}
            <DataViewer data={data} properties={tableProperties} />
        </div>
    );
}

export default App;
