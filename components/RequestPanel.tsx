import React, { useState, useEffect } from 'react';
import { TestResult } from '../types';
import CodeEditor from './CodeEditor';
import JsonTreeView from './JsonTreeView';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ResponsePanelProps {
    response: any;
    loading: boolean;
    testResults: TestResult[];
}

type ResponseTab = 'Body' | 'Headers' | 'Tests';
type BodyViewMode = 'raw' | 'tree';

const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, loading, testResults }) => {
    const [activeTab, setActiveTab] = useState<ResponseTab>('Body');
    const [bodyViewMode, setBodyViewMode] = useState<BodyViewMode>('raw');
    const [wrapLines, setWrapLines] = useState(false);

    // Reset to raw view when the response changes to avoid showing old tree data
    useEffect(() => {
        setBodyViewMode('raw');
        setWrapLines(false);
        // If there are test results, switch to the Tests tab automatically
        if (testResults.length > 0) {
            setActiveTab('Tests');
        } else {
            setActiveTab('Body');
        }
    }, [response, testResults]);


    const renderTabs = () => {
        const passedTests = testResults.filter(r => r.passed).length;

        return (
            <div className="flex items-center border-b border-gray-700">
                <div className="flex">
                    {(['Body', 'Headers', 'Tests'] as ResponseTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            {tab}
                            {tab === 'Tests' && testResults.length > 0 && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                    {passedTests} / {testResults.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center space-x-4 pr-4">
                    {response && response.status && (
                        <span className={`text-sm font-semibold ${response.status >= 200 && response.status < 300 ? 'text-green-400' : 'text-red-400'}`}>
                            Status: {response.status} {response.statusText}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return <div className="p-4 text-gray-400 flex items-center justify-center h-full">Loading...</div>;
        }
        if (!response) {
            return <div className="p-4 text-gray-400 flex items-center justify-center h-full">Envíe una solicitud para ver la respuesta.</div>;
        }

        switch (activeTab) {
            case 'Body':
                const isJsonObject = typeof response.body === 'object' && response.body !== null;

                return (
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 p-1.5 border-b border-gray-700 flex items-center justify-end space-x-1 bg-gray-900">
                            <button
                                onClick={() => setWrapLines(!wrapLines)}
                                title="Toggle line wrapping"
                                className={`px-2 py-1 text-xs rounded ${wrapLines ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                Wrap Lines
                            </button>
                            {isJsonObject && (
                                <>
                                    <button onClick={() => setBodyViewMode('raw')} className={`px-2 py-1 text-xs rounded ${bodyViewMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                        Raw
                                    </button>
                                    <button onClick={() => setBodyViewMode('tree')} className={`px-2 py-1 text-xs rounded ${bodyViewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                        Tree
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto">
                           {(isJsonObject && bodyViewMode === 'tree') ? (
                               <JsonTreeView data={response.body} wrapLines={wrapLines} />
                           ) : (
                               <CodeEditor 
                                    value={isJsonObject ? JSON.stringify(response.body, null, 2) : String(response.body)} 
                                    readOnly 
                                    language={isJsonObject ? 'json' : 'text'} 
                                    wrapLines={wrapLines} 
                               />
                           )}
                        </div>
                    </div>
                );
            case 'Headers':
                return <CodeEditor value={JSON.stringify(response.headers, null, 2)} readOnly language="json" wrapLines={wrapLines} />;
            case 'Tests':
                if (testResults.length === 0) {
                    return <div className="p-4 text-gray-400 flex items-center justify-center h-full">No tests found or executed for this request.</div>;
                }
                return (
                    <div className="p-4 space-y-2 overflow-y-auto h-full">
                        {testResults.map((result, index) => (
                            <div key={index} className="flex items-start">
                                {result.passed ? (
                                    <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <span className={result.passed ? 'text-gray-300' : 'text-red-400'}>{result.name}</span>
                                    {!result.passed && result.error && (
                                        <pre className="text-xs text-red-300 bg-red-900/50 p-2 mt-1 rounded">{result.error}</pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-gray-800">
            {renderTabs()}
            <div className="flex-1 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default ResponsePanel;
