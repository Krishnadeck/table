import React, { useState, useRef, useEffect } from "react";

const Table = ({ data, title, selectedCells, onCellSelectionChange, onAddRow, onAddColumn, onDeleteRow, onDeleteColumn, onSwapRows, onSwapColumns }) => {
    // Generate column indicators (A, B, C, D, etc.)
    const columnIndicators = data[0].map(
        (_, index) => String.fromCharCode(65 + index) // 65 is ASCII for 'A'
    );

    // Generate row indicators (1, 2, 3, 4, etc.)
    const rowIndicators = Array.from({ length: data.length }, (_, index) => (index + 1).toString());

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);

    // Cell selection state
    const [lastSelectedCell, setLastSelectedCell] = useState(null);

    // Drag selection state
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [dragStartCell, setDragStartCell] = useState(null);

    // Edit mode state
    const [editingCell, setEditingCell] = useState(null);

    // Focus cell when entering edit mode
    useEffect(() => {
        if (editingCell) {
            const [rowIndex, cellIndex] = editingCell.split(",").map(Number);
            const cellElement = document.querySelector(`[data-row="${rowIndex}"][data-col="${cellIndex}"] .cell-content`);
            if (cellElement) {
                cellElement.focus();
                // Place cursor at the end of the text
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(cellElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, [editingCell]);

    // Cell selection handler
    const handleCellClick = (rowIndex, cellIndex, event) => {
        console.log("handleCellClick called:", { rowIndex, cellIndex, shiftKey: event.shiftKey, isDraggingSelection });
        // Don't handle click if we're dragging
        if (isDraggingSelection) {
            console.log("Blocked by isDraggingSelection");
            return;
        }

        const cellKey = `${rowIndex},${cellIndex}`;

        if (event.shiftKey && lastSelectedCell) {
            console.log("Shift selection triggered:", { lastSelectedCell, currentCell: cellKey });
            // Multi-selection with Shift: select range between last selected cell and current
            const [firstRow, firstCol] = lastSelectedCell.split(",").map(Number);
            const startRow = Math.min(firstRow, rowIndex);
            const endRow = Math.max(firstRow, rowIndex);
            const startCol = Math.min(firstCol, cellIndex);
            const endCol = Math.max(firstCol, cellIndex);

            console.log("Selection bounds:", { startRow, endRow, startCol, endCol });

            // Get all visible cells in the selection range (accounting for merged cells)
            const baseSelection = getCellsInSelectionRange(startRow, endRow, startCol, endCol);
            console.log("Base selection:", baseSelection);

            // Expand selection to include all cells in merged cell spans
            const newSelection = expandSelectionForMergedCells(baseSelection);
            console.log("Final selection:", newSelection);
            onCellSelectionChange(newSelection);
        } else if (event.metaKey || event.ctrlKey) {
            // Multi-selection with Cmd/Ctrl: add/remove from selection
            const newSelection = [...selectedCells];
            const cellIndexInSelection = newSelection.indexOf(cellKey);

            if (cellIndexInSelection > -1) {
                // Remove from selection
                newSelection.splice(cellIndexInSelection, 1);
            } else {
                // Add to selection
                newSelection.push(cellKey);
            }
            onCellSelectionChange(newSelection);
        } else {
            // Single selection
            onCellSelectionChange([cellKey]);
        }

        setLastSelectedCell(cellKey);
    };

    // Double-click handler to enter edit mode
    const handleCellDoubleClick = (rowIndex, cellIndex) => {
        setEditingCell(`${rowIndex},${cellIndex}`);
    };

    // Handle content change in editable cell
    const handleContentChange = (rowIndex, cellIndex, newContent) => {
        const cell = data[rowIndex][cellIndex];
        cell.content.text = newContent;
    };

    // Handle blur to save changes and exit edit mode
    const handleCellBlur = (rowIndex, cellIndex, event) => {
        const newContent = event.target.textContent;
        handleContentChange(rowIndex, cellIndex, newContent);
        setEditingCell(null);
    };

    // Handle key press in editable cell
    const handleCellKeyDown = (rowIndex, cellIndex, event) => {
        if (event.key === "Enter" && event.shiftKey) {
            // Shift+Enter: Save and exit edit mode
            event.preventDefault();
            event.target.blur();
        } else if (event.key === "Enter") {
            // Regular Enter: Allow new line (default behavior)
            // Don't prevent default - let it create a new line
        } else if (event.key === "Escape") {
            event.preventDefault();
            // Restore original content and exit edit mode
            const cell = data[rowIndex][cellIndex];
            event.target.textContent = cell.content.text;
            setEditingCell(null);
            event.target.blur();
        }
    };

    // Handle paste to strip formatting
    const handleCellPaste = (event) => {
        event.preventDefault();

        // Get plain text from clipboard
        const plainText = event.clipboardData.getData("text/plain");

        // Insert the plain text at cursor position
        document.execCommand("insertText", false, plainText);
    };

    // Helper function to check if a cell is selected
    const isCellSelected = (rowIndex, cellIndex) => {
        const cellKey = `${rowIndex},${cellIndex}`;
        const isSelected = selectedCells.includes(cellKey);
        if (isSelected) {
            console.log(`Cell ${cellKey} is selected`);
        }
        return isSelected;
    };

    // Helper function to check if a cell is in edit mode
    const isCellEditing = (rowIndex, cellIndex) => {
        return editingCell === `${rowIndex},${cellIndex}`;
    };

    // Helper function to get all cells that should be selected when accounting for merged cells
    const getCellsInSelectionRange = (startRow, endRow, startCol, endCol) => {
        const cells = [];

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                // Check if this cell is visible (not hidden by a merge)
                if (data[r] && data[r][c] && data[r][c].mergeInfo.visible !== false) {
                    cells.push(`${r},${c}`);
                }
            }
        }

        return cells;
    };

    // Helper function to expand selection to include all cells in merged cell spans
    const expandSelectionForMergedCells = (cellKeys) => {
        const expandedSelection = new Set(cellKeys);

        cellKeys.forEach((cellKey) => {
            const [rowIndex, cellIndex] = cellKey.split(",").map(Number);
            const cell = data[rowIndex][cellIndex];

            if (cell && cell.mergeInfo.visible !== false) {
                const rowSpan = cell.mergeInfo.rowSpan || 1;
                const colSpan = cell.mergeInfo.colSpan || 1;

                // Add all cells that are part of this merged cell
                for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
                    for (let c = cellIndex; c < cellIndex + colSpan; c++) {
                        if (data[r] && data[r][c] && data[r][c].mergeInfo.visible !== false) {
                            expandedSelection.add(`${r},${c}`);
                        }
                    }
                }
            }
        });

        return Array.from(expandedSelection);
    };

    // Drag selection handlers
    const handleMouseDown = (rowIndex, cellIndex, event) => {
        console.log("handleMouseDown called:", { rowIndex, cellIndex, shiftKey: event.shiftKey });
        // Only start drag selection on left mouse button
        if (event.button !== 0) return;

        const cellKey = `${rowIndex},${cellIndex}`;
        setDragStartCell(cellKey);

        // For regular clicks (not shift/cmd), set single selection
        if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
            onCellSelectionChange([cellKey]);
        }
        // Don't set lastSelectedCell here - let handleCellClick do it after processing
    };

    const handleMouseEnter = (rowIndex, cellIndex, event) => {
        if (!dragStartCell) return;

        // Only start dragging if we move to a different cell and have moved a bit
        const currentCellKey = `${rowIndex},${cellIndex}`;
        if (!isDraggingSelection && currentCellKey !== dragStartCell) {
            console.log("Starting drag selection");
            setIsDraggingSelection(true);
        }
        const [startRow, startCol] = dragStartCell.split(",").map(Number);

        // Calculate selection bounds
        const startRowIndex = Math.min(startRow, rowIndex);
        const endRowIndex = Math.max(startRow, rowIndex);
        const startColIndex = Math.min(startCol, cellIndex);
        const endColIndex = Math.max(startCol, cellIndex);

        // Get all visible cells in the selection range
        const baseSelection = getCellsInSelectionRange(startRowIndex, endRowIndex, startColIndex, endColIndex);

        // Expand selection to include merged cell spans
        const expandedSelection = expandSelectionForMergedCells(baseSelection);

        onCellSelectionChange(expandedSelection);
    };

    const handleMouseUp = () => {
        console.log("handleMouseUp called, resetting drag state");
        setIsDraggingSelection(false);
        setDragStartCell(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {title && <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{title}</h2>}
            <div className="relative">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300" onMouseUp={handleMouseUp}>
                    <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Empty corner cell */}
                                <th className="h-5 bg-gray-100 border-b border-r border-gray-200"></th>
                                {/* Column indicators */}
                                {columnIndicators.map((indicator, index) => (
                                    <th
                                        key={index}
                                        className={`h-5 text-center text-sm font-bold text-gray-700 border-b border-r border-gray-200 group relative cursor-grab active:cursor-grabbing select-none ${
                                            draggedItem?.type === "column" && draggedItem?.index === index ? "bg-blue-100 opacity-50" : dragOverItem?.type === "column" && dragOverItem?.index === index ? "bg-yellow-100" : "bg-gray-100 hover:bg-red-50"
                                        }`}
                                        draggable
                                        onDragStart={(e) => {
                                            setDraggedItem({ type: "column", index });
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverItem({ type: "column", index });
                                        }}
                                        onDragLeave={() => setDragOverItem(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedItem && draggedItem.type === "column" && draggedItem.index !== index) {
                                                onSwapColumns(draggedItem.index, index);
                                            }
                                            setDraggedItem(null);
                                            setDragOverItem(null);
                                        }}
                                    >
                                        <span>{indicator}</span>
                                        <button
                                            onClick={() => onDeleteColumn(index)}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            title={`Delete Column ${indicator}`}
                                        >
                                            ×
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className={`${rowIndex === 0 ? "bg-gray-50" : "hover:bg-gray-50 transition-colors duration-200"} border-b border-gray-200`}>
                                    {/* Row indicator */}
                                    <td
                                        className={`w-5 h-12 text-center text-sm font-bold text-gray-700 border-r border-gray-200 group relative cursor-grab active:cursor-grabbing select-none ${
                                            draggedItem?.type === "row" && draggedItem?.index === rowIndex ? "bg-blue-100 opacity-50" : dragOverItem?.type === "row" && dragOverItem?.index === rowIndex ? "bg-yellow-100" : "bg-gray-100 hover:bg-red-50"
                                        }`}
                                        draggable
                                        onDragStart={(e) => {
                                            setDraggedItem({ type: "row", index: rowIndex });
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverItem({ type: "row", index: rowIndex });
                                        }}
                                        onDragLeave={() => setDragOverItem(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedItem && draggedItem.type === "row" && draggedItem.index !== rowIndex) {
                                                onSwapRows(draggedItem.index, rowIndex);
                                            }
                                            setDraggedItem(null);
                                            setDragOverItem(null);
                                        }}
                                    >
                                        <span>{rowIndicators[rowIndex]}</span>
                                        <button
                                            onClick={() => onDeleteRow(rowIndex)}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            title={`Delete Row ${rowIndicators[rowIndex]}`}
                                        >
                                            ×
                                        </button>
                                    </td>
                                    {/* Cells */}
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            data-row={rowIndex}
                                            data-col={cellIndex}
                                            className={`px-6 py-4 border-r border-gray-200 relative group cursor-pointer select-none ${!cell.mergeInfo.visible ? "hidden" : ""} ${rowIndex === 0 ? "text-sm font-semibold text-gray-700 uppercase tracking-wider" : "text-sm text-gray-900"} ${
                                                isCellSelected(rowIndex, cellIndex) ? "!bg-blue-100 !border-2 !border-blue-500 !ring-4 !ring-blue-500 !ring-opacity-100 !z-10 !relative !border-solid" : ""
                                            }`}
                                            rowSpan={cell.mergeInfo.rowSpan > 1 ? cell.mergeInfo.rowSpan : undefined}
                                            colSpan={cell.mergeInfo.colSpan > 1 ? cell.mergeInfo.colSpan : undefined}
                                            style={
                                                isCellSelected(rowIndex, cellIndex)
                                                    ? {
                                                          border: "2px solid #3b82f6 !important",
                                                          borderBottom: "2px solid #3b82f6 !important",
                                                          borderRight: "2px solid #3b82f6 !important",
                                                          borderTop: "2px solid #3b82f6 !important",
                                                          borderLeft: "2px solid #3b82f6 !important",
                                                          boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.5)",
                                                          position: "relative",
                                                          zIndex: 10,
                                                      }
                                                    : {}
                                            }
                                            onClick={(e) => handleCellClick(rowIndex, cellIndex, e)}
                                            onDoubleClick={() => handleCellDoubleClick(rowIndex, cellIndex)}
                                            onMouseDown={(e) => handleMouseDown(rowIndex, cellIndex, e)}
                                            onMouseEnter={(e) => handleMouseEnter(rowIndex, cellIndex, e)}
                                        >
                                            <div
                                                className={`cell-content outline-none rounded px-1 -mx-1 whitespace-pre-wrap ${isCellEditing(rowIndex, cellIndex) ? "focus:bg-blue-50 focus:ring-1 focus:ring-blue-300" : "cursor-pointer"}`}
                                                contentEditable={isCellEditing(rowIndex, cellIndex)}
                                                suppressContentEditableWarning={true}
                                                onBlur={(e) => handleCellBlur(rowIndex, cellIndex, e)}
                                                onKeyDown={(e) => handleCellKeyDown(rowIndex, cellIndex, e)}
                                                onPaste={handleCellPaste}
                                                style={{
                                                    fontSize: rowIndex === 0 ? "0.875rem" : "0.875rem",
                                                    fontWeight: rowIndex === 0 ? "600" : "400",
                                                    textTransform: rowIndex === 0 ? "uppercase" : "none",
                                                    letterSpacing: rowIndex === 0 ? "0.05em" : "normal",
                                                    minHeight: "1.5rem",
                                                }}
                                            >
                                                {cell.content.text}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Column Button - Positioned outside table */}
                <button onClick={onAddColumn} className="absolute top-0 -right-6 w-5 h-5 bg-gray-100 hover:bg-red-50 text-gray-700 border border-gray-200 rounded flex items-center justify-center text-sm font-bold transition-colors duration-200 z-10" title="Add Column">
                    +
                </button>

                {/* Add Row Button - Positioned outside table */}
                <button onClick={onAddRow} className="absolute bottom-[-22px] w-5 h-5 bg-gray-100 hover:bg-red-50 text-gray-700 border border-gray-200 rounded flex items-center justify-center text-sm font-bold transition-colors duration-200 z-10" title="Add Row">
                    +
                </button>
            </div>
        </div>
    );
};

export default Table;
