// Helper function to create a cell object
export const createCell = (text) => ({
    content: {
        text: text,
    },
    mergeInfo: {
        visible: true,
        rowSpan: 1,
        colSpan: 1,
    },
});

// Helper function to check if a cell is visible
export const isCellVisible = (cell) => {
    return cell.mergeInfo && cell.mergeInfo.visible !== false;
};

// Helper function to get cell text content
export const getCellText = (cell) => {
    return cell.content?.text || "";
};

// Helper function to set cell text content
export const setCellText = (cell, text) => {
    if (cell.content) {
        cell.content.text = text;
    }
    return cell;
};

// Helper function to check if a cell is merged
export const isCellMerged = (cell) => {
    return cell.mergeInfo && (cell.mergeInfo.rowSpan > 1 || cell.mergeInfo.colSpan > 1);
};

// Helper function to create a new row with empty cells
export const createEmptyRow = (columnCount) => {
    return Array.from({ length: columnCount }, () => createCell(""));
};

// Helper function to create a new column with empty cells
export const createEmptyColumn = (rowCount) => {
    return Array.from({ length: rowCount }, () => createCell(""));
};

// Helper function to find the next visible cell in a direction
export const findNextVisibleCell = (data, rowIndex, colIndex, direction) => {
    const rowCount = data.length;
    const colCount = data[0].length;

    switch (direction) {
        case "right":
            for (let c = colIndex + 1; c < colCount; c++) {
                if (isCellVisible(data[rowIndex][c])) return c;
            }
            break;
        case "left":
            for (let c = colIndex - 1; c >= 0; c--) {
                if (isCellVisible(data[rowIndex][c])) return c;
            }
            break;
        case "down":
            for (let r = rowIndex + 1; r < rowCount; r++) {
                if (isCellVisible(data[r][colIndex])) return r;
            }
            break;
        case "up":
            for (let r = rowIndex - 1; r >= 0; r--) {
                if (isCellVisible(data[r][colIndex])) return r;
            }
            break;
    }
    return -1;
};

// Helper function to validate if a merge is possible
export const canMerge = (data, rowIndex, colIndex, direction) => {
    const currentCell = data[rowIndex][colIndex];
    const rowSpan = currentCell.mergeInfo?.rowSpan || 1;
    const colSpan = currentCell.mergeInfo?.colSpan || 1;

    switch (direction) {
        case "right": {
            // Check if there's a next column
            const nextCol = colIndex + colSpan;
            if (nextCol >= data[0].length) return false;

            // Check if all cells in the span can be merged
            for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
                if (!isCellVisible(data[r][nextCol])) return false;
            }
            return true;
        }
        case "down": {
            // Check if there's a next row
            const nextRow = rowIndex + rowSpan;
            if (nextRow >= data.length) return false;

            // Check if all cells in the span can be merged
            for (let c = colIndex; c < colIndex + colSpan; c++) {
                if (!isCellVisible(data[nextRow][c])) return false;
            }
            return true;
        }
        case "left": {
            if (colIndex <= 0) return false;
            const prevCol = colIndex - 1;

            // Check if all cells in the span can be merged
            for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
                if (!isCellVisible(data[r][prevCol])) return false;
            }
            return true;
        }
        case "up": {
            if (rowIndex <= 0) return false;
            const prevRow = rowIndex - 1;

            // Check if all cells in the span can be merged
            for (let c = colIndex; c < colIndex + colSpan; c++) {
                if (!isCellVisible(data[prevRow][c])) return false;
            }
            return true;
        }
        default:
            return false;
    }
};
