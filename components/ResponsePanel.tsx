
import React, { useState, useEffect } from 'react';
import { ResponseData } from '../types';
import CodeEditor from './CodeEditor';
import JsonTreeView from './JsonTreeView';
import { CheckCircleIcon, XCircleIcon, DocumentReportIcon, SearchIcon, DownloadIcon } from './icons';

interface ResponsePanelProps {
    responseData: ResponseData | null;
    loading: boolean;
    onOpenReport: () => void;
    onOpenTestReport: () => void;
}

type ResponseTab = 'Body' | 'Headers' | 'Tests';
type BodyViewMode = 'raw' | 'tree';

const ResponsePanel: React.FC<ResponsePanelProps> = ({ responseData, loading, onOpenReport, onOpenTestReport }) => {
    const [activeTab, setActiveTab] = useState<ResponseTab>('Body');
    const [bodyViewMode, setBodyViewMode] = useState<BodyViewMode>('raw');
    const [wrapLines, setWrapLines] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const response = responseData?.response;
    const testResults = responseData?.testResults || [];

    // Reset view state when responseData changes
    useEffect(() => {
        setBodyViewMode('raw');
        setWrapLines(false);
        setSearchQuery('');
        
        if (responseData?.downloadInfo) {
            setActiveTab('Body');
        } else if (responseData?.testResults && responseData.testResults.length > 0) {
            setActiveTab('Tests');
        } else {
            setActiveTab('Body');
        }
    }, [responseData]);


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
                    {response && response.status > 0 && (
                       <>
                         <button 
                            onClick={onOpenReport} 
                            title="Crear Reporte" 
                            className="p-1.5 rounded text-gray-400 hover:bg-gray-600 hover:text-white"
                         >
                            <DocumentReportIcon className="w-5 h-5"/>
                        </button>
                        <span className={`text-sm font-semibold ${response.status >= 200 && response.status < 300 ? 'text-green-400' : 'text-red-400'}`}>
                            Status: {response.status} {response.statusText}
                        </span>
                       </>
                    )}
                     {response && response.status === 0 && (
                         <span className="text-sm font-semibold text-red-400">
                            Status: {response.statusText}
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
                 if (responseData?.downloadInfo) {
                    const { url, filename, type, size } = responseData.downloadInfo;
                    const sizeInMB = (size / (1024 * 1024)).toFixed(2);
                    return (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-800">
                            <DownloadIcon className="w-16 h-16 text-blue-400 mb-4" />
                            <h2 className="text-xl font-bold text-gray-200 mb-2">Archivo Listo para Descargar</h2>
                            <div className="text-left bg-gray-900 p-4 rounded-lg mb-4 shadow-md">
                                <p className="text-gray-300"><span className="font-semibold text-gray-400 w-20 inline-block">Nombre:</span> {filename}</p>
                                <p className="text-gray-300"><span className="font-semibold text-gray-400 w-20 inline-block">Tipo:</span> {type || 'desconocido'}</p>
                                <p className="text-gray-300"><span className="font-semibold text-gray-400 w-20 inline-block">Tamaño:</span> {sizeInMB} MB ({size.toLocaleString()} bytes)</p>
                            </div>
                            <a
                                href={url}
                                download={filename}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors shadow-lg"
                            >
                                <DownloadIcon className="h-5 w-5 mr-2" />
                                Descargar Archivo
                            </a>
                        </div>
                    );
                }

                const isJsonObject = typeof response.body === 'object' && response.body !== null;
                const showCodeEditor = (isJsonObject && bodyViewMode === 'raw') || !isJsonObject;

                return (
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 p-1.5 border-b border-gray-700 flex items-center justify-between space-x-2 bg-gray-900">
                             {showCodeEditor ? (
                                <div className="relative flex-grow max-w-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <SearchIcon className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search Body..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-700 border border-transparent rounded-md py-1 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            ) : (
                                <div /> /* Placeholder for justify-between */
                            )}

                            <div className="flex items-center justify-end space-x-1">
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
                        </div>
                        <div className="flex-1 overflow-auto">
                           {showCodeEditor ? (
                               <CodeEditor 
                                    value={isJsonObject ? JSON.stringify(response.body, null, 2) : String(response.body)} 
                                    readOnly 
                                    language={isJsonObject ? 'json' : 'text'} 
                                    wrapLines={wrapLines} 
                                    searchQuery={searchQuery}
                               />
                           ) : (
                               <JsonTreeView data={response.body} wrapLines={wrapLines} />
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
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 p-2 border-b border-gray-700 flex items-center justify-start">
                            <button
                                onClick={onOpenTestReport}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-white font-semibold flex items-center text-sm transition-colors"
                            >
                                <DocumentReportIcon className="w-5 h-5 mr-2" />
                                Generar Reporte de Tests
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto h-full">
                            {testResults.map((result, index) => (
                                <div key={index} className="py-2">
                                    <div className="flex items-center">
                                        {result.passed ? (
                                            <CheckCircleIcon className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 mr-3 text-red-400 flex-shrink-0" />
                                        )}
                                        <span className={`font-medium ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
                                            {result.name}
                                        </span>
                                    </div>
                                    {!result.passed && result.error && (
                                        <pre className="text-sm text-red-200 bg-red-900/60 border border-red-700 p-3 mt-1.5 rounded-md ml-8 font-mono whitespace-pre-wrap break-all">
                                            {result.error}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
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
