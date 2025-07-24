

import React, { useState, useEffect } from 'react';
import { PostmanItem, PostmanRequest } from '../types';
import CodeEditor from './CodeEditor';
import { AIGenerateIcon, TrashIcon, PlusIcon, FormatIcon, VerticalLayoutIcon, HorizontalLayoutIcon } from './icons';

interface RequestPanelProps {
    item: PostmanItem;
    response: any;
    loading: boolean;
    onSend: (item: PostmanItem, files?: Record<string, File>) => void;
    onUpdateItem: (item: PostmanItem) => void;
    onGenerateTests: (item: PostmanItem, response: any) => void;
    layoutMode: 'horizontal' | 'vertical';
    setLayoutMode: (mode: 'horizontal' | 'vertical') => void;
}

type Tab = 'Headers' | 'Body' | 'Tests';

const KeyValueInput: React.FC<{
    k: string, v: string, onUpdate: (k: string, v: string) => void, onRemove: () => void, placeholderKey: string, placeholderValue: string
}> = ({ k, v, onUpdate, onRemove, placeholderKey, placeholderValue }) => (
    <div className="flex items-center space-x-2 mb-2">
        <input type="text" value={k} onChange={e => onUpdate(e.target.value, v)} placeholder={placeholderKey} className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        <input type="text" value={v} onChange={e => onUpdate(k, e.target.value)} placeholder={placeholderValue} className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
    </div>
);


const RequestPanel: React.FC<RequestPanelProps> = ({ item, response, loading, onSend, onUpdateItem, onGenerateTests, layoutMode, setLayoutMode }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Body');
    const [currentItem, setCurrentItem] = useState<PostmanItem>(item);
    const [formFiles, setFormFiles] = useState<Record<string, File>>({});
    const [bodyEditorKey, setBodyEditorKey] = useState(Date.now());


    useEffect(() => {
        setCurrentItem(item);
    }, [item]);

    // This specific effect syncs the name from the sidebar if it changes
    useEffect(() => {
        if (item.name !== currentItem.name) {
            setCurrentItem(prev => ({ ...prev, name: item.name }));
        }
    }, [item.name]);

    const updateAndPropagate = (newItem: PostmanItem) => {
        setCurrentItem(newItem);
        onUpdateItem(newItem);
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentItem({ ...currentItem, name: e.target.value });
    };

    const handleNameBlur = () => {
        const trimmedName = currentItem.name.trim();
        if (trimmedName && trimmedName !== item.name) {
            onUpdateItem({ ...currentItem, name: trimmedName });
        } else {
            setCurrentItem(item); // Revert if empty or unchanged
        }
    };
    
    const modifyRequest = (updateFn: (request: PostmanRequest) => PostmanRequest) => {
        const originalRequest = currentItem.request || { url: { raw: '' } };
        const newRequest = updateFn(originalRequest);
        updateAndPropagate({ ...currentItem, request: newRequest });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        modifyRequest(req => ({ ...req, url: { ...(req.url || { raw: '' }), raw: e.target.value } }));
    };

    const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        modifyRequest(req => ({ ...req, method: e.target.value as PostmanRequest['method'] }));
    };

    const handleBodyChange = (value: string) => {
        modifyRequest(req => ({ ...req, body: { ...(req.body || { mode: 'raw' }), mode: 'raw', raw: value } }));
    };

    const handleTestsChange = (value: string) => {
        const testEvent = { listen: 'test' as const, script: { type: 'text/javascript', exec: value.split('\n') } };
        const otherEvents = currentItem.event?.filter(e => e.listen !== 'test') || [];
        updateAndPropagate({ ...currentItem, event: [...otherEvents, testEvent] });
    };
    
    // --- Header Handlers ---
    const handleHeaderChange = (index: number, key: string, value: string) => {
        modifyRequest(req => {
            const newHeaders = [...(req.header || [])];
            newHeaders[index] = { ...newHeaders[index], key, value };
            return { ...req, header: newHeaders };
        });
    };
    const handleAddHeader = () => {
        modifyRequest(req => {
            const newHeaders = [...(req.header || []), { key: '', value: '', type: 'text' as const }];
            return { ...req, header: newHeaders };
        });
    };
    const handleRemoveHeader = (index: number) => {
        modifyRequest(req => {
            const newHeaders = [...(req.header || [])];
            newHeaders.splice(index, 1);
            return { ...req, header: newHeaders };
        });
    };
    
    // --- Body Handlers ---
    const handleBodyModeChange = (mode: 'raw' | 'formdata') => {
        modifyRequest(req => ({ ...req, body: { ...(req.body || { mode: 'raw', raw: ''}), mode }}));
    };
    
    const handleFormDataChange = (index: number, newParam: {key: string, value: string, type: 'text' | 'file'}) => {
        modifyRequest(req => {
            const newFormData = [...(req.body?.formdata || [])];
            newFormData[index] = newParam;
            return { ...req, body: { ...req.body!, mode: 'formdata', formdata: newFormData } };
        });
    }

    const handleFormFileChange = (index: number, key: string, file: File | null) => {
        const newFormData = [...(currentItem.request?.body?.formdata || [])];
        if (file) {
            setFormFiles(prev => ({ ...prev, [key]: file }));
            newFormData[index] = { ...newFormData[index], key, value: file.name, type: 'file'};
        } else {
             setFormFiles(prev => { const newState = {...prev}; delete newState[key]; return newState; });
             newFormData[index] = { ...newFormData[index], value: '', type: 'file' };
        }
        modifyRequest(req => ({ ...req, body: { ...req.body!, mode: 'formdata', formdata: newFormData } }));
    };

    const handleAddFormData = () => {
        modifyRequest(req => {
            const newFormData = [...(req.body?.formdata || []), { key: '', value: '', type: 'text' as const }];
            return { ...req, body: { ...req.body!, mode: 'formdata', formdata: newFormData }};
        });
    };

    const handleRemoveFormData = (index: number, key: string) => {
        setFormFiles(prev => { const newState = {...prev}; delete newState[key]; return newState; });
        modifyRequest(req => {
            const newFormData = [...(req.body?.formdata || [])];
            newFormData.splice(index, 1);
            return { ...req, body: { ...req.body!, mode: 'formdata', formdata: newFormData }};
        });
    };

    const handleFormatJson = () => {
        const rawBody = currentItem.request?.body?.raw;
        if (!rawBody?.trim()) return;

        try {
            const parsedJson = JSON.parse(rawBody);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            handleBodyChange(formattedJson);
            // By changing the key, we force CodeMirror to re-mount, avoiding state conflicts
            setBodyEditorKey(Date.now());
        } catch (e) {
            alert("The content is not valid JSON and could not be formatted.");
            console.error("Failed to format JSON:", e);
        }
    };

    const getTestScript = () => currentItem.event?.find(e => e.listen === 'test')?.script.exec.join('\n') || '';

    const renderTabs = () => (
        <div className="flex border-b border-gray-700">
            {(['Body', 'Headers', 'Tests'] as Tab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}>
                    {tab}
                </button>
            ))}
        </div>
    );

    const renderTabContent = () => {
        const request = currentItem.request;
        if (!request) return null;

        switch (activeTab) {
            case 'Headers':
                return (
                    <div className="p-4 overflow-y-auto h-full">
                        {(request.header || []).map((h, i) => 
                            <KeyValueInput key={i} k={h.key} v={h.value} onUpdate={(k, v) => handleHeaderChange(i, k, v)} onRemove={() => handleRemoveHeader(i)} placeholderKey="Header" placeholderValue="Value"/>
                        )}
                        <button onClick={handleAddHeader} className="flex items-center text-sm text-blue-400 hover:text-blue-300 mt-2">
                            <PlusIcon className="w-4 h-4 mr-1"/> Add Header
                        </button>
                    </div>
                )
            case 'Body':
                const bodyMode = request.body?.mode || 'raw';
                return (
                    <div className="h-full flex flex-col">
                        <div className="p-2 flex items-center space-x-4 border-b border-gray-700">
                             <label className="flex items-center"><input type="radio" name="body-mode" value="raw" checked={bodyMode === 'raw'} onChange={() => handleBodyModeChange('raw')} className="mr-2 bg-gray-800"/> Raw</label>
                             <label className="flex items-center"><input type="radio" name="body-mode" value="formdata" checked={bodyMode === 'formdata'} onChange={() => handleBodyModeChange('formdata')} className="mr-2 bg-gray-800"/> Form-data</label>
                             {bodyMode === 'raw' && (
                                <button
                                    onClick={handleFormatJson}
                                    className="ml-auto px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded flex items-center transition-colors"
                                    title="Format JSON"
                                >
                                    <FormatIcon className="w-4 h-4 mr-1" />
                                    Format
                                </button>
                             )}
                        </div>
                        {bodyMode === 'raw' && <CodeEditor key={bodyEditorKey} value={request.body?.raw || ''} onChange={handleBodyChange} language="json"/>}
                        {bodyMode === 'formdata' && (
                            <div className="p-4 overflow-y-auto flex-1">
                                {(request.body?.formdata || []).map((p, i) => (
                                    <div key={i} className="flex items-center space-x-2 mb-2">
                                        <input type="text" value={p.key} onChange={e => handleFormDataChange(i, {...p, key: e.target.value})} placeholder="Key" className="w-1/3 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                                        <select value={p.type} onChange={e => handleFormDataChange(i, {...p, type: e.target.value as 'text' | 'file'})} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                            <option value="text">Text</option>
                                            <option value="file">File</option>
                                        </select>
                                        {p.type === 'text' ? (
                                             <input type="text" value={p.value} onChange={e => handleFormDataChange(i, {...p, value: e.target.value})} placeholder="Value" className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                                        ) : (
                                            <input type="file" onChange={e => handleFormFileChange(i, p.key, e.target.files?.[0] || null)} className="flex-1 block w-full text-sm text-gray-400 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"/>
                                        )}
                                        <button onClick={() => handleRemoveFormData(i, p.key)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button onClick={handleAddFormData} className="flex items-center text-sm text-blue-400 hover:text-blue-300 mt-2"><PlusIcon className="w-4 h-4 mr-1"/> Add Parameter</button>
                            </div>
                        )}
                    </div>
                );
            case 'Tests':
                return <CodeEditor value={getTestScript()} onChange={handleTestsChange} language="javascript" />;
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-800">
            <div className="p-2 border-b border-gray-700 hidden md:block">
                <div className="flex items-center space-x-2">
                    <select value={currentItem.request?.method} onChange={handleMethodChange} className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="text" value={currentItem.request?.url?.raw || ''} onChange={handleUrlChange} className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter request URL"/>
                    <button onClick={() => onSend(currentItem, formFiles)} disabled={loading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:bg-blue-800 disabled:cursor-wait">
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                    <button 
                        onClick={() => setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')} 
                        title="Toggle Layout" 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white hidden md:block"
                    >
                        {layoutMode === 'horizontal' ? <VerticalLayoutIcon className="w-5 h-5" /> : <HorizontalLayoutIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

             <div className="p-2 flex items-center justify-between border-b border-gray-700">
                <input
                    type="text"
                    value={currentItem.name}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="text-lg font-semibold bg-transparent flex-1 focus:outline-none focus:bg-gray-700 rounded px-2 py-1"
                    placeholder="Request Name"
                />
                <button
                    onClick={() => onGenerateTests(currentItem, response)}
                    disabled={loading}
                    title="Generar Postman Tests con IA"
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-white font-semibold disabled:bg-orange-800 disabled:cursor-wait flex items-center text-sm transition-colors"
                >
                    <AIGenerateIcon className="w-5 h-5 mr-2" />
                    Generar Test
                </button>
            </div>
            
            {/* Top bar for mobile */}
            <div className="md:hidden p-2 border-b border-gray-700">
                 <div className="flex items-center space-x-2">
                    <select value={currentItem.request?.method} onChange={handleMethodChange} className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="text" value={currentItem.request?.url?.raw || ''} onChange={handleUrlChange} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Enter request URL"/>
                 </div>
                 <button onClick={() => onSend(currentItem, formFiles)} disabled={loading} className="mt-2 w-full px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:bg-blue-800 disabled:cursor-wait">
                    {loading ? 'Sending...' : 'Send'}
                 </button>
            </div>


            <div className="flex-1 flex flex-col overflow-y-auto">
                {renderTabs()}
                <div className="flex-1 h-0">
                   {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default RequestPanel;