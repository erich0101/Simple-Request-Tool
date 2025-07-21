import React, { useState, useEffect, useCallback } from 'react';
import { PostmanCollection, PostmanItem, PostmanRequest, TestResult, ResponseData } from './types';
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
import { MenuIcon } from './components/icons';
import ConfirmationModal from './components/ConfirmationModal';
import ExportModal from './components/ExportModal';
import { exportToOpenApi } from './services/openapiExporter';

// --- START HELPER FUNCTIONS ---

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
    const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
    const [isErrorModalOpen, setErrorModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());


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

    useEffect(() => {
        const savedCollection = localStorage.getItem('miniPostmanCollection');
        if (savedCollection) {
            setCollection(JSON.parse(savedCollection));
        }
        const savedResponses = localStorage.getItem('miniPostmanResponses');
        if (savedResponses) {
            setResponses(JSON.parse(savedResponses));
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
    }, []);

    useEffect(() => {
        if (collection) {
            localStorage.setItem('miniPostmanCollection', JSON.stringify(collection));
        }
    }, [collection]);

     useEffect(() => {
        // Create a new object to save, excluding the volatile `response` part,
        // as requested by the user. Only test results are persisted.
        const responsesToSave: Record<string, { testResults: TestResult[] }> = {};
        Object.keys(responses).forEach(key => {
            if (responses[key]) {
                 responsesToSave[key] = {
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
        if (apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
        } else {
            // If the key is cleared, remove it from storage.
            localStorage.removeItem('geminiApiKey');
        }
    }, [apiKey]);
    
    const findRequest = (items: PostmanItem[], id: string): PostmanItem | null => {
        for (const item of items) {
            if (item.item) { // It's a folder
                const found = findRequest(item.item, id);
                if (found) return found;
            } else if (item.id === id) { // It's a request
                return item;
            }
        }
        return null;
    };

    const activeRequestItem = activeRequestId && collection ? findRequest(collection.item, activeRequestId) : null;
    
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
            // Add to root
            setCollection({ ...collection, item: [...collection.item, newRequestItem] });
        } else {
            // Add to specific folder
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
                // If the current item is the one to be removed, don't add it to the accumulator.
                if (item.id === idToRemove) {
                    return acc;
                }

                // If the item is a folder, recursively process its children.
                if (item.item) {
                    const updatedFolder = { ...item, item: removeItemRecursively(item.item, idToRemove) };
                    acc.push(updatedFolder);
                } else {
                    // If it's a request (and not the one to be removed), add it.
                    acc.push(item);
                }
                
                return acc;
            }, []);
        };

        const newItems = removeItemRecursively(collection.item, itemToDelete);
        setCollection({ ...collection, item: newItems });

        // If the deleted item was the active one, deactivate it.
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
    
    // --- END RECURSIVE ITEM MANIPULATION ---

    const handleSendRequest = async (request: PostmanRequest, files?: Record<string, File>) => {
        if (!request.id) return;

        const prepareUrl = (rawUrl: string): string => {
            let url = rawUrl.trim();
            if (!url) return '';
            if (!/^(https?|ftp):\/\//i.test(url)) {
                url = 'https://' + url;
            }
            return url;
        };

        const rawUrl = request.url?.raw || '';
        if (!rawUrl.trim()) {
            setResponses(prev => ({ ...prev, [request.id!]: { ...prev[request.id!], response: { status: 'Error', body: 'Request URL is empty.' } } }));
            return;
        }
        const url = prepareUrl(rawUrl);

        setLoadingRequestId(request.id);
        setResponses(prev => ({...prev, [request.id!]: { response: null, testResults: [] }}));

        try {
            const headers = request.header?.reduce((acc, h) => {
                if(h.key) acc[h.key] = h.value;
                return acc;
            }, {} as Record<string, string>) || {};
            
            let body: BodyInit | undefined = undefined;

            if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
                if (request.body.mode === 'raw') {
                    body = request.body.raw || '';
                    if (body) {
                        const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
                        if (!hasContentType) {
                            headers['Content-Type'] = 'application/json;charset=UTF-8';
                        }
                    }
                } else if (request.body.mode === 'formdata' && request.body.formdata) {
                    const formData = new FormData();
                    request.body.formdata.forEach(param => {
                         if (!param.key) return;
                        if (param.type === 'file' && files?.[param.key]) {
                            formData.append(param.key, files[param.key]);
                        } else if (param.type === 'text') {
                            formData.append(param.key, param.value);
                        }
                    });
                    body = formData;
                    delete headers['Content-Type']; 
                    delete headers['content-type'];
                }
            }
            
            const res = await fetch(url, {
                method: request.method,
                headers: headers,
                body: body,
            });

            const responseBody = await res.clone().json().catch(() => res.clone().text());
            
            const responseData = {
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries()),
                body: responseBody,
            };
            
            const testScript = activeRequestItem?.event?.find(e => e.listen === 'test')?.script.exec.join('\n') || '';
            let testResults: TestResult[] = [];
            if (testScript) {
                testResults = await runTests(testScript, res, responseBody);
            }

            setResponses(prev => ({ ...prev, [request.id!]: { response: responseData, testResults } }));

        } catch (error) {
            let errorMessage = 'An unknown error occurred.';
            if (error instanceof Error) {
                errorMessage = error.message;
                 if (errorMessage.includes('Failed to fetch')) { 
                    errorMessage = `Network Error: ${error.message}\n\nThis could be due to a few reasons:\n- CORS Policy: The API server doesn't allow requests from this web app.\n- Network Issue: You might be offline, or there's a DNS problem.\n- Invalid URL: The URL might be malformed.\n\nCheck the browser's developer console (F12) for more specific details.`;
                }
            }
             setResponses(prev => ({
                ...prev,
                [request.id!]: {
                    ...prev[request.id!],
                    response: {
                        status: 'Error',
                        body: errorMessage,
                    }
                }
            }));
        } finally {
            setLoadingRequestId(null);
            setMainView('response'); // Switch to response view on mobile
        }
    };

    const handleGenerateTests = async (itemToUpdate: PostmanItem, responseData: any) => {
        if (!itemToUpdate.id || !itemToUpdate.request) return;

        if (!apiKey) {
            setApiKeyModalOpen(true);
            return;
        }

        if (!responseData || !responseData.body || responseData.status === 'Error') {
            setErrorModalOpen(true);
            return;
        }

        setLoadingRequestId(itemToUpdate.id);
        try {
            const { testScript } = await generateTestsForRequest(itemToUpdate.request, responseData, apiKey);

            const updatedItem = { ...itemToUpdate };

            let testEvent = updatedItem.event?.find(e => e.listen === 'test');
            if (testEvent) {
                testEvent.script.exec = testScript.split('\n');
            } else {
                if (!updatedItem.event) {
                    updatedItem.event = [];
                }
                updatedItem.event.push({
                    listen: 'test',
                    script: {
                        type: 'text/javascript',
                        exec: testScript.split('\n'),
                    },
                });
            }
            handleUpdateItem(updatedItem);
            
        } catch (error) {
            console.error("Failed to generate tests:", error);
            alert(`Failed to generate tests. ${error instanceof Error ? error.message : "Check the console for details."}`);
        } finally {
            setLoadingRequestId(null);
        }
    };

    // --- START IMPORT/EXPORT LOGIC ---
    
    const getAllDescendantIds = useCallback((items: PostmanItem[], parentId: string): string[] => {
        const parentItem = findItemById(items, parentId);
        if (!parentItem || !parentItem.item) {
            return [];
        }

        let ids: string[] = [];
        const queue = [...parentItem.item];
        while (queue.length > 0) {
            const current = queue.shift()!;
            ids.push(current.id!);
            if (current.item) {
                queue.push(...current.item);
            }
        }
        return ids;
    }, []);

    const handleSelectionChange = useCallback((itemId: string, isSelected: boolean) => {
        if (!collection) return;
        
        const descendantIds = getAllDescendantIds(collection.item, itemId);
        const idsToChange = [itemId, ...descendantIds];

        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                idsToChange.forEach(id => newSet.add(id));
            } else {
                idsToChange.forEach(id => newSet.delete(id));
            }
            return newSet;
        });
    }, [collection, getAllDescendantIds]);

    const buildSelectedTree = (items: PostmanItem[], selectedIds: Set<string>): PostmanItem[] => {
        const result: PostmanItem[] = [];

        for (const item of items) {
            if (item.request) { // It's a request
                if (selectedIds.has(item.id!)) {
                    result.push(item);
                }
            } else if (item.item) { // It's a folder
                const selectedChildren = buildSelectedTree(item.item, selectedIds);
                if (selectedIds.has(item.id!) || selectedChildren.length > 0) {
                    result.push({ ...item, item: selectedChildren });
                }
            }
        }
        return result;
    };
    
    const handleExport = () => {
        if (!collection) return;
        setExportModalOpen(true);
    };

    const handleConfirmExport = (format: 'postman' | 'openapi') => {
        if (!collection) return;

        let itemsToProcess: PostmanItem[];
        let exportName: string;

        if (selectedIds.size > 0) {
            itemsToProcess = buildSelectedTree(collection.item, selectedIds);
            exportName = `${collection.info.name} (Selection)`;
        } else {
            itemsToProcess = collection.item;
            exportName = collection.info.name;
        }

        let fileContent: string;
        let fileName: string;

        if (format === 'openapi') {
            const openApiSpec = exportToOpenApi(exportName, itemsToProcess);
            fileContent = JSON.stringify(openApiSpec, null, 2);
            fileName = `${exportName.replace(/\s/g, '_')}_openapi.json`;
        } else { // postman
            const collectionToExport = {
                info: {
                    _postman_id: crypto.randomUUID(),
                    name: exportName,
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                item: itemsToProcess
            };
            fileContent = JSON.stringify(collectionToExport, null, 2);
            fileName = `${exportName.replace(/\s/g, '_')}_collection.json`;
        }

        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportModalOpen(false);
    };

    const parseCurlCommand = (curlCommand: string): Partial<PostmanRequest> & { url: { raw: string } } => {
        // Updated regex to better handle single-quoted multi-line data.
        // The regex splits by space but respects quotes.
        const tokens = curlCommand.replace(/\\\n/g, ' ').match(/(?:[^\s"']+|"[^"]*"|'[^']*')/g) || [];
    
        const request: Partial<PostmanRequest> & { url: { raw: string } } = {
            method: 'GET',
            url: { raw: '' },
            header: [],
            body: { mode: 'raw', raw: '' }
        };
    
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];
            const unquote = (t: string) => t.startsWith("'") && t.endsWith("'") || t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
    
            switch (token) {
                case 'curl':
                    // Look for the URL immediately after `curl` if it's not a flag
                    if (tokens[i + 1] && !tokens[i + 1].startsWith('-')) {
                        request.url.raw = unquote(tokens[i + 1]);
                        i++; 
                    }
                    break;
                
                case '--location':
                    // The next token is expected to be the URL.
                    if (tokens[i + 1] && !tokens[i + 1].startsWith('-')) {
                        request.url.raw = unquote(tokens[++i]);
                    }
                    break;

                case '-X':
                case '--request':
                    request.method = unquote(tokens[++i]).toUpperCase() as PostmanRequest['method'];
                    break;

                case '-H':
                case '--header':
                    const headerLine = unquote(tokens[++i]);
                    const separatorIndexHeader = headerLine.indexOf(':');
                    if (separatorIndexHeader !== -1) {
                        const key = headerLine.substring(0, separatorIndexHeader).trim();
                        const value = headerLine.substring(separatorIndexHeader + 1).trim();
                        if (key) {
                            request.header?.push({ key, value, type: 'text' });
                        }
                    }
                    break;

                case '--data':
                case '--data-raw':
                case '-d':
                    if (request.body) {
                        request.body.mode = 'raw';
                        request.body.raw = unquote(tokens[++i]);
                    }
                    if (request.method === 'GET') {
                        request.method = 'POST';
                    }
                    break;
                
                case '--form':
                    const formArg = unquote(tokens[++i]);
                    const separatorIndexForm = formArg.indexOf('=');
                    
                    if (separatorIndexForm !== -1) {
                        const key = formArg.substring(0, separatorIndexForm).trim();
                        let value = formArg.substring(separatorIndexForm + 1);
                        
                        // Set body mode to formdata
                        if (request.body?.mode !== 'formdata') {
                            request.body = { mode: 'formdata', formdata: [] };
                        }
                        
                        // Ensure formdata is initialized
                        if (!request.body.formdata) {
                            request.body.formdata = [];
                        }

                        if (value.startsWith('@')) {
                            // It's a file
                            const filePath = unquote(value.substring(1));
                            request.body.formdata.push({ key, value: filePath, type: 'file' });
                        } else {
                            // It's a text value
                            request.body.formdata.push({ key, value: unquote(value), type: 'text' });
                        }

                        if (request.method === 'GET') {
                            request.method = 'POST';
                        }
                    }
                    break;

                default:
                    // Fallback for URL if it wasn't caught earlier
                    if (!request.url.raw && token.startsWith('http')) {
                         request.url.raw = unquote(token);
                    }
                    break;
            }
            i++;
        }
        return request;
    };
    
    const handleImportFromCurl = (curlString: string) => {
        const parsed = parseCurlCommand(curlString);
        if (!parsed.url?.raw) {
            throw new Error('Could not parse URL from cURL command.');
        }

        const newRequestId = crypto.randomUUID();
        const newRequestItem: PostmanItem = {
            id: newRequestId,
            name: `cURL Import - ${new URL(parsed.url.raw).hostname}`,
            request: {
                id: newRequestId,
                method: parsed.method || 'GET',
                header: parsed.header || [],
                body: parsed.body || { mode: 'raw', raw: '' },
                url: { raw: parsed.url.raw },
            },
        };
        
        if (collection) {
            // Add to existing collection
            setCollection({ ...collection, item: [...collection.item, newRequestItem] });
        } else {
            // Create a new collection
            const newCollection: PostmanCollection = {
                info: {
                    _postman_id: crypto.randomUUID(),
                    name: 'My QA Workspace',
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
                },
                item: [newRequestItem],
            };
            setCollection(newCollection);
        }
        handleSetActiveRequest(newRequestId);
    };
    
    const handleImportText = (text: string) => {
        try {
            let data;
            let importedCollection: PostmanCollection | null = null;
            let isNewCollection = false;
    
            // Try parsing as JSON (Postman Collection or OpenAPI)
            try {
                data = JSON.parse(text);
                if (data.openapi || data.swagger) {
                    importedCollection = parseOpenApi(data);
                    isNewCollection = true;
                } else if (data.info && data.item) {
                     const assignIds = (items: PostmanItem[]): PostmanItem[] => items.map(item => ({
                        ...item,
                        id: item.id || crypto.randomUUID(),
                        item: item.item ? assignIds(item.item) : undefined,
                        request: item.request ? { ...item.request, id: item.request.id || crypto.randomUUID() } : undefined
                    }));
                    importedCollection = { ...data, item: assignIds(data.item) };
                    isNewCollection = true;
                }
            } catch (e) { /* ignore json parse error, try yaml */ }
            
            // Try parsing as YAML (OpenAPI)
            if (!importedCollection) {
                try {
                    data = yaml.load(text);
                    if (data && typeof data === 'object' && (data.openapi || data.swagger)) {
                        importedCollection = parseOpenApi(data);
                        isNewCollection = true;
                    }
                } catch (e) { /* ignore yaml parse error, try curl */ }
            }
            
            // Handle collection import (Postman or OpenAPI)
            if (importedCollection && isNewCollection) {
                const newFolder: PostmanItem = {
                    id: importedCollection.info._postman_id || crypto.randomUUID(),
                    name: importedCollection.info.name,
                    item: importedCollection.item,
                };
                if (collection) {
                    // Add imported collection as a new folder
                    setCollection({ ...collection, item: [...collection.item, newFolder] });
                } else {
                    // Set as the new base collection, but still wrap it to be safe
                    const newCollection: PostmanCollection = {
                         info: { _postman_id: crypto.randomUUID(), name: 'My QA Workspace', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
                         item: [newFolder]
                    }
                    setCollection(newCollection);
                }
                handleSetActiveRequest(null);
                setImportModalOpen(false);
                return;
            }
    
            // Fallback to cURL
            handleImportFromCurl(text);
            setImportModalOpen(false);
    
        } catch (error) {
            console.error("Import failed:", error);
            alert(`Failed to import. The format might be unsupported or the content may be invalid. Error: ${error instanceof Error ? error.message : String(error)}`);
            setImportModalOpen(false);
        }
    };

    const handleFileImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                handleImportText(text);
            }
        };
        reader.onerror = () => {
             alert('Failed to read the file.');
        };
        reader.readAsText(file);
    };

    // --- END IMPORT/EXPORT LOGIC ---

    const activeResponseData = activeRequestId ? responses[activeRequestId] : null;
    const isLoading = loadingRequestId === activeRequestId;

    const requestPanelComponent = activeRequestItem && (
        <RequestPanel
            key={activeRequestId}
            item={activeRequestItem}
            response={activeResponseData?.response}
            loading={isLoading}
            onSend={handleSendRequest}
            onUpdateItem={handleUpdateItem}
            onGenerateTests={handleGenerateTests}
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
        />
    );

    const responsePanelComponent = activeRequestItem && (
        <ResponsePanel 
            response={activeResponseData?.response} 
            loading={isLoading} 
            testResults={activeResponseData?.testResults || []} 
        />
    );

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
                        onExport={handleExport}
                        openFolders={openFolders}
                        setOpenFolders={setOpenFolders}
                        selectedIds={selectedIds}
                        onSelectionChange={handleSelectionChange}
                    />
                }
                sidebarWidth={sidebarWidth}
                setSidebarWidth={setSidebarWidth}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            >
                <div className="flex flex-col h-full w-full">
                    {/* Mobile-only Header */}
                    <header className="md:hidden flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700 flex-shrink-0">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-300">
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <h2 className="font-semibold text-lg truncate px-2">
                            {activeRequestItem?.name || "API Client"}
                        </h2>
                        {/* Spacer to keep title centered */}
                        <div className="w-10"></div>
                    </header>
                    
                    <main className="flex-1 overflow-hidden">
                        {activeRequestItem && activeRequestItem.request ? (
                            <>
                                {/* Desktop Split View */}
                                <div className={`hidden md:flex flex-1 overflow-hidden h-full ${layoutMode === 'horizontal' ? 'flex-col' : 'flex-row'}`}>
                                    <div className={`overflow-hidden ${layoutMode === 'horizontal' ? 'h-1/2' : 'w-1/2'}`}>
                                       {requestPanelComponent}
                                    </div>
                                    <div className={`flex-shrink-0 bg-gray-700 ${layoutMode === 'horizontal' ? 'w-full h-[1px] cursor-row-resize' : 'h-full w-[1px] cursor-col-resize'}`}></div>
                                    <div className={`overflow-hidden ${layoutMode === 'horizontal' ? 'h-1/2' : 'w-1/2'}`}>
                                        {responsePanelComponent}
                                    </div>
                                </div>
                                {/* Mobile Tabbed View */}
                                <div className="md:hidden flex flex-col h-full">
                                    <div className="flex border-b border-gray-700 flex-shrink-0">
                                        <button onClick={() => setMainView('request')} className={`flex-1 py-2 text-center text-sm font-medium ${mainView === 'request' ? 'bg-gray-700 text-blue-400' : 'bg-gray-800 text-gray-300'}`}>Request</button>
                                        <button onClick={() => setMainView('response')} className={`flex-1 py-2 text-center text-sm font-medium ${mainView === 'response' ? 'bg-gray-700 text-blue-400' : 'bg-gray-800 text-gray-300'}`}>Response</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {mainView === 'request' ? requestPanelComponent : responsePanelComponent}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4 sm:px-10">
                                <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg mb-8 max-w-2xl text-sm">
                                    <h3 className="font-bold text-yellow-200 mb-2">¡Atención! Recomendaciones de Uso</h3>
                                    <p className="mb-2">
                                        Todo su progreso se guarda en el almacenamiento local de su navegador. Si limpia la caché o el almacenamiento de su navegador, <strong className="font-semibold">PERDERÁ TODOS SUS DATOS</strong>.
                                    </p>
                                    <p className="mb-2">
                                        Se recomienda encarecidamente <strong className="font-semibold">exportar su colección regularmente</strong> como respaldo para evitar la pérdida de trabajo.
                                    </p>
                                    <p className="mb-2">
                                        Esta herramienta está diseñada como un recurso ligero y rápido para pruebas y generación de scripts, no como un sustituto completo de herramientas robustas como Postman o Insomnia.
                                    </p>
                                    <p>
                                        Aparte de rápido, simple y ligero, uno de los objetivos es poder realizar pruebas rápidas incluso desde un celular sin necesidad de instalar aplicaciones.
                                    </p>
                                </div>
                                <p>Seleccione una solicitud o cree una nueva, tambien puede importar un cURL o una colección (Postman, Swagger) para comenzar.</p>
                            </div>
                        )}
                    </main>
                </div>
            </Layout>
            <Modal 
                isOpen={isErrorModalOpen} 
                onClose={() => setErrorModalOpen(false)} 
                title="Contexto Insuficiente para la IA"
            >
                <p>Para generar pruebas de alta calidad, la IA necesita el contexto de una respuesta exitosa.</p>
                <p className="mt-4">Por favor, ejecuta al menos una petición exitosa (preferiblemente un "happy path") antes de intentar generar las pruebas.</p>
                <div className="flex justify-end mt-6">
                    <button 
                        onClick={() => setErrorModalOpen(false)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold"
                    >
                        Entendido
                    </button>
                </div>
            </Modal>
            <ImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setImportModalOpen(false)} 
                onImportText={handleImportText}
                onImportFile={handleFileImport}
            />
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onExport={handleConfirmExport}
            />
             <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setApiKeyModalOpen(false)}
                onSave={(key) => {
                    setApiKey(key);
                    setApiKeyModalOpen(false);
                }}
                currentApiKey={apiKey}
            />
            <ConfirmationModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={() => setConfirmDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </>
    );
};

export default App;
