import React, { useState } from "react";

const DataViewer = ({ data, properties }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [copiedData, setCopiedData] = useState("");

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    const copyToClipboard = () => {
        // Format data according to the new structure
        const formattedData = {
            nodes: data,
            properties: properties || {
                style: "type1",
                name: "table - text",
            },
        };
        const jsonData = JSON.stringify(formattedData, null, 2);
        navigator.clipboard
            .writeText(jsonData)
            .then(() => {
                alert("Table data copied to clipboard!");
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
                alert("Failed to copy data. Please try again.");
            });
    };

    const pasteFromClipboard = () => {
        navigator.clipboard
            .readText()
            .then((text) => {
                try {
                    const parsedData = JSON.parse(text);
                    setCopiedData(text);

                    // Handle both old and new data formats
                    let tableData;
                    if (parsedData.nodes) {
                        // New format with nodes and properties
                        tableData = parsedData.nodes;
                        console.log("Pasted data (new format):", parsedData);
                        console.log("Table data extracted:", tableData);
                    } else {
                        // Old format (direct array)
                        tableData = parsedData;
                        console.log("Pasted data (old format):", parsedData);
                    }

                    alert("Data pasted from clipboard! Check the console for the parsed data.");
                } catch (error) {
                    alert("Invalid JSON data in clipboard!");
                }
            })
            .catch((err) => {
                console.error("Failed to paste: ", err);
                alert("Failed to paste data. Please try again.");
            });
    };

    return (
        <>
            {/* Toggle Button */}
            <button onClick={toggleVisibility} className="fixed bottom-4 right-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 shadow-lg z-50" title="Show/Hide Table Data">
                {isVisible ? "Hide Data" : "Show Data"}
            </button>

            {/* Data Panel */}
            {isVisible && (
                <div className="fixed top-0 right-0 w-96 h-full bg-white border-l border-gray-200 shadow-lg z-40 overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800">Table Data (JSON)</h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={copyToClipboard} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors" title="Copy to Clipboard">
                                Copy
                            </button>
                            <button onClick={pasteFromClipboard} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors" title="Paste from Clipboard">
                                Paste
                            </button>
                            <button onClick={toggleVisibility} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
                                ×
                            </button>
                        </div>
                    </div>
                    <div className="p-4 h-full overflow-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                            {JSON.stringify(
                                {
                                    nodes: data,
                                    properties: properties || {
                                        style: "type1",
                                        name: "table - text",
                                    },
                                },
                                null,
                                2
                            )}
                        </pre>
                    </div>
                </div>
            )}
        </>
    );
};

export default DataViewer;
