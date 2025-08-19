
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, CheckCircleIcon } from './icons';

interface JsonNodeProps {
    data: any;
    nodeKey?: string | number;
    depth: number;
    isParentArray?: boolean;
    wrapLines?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, nodeKey, depth, isParentArray = false, wrapLines = false }) => {
    // Collapse nodes deeper than the first level by default for readability
    const [isCollapsed, setIsCollapsed] = useState(depth > 1);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const valueToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(valueToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const dataType = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
    const isObject = dataType === 'object';
    const isArray = dataType === 'array';
    const isCollapsible = isObject || isArray;

    const renderValue = () => {
        switch (dataType) {
            case 'string':
                // When wrapping, allow words to break. When not, truncate the line.
                // The `min-w-0` on the parent flex container allows truncation to work.
                return <span className={`text-green-400 ${wrapLines ? 'break-words' : 'truncate'}`}>"{data}"</span>;
            case 'number': return <span className="text-blue-400">{data}</span>;
            case 'boolean': return <span className="text-yellow-500">{String(data)}</span>;
            case 'null': return <span className="text-purple-400">null</span>;
            default:
                const entries = isArray ? data : Object.entries(data);
                const bracket = isArray ? '[' : '{';
                const summary = isArray ? `Array(${entries.length})` : 'Object';
                return (
                    <span className="flex items-center">
                        <span className="text-gray-400">{summary}</span>
                        <span className="text-gray-500 ml-1">{isCollapsed ? `${bracket} ... ${isArray ? ']' : '}'}` : bracket}</span>
                    </span>
                );
        }
    };
    
    const entries = isCollapsible ? (isArray ? data : Object.entries(data)) : [];

    return (
        <div style={{ marginLeft: depth > 0 ? '1rem' : '0' }}>
            <div className="flex items-start hover:bg-gray-700/20 py-0.5 rounded">
                 <div
                    onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                   {isCollapsible && (
                       isCollapsed ? <ChevronRightIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                   )}
                </div>

                <div className="flex-1 flex items-start min-w-0">
                    {nodeKey !== undefined && (
                        <span className="mr-2 flex-shrink-0">
                            {isParentArray ? (
                                <span className="text-gray-500">{nodeKey}:</span>
                            ) : (
                                <span className="text-pink-400">"{nodeKey}":</span>
                            )}
                        </span>
                    )}
                    {renderValue()}
                </div>
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopy();
                    }}
                    className="flex-shrink-0 p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    title="Copy value"
                >
                    {copied ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                        <CopyIcon className="w-5 h-5" />
                    )}
                </button>
            </div>

            {!isCollapsed && isCollapsible && (
                <div className="border-l border-gray-700/50">
                    {entries.map((entry: any, index: number) => {
                        const [key, value] = isArray ? [index, entry] : entry;
                        return <JsonNode key={`${depth}-${key}`} nodeKey={key} data={value} depth={depth + 1} isParentArray={isArray} wrapLines={wrapLines} />;
                    })}
                    <div style={{ marginLeft: '1rem' }} className="pl-5">
                       <span className="text-gray-500">{isArray ? ']' : '}'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};


interface JsonTreeViewProps {
    data: any;
    wrapLines?: boolean;
}

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, wrapLines = false }) => {
    return (
        <div className="p-4 font-mono text-sm text-gray-300 bg-gray-800 h-full overflow-auto">
            <JsonNode data={data} depth={0} wrapLines={wrapLines} />
        </div>
    );
};

export default JsonTreeView;