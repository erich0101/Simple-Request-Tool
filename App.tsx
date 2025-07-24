

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PostmanCollection, PostmanItem, PostmanRequest, TestResult, ResponseData, Environment, EnvironmentValue } from './types';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import { runTests } from './services/testRunner';
import { generateTestsForRequest } from './services/geminiService';
import Modal from './components/Modal';
import ImportModal from './components/ImportModal';
import { parseOpenApi } from './services/openapiParser';
import yaml from 'js-yaml';
import ApiKeyModal from './components/ApiKeyModal';
import { MenuIcon, ImportIcon } from './components/icons';
import ConfirmationModal from './components/ConfirmationModal';
import ExportModal from './components/ExportModal';
import { exportToOpenApi } from './services/openapiExporter';
import EnvironmentModal from './components/EnvironmentModal';

// --- START HELPER FUNCTIONS ---
const getActiveEnvironmentVariables = (environments: Environment[], activeEnvironmentId: string | null): Record<string, string> => {
    if (!activeEnvironmentId) return {};
    const activeEnv = environments.find(env => env.id === activeEnvironmentId);
    if (!activeEnv) return {};
    return activeEnv.values.reduce((acc, v) => {
        if (v.enabled && v.key) {
            acc[v.key] = v.value;
        }
        return acc;
    }, {} as Record<string, string>);
};

const replaceVariables = (str: string, variables: Record<string, string>): string => {
    if (!str) return '';
    // Replace {{variable}} with its value, or leave it if not found
    return str.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
};

const findItemById = (items: PostmanItem[], id: string): PostmanItem | null => {
    for (const item of items) {
        if (item.id === id) {
            return item;
        }
        if (item.item) { // It's a folder
            const found = findItemById(item.item, id);
            if (found) return found;
        }
    }
    return null;
};

// --- END HELPER FUNCTIONS ---


const App: React.FC = () => {
    const [collection, setCollection] = useState<PostmanCollection | null>(null);
    const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, ResponseData>>({});
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [isErrorModalOpen, setErrorModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEnvironmentModalOpen, setIsEnvironmentModalOpen] = useState(false);

    // --- Environment State ---
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null);

    // --- Responsive State ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mainView, setMainView] = useState<'request' | 'response'>('request');


    const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>(
        () => (localStorage.getItem('miniPostmanLayoutMode') as 'horizontal' | 'vertical') || 'horizontal'
    );
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const savedWidth = localStorage.getItem('miniPostmanSidebarWidth');
        const width = savedWidth ? parseInt(savedWidth, 10) : 320;
        return isNaN(width) ? 320 : Math.max(240, Math.min(width, 600)); // Constraints
    });
     const [requestPanelHeight, setRequestPanelHeight] = useState<number>(() => {
        const savedHeight = localStorage.getItem('miniPostmanRequestPanelHeight');
        const height = savedHeight ? parseInt(savedHeight, 10) : 300;
        return isNaN(height) ? 300 : Math.max(150, Math.min(height, 800));
    });

    useEffect(() => {
        const savedCollection = localStorage.getItem('miniPostmanCollection');
        if (savedCollection) {
            setCollection(JSON.parse(savedCollection));
        }
        const savedResponses = localStorage.getItem('miniPostmanResponses');
        if (savedResponses) {
            const parsedResponses = JSON.parse(savedResponses);
            // Hydrate responses to ensure the response object exists, preventing inconsistencies
            const hydratedResponses: Record<string, ResponseData> = {};
            for (const key in parsedResponses) {
                hydratedResponses[key] = {
                    response: parsedResponses[key].response || null,
                    testResults: parsedResponses[key].testResults || []
                }
            }
            setResponses(hydratedResponses);
        }
        const savedActiveId = localStorage.getItem('miniPostmanActiveId');
        if (savedActiveId) {
            setActiveRequestId(JSON.parse(savedActiveId));
        }
        const savedOpenFolders = localStorage.getItem('miniPostmanOpenFolders');
        if (savedOpenFolders) {
            setOpenFolders(JSON.parse(savedOpenFolders));
        }
        const savedApiKey = localStorage.getItem('geminiApiKey');
        if (savedApiKey) {
            setApiKey(savedApiKey);
        }
        const savedEnvironments = localStorage.getItem('miniPostmanEnvironments');
        if (savedEnvironments) {
            setEnvironments(JSON.parse(savedEnvironments));
        }
        const savedActiveEnvId = localStorage.getItem('miniPostmanActiveEnvId');
        if (savedActiveEnvId) {
            setActiveEnvironmentId(JSON.parse(savedActiveEnvId));
        }
    }, []);

    useEffect(() => {
        if (collection) {
            localStorage.setItem('miniPostmanCollection', JSON.stringify(collection));
        }
    }, [collection]);

     useEffect(() => {
        const responsesToSave: Record<string, { response: any, testResults: TestResult[] }> = {};
        Object.keys(responses).forEach(key => {
            if (responses[key]) {
                 responsesToSave[key] = {
                    response: responses[key].response || null,
                    testResults: responses[key].testResults || [],
                 };
            }
        });
        localStorage.setItem('miniPostmanResponses', JSON.stringify(responsesToSave));
    }, [responses]);

    useEffect(() => {
        localStorage.setItem('miniPostmanLayoutMode', layoutMode);
    }, [layoutMode]);

    useEffect(() => {
        localStorage.setItem('miniPostmanActiveId', JSON.stringify(activeRequestId));
    }, [activeRequestId]);

    useEffect(() => {
        localStorage.setItem('miniPostmanOpenFolders', JSON.stringify(openFolders));
    }, [openFolders]);

    useEffect(() => {
        localStorage.setItem('miniPostmanSidebarWidth', String(sidebarWidth));
    }, [sidebarWidth]);
    
    useEffect(() => {
        localStorage.setItem('miniPostmanRequestPanelHeight', String(requestPanelHeight));
    }, [requestPanelHeight]);

     useEffect(() => {
        if (apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
        } else {
            localStorage.removeItem('geminiApiKey');
        }
    }, [apiKey]);
    
    useEffect(() => {
        localStorage.setItem('miniPostmanEnvironments', JSON.stringify(environments));
    }, [environments]);
    
    useEffect(() => {
        localStorage.setItem('miniPostmanActiveEnvId', JSON.stringify(activeEnvironmentId));
    }, [activeEnvironmentId]);
    
    const activeRequestItem = activeRequestId && collection ? findItemById(collection.item, activeRequestId) : null;
    const activeResponseData = activeRequestId ? responses[activeRequestId] : null;
    const activeEnvironmentVariables = getActiveEnvironmentVariables(environments, activeEnvironmentId);

    // --- START HANDLERS ---
    
    const handleSendRequest = async (item: PostmanItem, files?: Record<string, File>) => {
        if (!item.request?.url?.raw) return;
        setLoadingItemId(item.id!);
        
        try {
            const variables = getActiveEnvironmentVariables(environments, activeEnvironmentId);
            
            const url = replaceVariables(item.request.url.raw, variables);
            
            const headers = new Headers();
            item.request.header?.forEach(h => {
                if (h.key) {
                    headers.append(replaceVariables(h.key, variables), replaceVariables(h.value, variables));
                }
            });

            let body: BodyInit | undefined = undefined;
            if (item.request.method !== 'GET' && item.request.method !== 'HEAD') {
                if (item.request.body?.mode === 'raw') {
                    body = replaceVariables(item.request.body.raw || '', variables);
                } else if (item.request.body?.mode === 'formdata') {
                    const formData = new FormData();
                    item.request.body.formdata?.forEach(p => {
                        if (p.key) {
                             if (p.type === 'file' && files?.[p.key]) {
                                formData.append(p.key, files[p.key]);
                            } else {
                                formData.append(replaceVariables(p.key, variables), replaceVariables(p.value, variables));
                            }
                        }
                    });
                    body = formData;
                    headers.delete('Content-Type');
                }
            }
            
            // Use cors-proxy for local development if needed, can be removed for production.
            // const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const res = await fetch(url, {
                method: item.request.method,
                headers: headers,
                body: body,
            });

            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            let responseBody: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    responseBody = await res.json();
                } catch {
                     responseBody = await res.text();
                }
            } else {
                responseBody = await res.text();
            }
            
            const responseData = {
                status: res.status,
                statusText: res.statusText,
                headers: responseHeaders,
                body: responseBody
            };
            
            const testScript = item.event?.find(e => e.listen === 'test')?.script.exec.join('\n') || '';
            const { testResults, updatedVariables } = await runTests(testScript, res, responseBody, variables);
            
            if (Object.keys(updatedVariables).length > 0 && activeEnvironmentId) {
                setEnvironments(prevEnvs => prevEnvs.map(env => {
                    if (env.id === activeEnvironmentId) {
                        const newValues = env.values.map(v => {
                            if (updatedVariables[v.key] !== undefined && updatedVariables[v.key] !== v.value) {
                                return { ...v, value: updatedVariables[v.key] };
                            }
                            return v;
                        });
                        return { ...env, values: newValues };
                    }
                    return env;
                }));
            }
            
            setResponses(prev => ({...prev, [item.id!]: { response: responseData, testResults }}));
            setMainView('response');

        } catch (error) {
             const errorResponse = {
                status: 0,
                statusText: 'Request Error',
                headers: {},
                body: error instanceof Error ? { error: error.name, message: error.message, stack: error.stack } : { error: 'Unknown error', message: String(error) }
            };
             setResponses(prev => ({...prev, [item.id!]: { response: errorResponse, testResults: [] }}));
             setMainView('response');
        } finally {
            setLoadingItemId(null);
        }
    };

    const handleGenerateTests = async (item: PostmanItem, response: any) => {
        if (!apiKey) {
            setApiKeyModalOpen(true);
            return;
        }
        if (!response) {
            alert('Please send the request first to get a response before generating tests.');
            return;
        }

        setLoadingItemId(item.id!);
        try {
            const { testScript } = await generateTestsForRequest(item.request!, response, apiKey);
            const testEvent = { listen: 'test' as const, script: { type: 'text/javascript', exec: testScript.split('\n') } };
            const otherEvents = item.event?.filter(e => e.listen !== 'test') || [];
            handleUpdateItem({ ...item, event: [...otherEvents, testEvent] });
            alert('Tests generated successfully and added to the "Tests" tab.');

        } catch (error) {
            console.error("Failed to generate tests:", error);
            alert(`Failed to generate tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoadingItemId(null);
        }
    };
    
    const handleImportText = (text: string) => {
        try {
            const parsed = JSON.parse(text);
            if (parsed.info && parsed.item) { // Looks like a Postman collection
                setCollection(parsed);
            } else if (parsed.openapi || parsed.swagger) { // Looks like OpenAPI/Swagger
                const postmanCollection = parseOpenApi(parsed);
                setCollection(postmanCollection);
            } else {
                 throw new Error("JSON structure not recognized as Postman or OpenAPI.");
            }
        } catch (jsonError) {
             try {
                const parsedYaml = yaml.load(text);
                if (typeof parsedYaml === 'object' && parsedYaml !== null && ('openapi' in parsedYaml || 'swagger' in parsedYaml)) {
                    const postmanCollection = parseOpenApi(parsedYaml);
                    setCollection(postmanCollection);
                } else {
                    throw new Error("Content is not a valid JSON or OpenAPI YAML.");
                }
            } catch (yamlError) {
                alert(`Import failed. The provided text is not a valid Postman Collection (JSON), OpenAPI/Swagger (JSON or YAML) specification.\n\nJSON Error: ${jsonError}\n\nYAML Error: ${yamlError}`);
            }
        } finally {
            setImportModalOpen(false);
        }
    };
    
    const handleImportFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                handleImportText(text);
            }
        };
        reader.onerror = () => {
             alert(`Failed to read file: ${reader.error}`);
             setImportModalOpen(false);
        }
        reader.readAsText(file);
    };

    const handleConfirmExport = (format: 'postman' | 'openapi') => {
        if (!collection) return;
        
        let itemsToExport = collection.item;
        const name = collection.info.name;

        if (selectedIds.size > 0) {
            const filterSelected = (items: PostmanItem[]): PostmanItem[] => {
                return items.reduce((acc: PostmanItem[], item) => {
                    if (selectedIds.has(item.id!)) {
                        acc.push(item);
                        return acc;
                    }
                    if (item.item) {
                        const subItems = filterSelected(item.item);
                        if (subItems.length > 0) {
                            acc.push({ ...item, item: subItems });
                        }
                    }
                    return acc;
                }, []);
            };
            itemsToExport = filterSelected(collection.item);
        }

        if (itemsToExport.length === 0) {
            alert("No items selected for export.");
            return;
        }

        let exportData: object;
        let fileName: string;

        if (format === 'postman') {
            exportData = { ...collection, item: itemsToExport };
            fileName = `${name.replace(/\s/g, '_')}.postman_collection.json`;
        } else {
            exportData = exportToOpenApi(name, itemsToExport);
            fileName = `${name.replace(/\s/g, '_')}.openapi.json`;
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportModalOpen(false);
        setSelectedIds(new Set());
    };
    
    const handleSelectionChange = (itemId: string, isSelected: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    const handleUpdateEnvironments = (updatedEnvironments: Environment[]) => {
        setEnvironments(updatedEnvironments);
        setIsEnvironmentModalOpen(false);
    };

    // --- END HANDLERS ---
    
    // --- START RECURSIVE ITEM MANIPULATION ---

    const updateItemsRecursively = (items: PostmanItem[], updateLogic: (item: PostmanItem) => PostmanItem): PostmanItem[] => {
        return items.map(item => {
            const updatedItem = updateLogic(item);
            if (updatedItem.item) {
                return { ...updatedItem, item: updateItemsRecursively(updatedItem.item, updateLogic) };
            }
            return updatedItem;
        });
    };
    
     const handleSetActiveRequest = (id: string | null) => {
        setActiveRequestId(id);
        setMainView('request'); // Always show request view when selecting a new item
        setIsSidebarOpen(false); // Close sidebar on mobile
    };
    
    const handleNewRequest = (folderId: string | null) => {
        const newRequestId = crypto.randomUUID();
        const newRequestItem: PostmanItem = {
            id: newRequestId,
            name: 'New Request',
            request: {
                id: newRequestId,
                method: 'GET',
                header: [],
                body: { mode: 'raw', raw: '' },
                url: { raw: '' },
            },
        };

        if (!collection) {
             const newCollection: PostmanCollection = {
                info: { _postman_id: crypto.randomUUID(), name: 'My QA Workspace', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
                item: [newRequestItem],
            };
            setCollection(newCollection);
        } else if (folderId === null) {
            setCollection({ ...collection, item: [...collection.item, newRequestItem] });
        } else {
            const newItems = updateItemsRecursively(collection.item, item => {
                if (item.id === folderId && item.item) {
                    setOpenFolders(prev => ({...prev, [folderId]: true}));
                    return { ...item, item: [...item.item, newRequestItem] };
                }
                return item;
            });
            setCollection({ ...collection, item: newItems });
        }
        handleSetActiveRequest(newRequestId);
    };

    const handleNewFolder = (parentId: string | null) => {
        const newFolderId = crypto.randomUUID();
        const newFolder: PostmanItem = {
            id: newFolderId,
            name: 'New Folder',
            item: [],
        };

        if (!collection) {
             const newCollection: PostmanCollection = {
                info: { _postman_id: crypto.randomUUID(), name: 'My QA Workspace', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
                item: [newFolder],
            };
            setCollection(newCollection);
        } else if (parentId === null) {
            setCollection({ ...collection, item: [...collection.item, newFolder] });
        } else {
             const newItems = updateItemsRecursively(collection.item, item => {
                if (item.id === parentId && item.item) {
                    setOpenFolders(prev => ({...prev, [parentId]: true}));
                    return { ...item, item: [...item.item, newFolder] };
                }
                return item;
            });
            setCollection({ ...collection, item: newItems });
        }
    };
    
    const handleDeleteItem = (itemId: string) => {
        setItemToDelete(itemId);
        setConfirmDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!collection || !itemToDelete) return;

        const removeItemRecursively = (items: PostmanItem[], idToRemove: string): PostmanItem[] => {
            return items.reduce((acc: PostmanItem[], item) => {
                if (item.id === idToRemove) {
                    return acc;
                }
                if (item.item) {
                    const updatedFolder = { ...item, item: removeItemRecursively(item.item, idToRemove) };
                    acc.push(updatedFolder);
                } else {
                    acc.push(item);
                }
                
                return acc;
            }, []);
        };

        const newItems = removeItemRecursively(collection.item, itemToDelete);
        setCollection({ ...collection, item: newItems });
        if (activeRequestId === itemToDelete) {
            handleSetActiveRequest(null);
        }
        setConfirmDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const handleUpdateItem = (updatedItem: PostmanItem) => {
        if (!collection) return;
        const newItems = updateItemsRecursively(collection.item, item => {
            if (item.id === updatedItem.id) {
                return updatedItem;
            }
            return item;
        });
        setCollection({ ...collection, item: newItems });
    };
    
    const handleRenameItem = (itemId: string, newName: string) => {
        if (!collection || !newName.trim()) return;
        const newItems = updateItemsRecursively(collection.item, item => {
            if (item.id === itemId) {
                return { ...item, name: newName };
            }
            return item;
        });
        setCollection({ ...collection, item: newItems });
    };
    
    // --- VERTICAL RESIZER LOGIC ---
    const mainContentRef = useRef<HTMLDivElement>(null);
    const isResizingVertical = useRef(false);

    const handleVerticalMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingVertical.current || !mainContentRef.current) return;
        const mainRect = mainContentRef.current.getBoundingClientRect();
        const newHeight = e.clientY - mainRect.top;
        setRequestPanelHeight(Math.max(150, Math.min(newHeight, mainRect.height - 150)));
    }, []);

    const handleVerticalMouseUp = useCallback(() => {
        isResizingVertical.current = false;
        window.removeEventListener('mousemove', handleVerticalMouseMove);
        window.removeEventListener('mouseup', handleVerticalMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, [handleVerticalMouseMove]);

    const handleVerticalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isResizingVertical.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleVerticalMouseMove);
        window.addEventListener('mouseup', handleVerticalMouseUp);
    };

    // --- START JSX ---
    return (
        <>
            <Layout
                sidebar={
                    <Sidebar
                        collection={collection}
                        activeRequestId={activeRequestId}
                        setActiveRequestId={handleSetActiveRequest}
                        onRenameItem={handleRenameItem}
                        onOpenImportModal={() => setImportModalOpen(true)}
                        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
                        onNewRequest={handleNewRequest}
                        onNewFolder={handleNewFolder}
                        onDeleteItem={handleDeleteItem}
                        onExport={() => setExportModalOpen(true)}
                        openFolders={openFolders}
                        setOpenFolders={setOpenFolders}
                        selectedIds={selectedIds}
                        onSelectionChange={handleSelectionChange}
                        environments={environments}
                        activeEnvironmentId={activeEnvironmentId}
                        setActiveEnvironmentId={setActiveEnvironmentId}
                        onOpenEnvironmentModal={() => setIsEnvironmentModalOpen(true)}
                    />
                }
                sidebarWidth={sidebarWidth}
                setSidebarWidth={setSidebarWidth}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            >
                <div className="flex-1 flex flex-col overflow-hidden relative" ref={mainContentRef}>
                    <div className="md:hidden flex items-center p-2 border-b border-gray-700 bg-gray-800 flex-shrink-0">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-300">
                           <MenuIcon className="w-6 h-6" />
                        </button>
                        <span className="font-semibold ml-2 truncate">{activeRequestItem ? activeRequestItem.name : (collection?.info.name || "Simple Request Tool")}</span>
                        {activeRequestItem && (
                             <div className="ml-auto flex items-center space-x-2">
                                <button onClick={() => setMainView('request')} className={`px-3 py-1 text-sm rounded ${mainView === 'request' ? 'bg-blue-600' : 'bg-gray-700'}`}>Request</button>
                                <button onClick={() => setMainView('response')} className={`px-3 py-1 text-sm rounded ${mainView === 'response' ? 'bg-blue-600' : 'bg-gray-700'}`}>Response</button>
                            </div>
                        )}
                    </div>
                    
                    {activeRequestItem ? (
                        <div className={`flex flex-1 overflow-hidden ${layoutMode === 'vertical' ? 'flex-col' : 'flex-row'}`}>
                            <div 
                                className={`relative ${mainView === 'request' || window.innerWidth >= 768 ? 'flex' : 'hidden'} md:flex flex-col overflow-hidden`}
                                style={layoutMode === 'vertical' ? { height: `${requestPanelHeight}px` } : { flexBasis: '50%' }}
                            >
                                <RequestPanel
                                    key={activeRequestItem.id}
                                    item={activeRequestItem}
                                    response={activeResponseData?.response}
                                    loading={loadingItemId === activeRequestItem.id}
                                    onSend={handleSendRequest}
                                    onUpdateItem={handleUpdateItem}
                                    onGenerateTests={handleGenerateTests}
                                    layoutMode={layoutMode}
                                    setLayoutMode={setLayoutMode}
                                    activeVariables={Object.keys(activeEnvironmentVariables)}
                                />
                            </div>

                             {layoutMode === 'vertical' && (
                                <div
                                    onMouseDown={handleVerticalMouseDown}
                                    className="h-2 w-full cursor-row-resize bg-gray-900 hover:bg-gray-700 transition-colors duration-200 hidden md:flex"
                                    title="Drag to resize"
                                ></div>
                            )}

                            <div 
                                className={`relative ${mainView === 'response' || window.innerWidth >= 768 ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden`}
                            >
                               <ResponsePanel
                                    loading={loadingItemId === activeRequestItem.id}
                                    response={activeResponseData?.response}
                                    testResults={activeResponseData?.testResults || []}
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-gray-500 p-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Bienvenido a la herramienta de solicitud</h2>
                                <p>Seleccione un requerimiento del panel izquierdo o importe una colección para comenzar.</p>
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold flex items-center mx-auto"
                                >
                                    <ImportIcon className="w-5 h-5 mr-2" />
                                    Importar Colección
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>

            {/* --- MODALS --- */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImportText={handleImportText}
                onImportFile={handleImportFile}
            />
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onExport={handleConfirmExport}
            />
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setApiKeyModalOpen(false)}
                onSave={(key) => { setApiKey(key); setApiKeyModalOpen(false); }}
                currentApiKey={apiKey}
            />
            <ConfirmationModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={() => setConfirmDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar eliminación"
            >
                ¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer.
            </ConfirmationModal>
             <EnvironmentModal
                isOpen={isEnvironmentModalOpen}
                onClose={() => setIsEnvironmentModalOpen(false)}
                environments={environments}
                onUpdateEnvironments={handleUpdateEnvironments}
            />
        </>
    );
};

export default App;
