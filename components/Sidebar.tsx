import React, { useRef, useState, useEffect } from 'react';
import { PostmanCollection, PostmanItem, Environment } from '../types';
import { FolderIcon, ImportIcon, ExportIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon, FolderPlusIcon, KeyIcon, LinkedInIcon, GitHubIcon, GlobeIcon } from './icons';

interface SidebarProps {
    collection: PostmanCollection | null;
    activeRequestId: string | null;
    setActiveRequestId: (id: string | null) => void;
    onRenameItem: (itemId: string, newName: string) => void;
    onOpenImportModal: () => void;
    onOpenApiKeyModal: () => void;
    onNewRequest: (folderId: string | null) => void;
    onNewFolder: (parentId: string | null) => void;
    onDeleteItem: (itemId: string) => void;
    onExport: () => void;
    openFolders: Record<string, boolean>;
    setOpenFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    selectedIds: Set<string>;
    onSelectionChange: (itemId: string, isSelected: boolean) => void;
    environments: Environment[];
    activeEnvironmentId: string | null;
    setActiveEnvironmentId: (id: string | null) => void;
    onOpenEnvironmentModal: () => void;
}

const getMethodClass = (method?: string) => {
    switch (method) {
        case 'GET': return 'text-green-400';
        case 'POST': return 'text-yellow-400';
        case 'PUT': return 'text-blue-400';
        case 'PATCH': return 'text-purple-400';
        case 'DELETE': return 'text-red-400';
        default: return 'text-gray-400';
    }
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { collection, activeRequestId, setActiveRequestId, onRenameItem, onOpenImportModal, onNewRequest, onNewFolder, onDeleteItem, onExport, openFolders, setOpenFolders, onOpenApiKeyModal, selectedIds, onSelectionChange, environments, activeEnvironmentId, setActiveEnvironmentId, onOpenEnvironmentModal } = props;
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleStartEditing = (item: PostmanItem) => {
        setEditingId(item.id!);
        setEditingName(item.name);
    };
    
    const handleFinishEditing = () => {
        if (editingId && editingName.trim()) {
            onRenameItem(editingId, editingName.trim());
        }
        setEditingId(null);
    };
    
    const renderItem = (item: PostmanItem, depth = 0) => {
        const isFolder = !!item.item;
        
        return (
            <div
                key={item.id}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
                className="relative"
            >
                <div className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700/50 w-full group`}>
                     <input
                        type="checkbox"
                        checked={selectedIds.has(item.id!)}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelectionChange(item.id!, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mr-2 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2 flex-shrink-0"
                        title="Select for export"
                    />

                    {/* Item Content */}
                    <div className="flex items-center flex-1 min-w-0" onClick={() => isFolder ? setOpenFolders(p => ({...p, [item.id!]: !p[item.id!]})) : setActiveRequestId(item.id!)}>
                        {isFolder ? (
                            openFolders[item.id!] ? <ChevronDownIcon className="w-4 h-4 mr-1 flex-shrink-0" /> : <ChevronRightIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                        ) : <div className="w-4 mr-1 flex-shrink-0"></div>}

                        {isFolder ? <FolderIcon className="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0" /> : null}

                        {!isFolder && (
                            <span className={`mr-2 w-12 text-left font-bold text-xs flex-shrink-0 ${getMethodClass(item.request?.method)}`}>
                                {item.request?.method}
                            </span>
                        )}

                        {editingId === item.id ? (
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleFinishEditing}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleFinishEditing(); if(e.key === 'Escape') setEditingId(null); }}
                                className="bg-gray-600 text-white w-full px-1 py-0 rounded focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className={`truncate ${item.id === activeRequestId && !isFolder ? 'text-blue-400' : ''}`} onDoubleClick={() => handleStartEditing(item)}>{item.name}</span>
                        )}
                    </div>
                    {/* Hover controls */}
                    <div className="flex items-center space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="Renombrar" onClick={(e) => { e.stopPropagation(); handleStartEditing(item); }} className="p-1 rounded hover:bg-gray-600">
                           <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                        {isFolder && (
                            <button title="Nueva Request" onClick={(e) => { e.stopPropagation(); onNewRequest(item.id!); }} className="p-1 rounded hover:bg-gray-600">
                                <PlusIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        )}
                        {isFolder && (
                            <button title="Nueva Carpeta" onClick={(e) => { e.stopPropagation(); onNewFolder(item.id!); }} className="p-1 rounded hover:bg-gray-600">
                                <FolderPlusIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        )}
                        <button title="Borrar" onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id!); }} className="p-1 rounded hover:bg-gray-600">
                           <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                    </div>
                </div>

                {isFolder && openFolders[item.id!] && item.item && (
                    <div className="border-l border-gray-600/50 ml-3">{item.item.map(child => renderItem(child, depth + 1))}</div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <h1 className="text-xl font-bold mb-4">Simple Request Tool</h1>
            
            <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center space-x-2">
                    <GlobeIcon className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                    <select
                        value={activeEnvironmentId || 'none'}
                        onChange={(e) => setActiveEnvironmentId(e.target.value === 'none' ? null : e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    >
                        <option value="none">Sin Entorno</option>
                        {environments.map(env => (
                            <option key={env.id} value={env.id}>{env.name}</option>
                        ))}
                    </select>
                    <button 
                        onClick={onOpenEnvironmentModal}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" title="Administrar Entornos"
                    >
                        <PencilIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>

            <p className="mb-1">QA-Testing</p>
            <div className="flex space-x-2 mb-4">
                 <button onClick={() => onNewRequest(null)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" title="Nueva Request">
                    <PlusIcon className="w-5 h-5"/>
                </button>
                 <button onClick={() => onNewFolder(null)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" title="Nueva Carpeta">
                    <FolderPlusIcon className="w-5 h-5"/>
                </button>
                <button onClick={onOpenImportModal} className="flex-1 flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" title="Importar desde cURL o Archivo">
                    <ImportIcon className="w-4 h-4 mr-2"/> Importar
                </button>
                <button onClick={() => onExport()} disabled={!collection} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Exportar collection">
                    <ExportIcon className="w-5 h-5"/>
                </button>
            </div>
            <div 
                className="flex-1 overflow-y-auto pr-1 -mr-1"
            >
                {collection ? (
                    <div>
                        <h2 className="text-lg font-semibold mb-2 p-2">{collection.info.name}</h2>
                        {collection.item.map(item => renderItem(item))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-center p-4">
                        Aún no hay requerimiento ni colección cargada, crea o importa una.
                    </div>
                )}
            </div>
            <footer className="mt-auto pt-4 border-t border-gray-700 text-xs">
                <button onClick={onOpenApiKeyModal} className="w-full flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm mb-2" title="Ingresa tu Gemini API Key">
                    <KeyIcon className="w-4 h-4 mr-2"/> Set API Key
                </button>
                <p className="mb-1 text-yellow-500">Ver: 0.0.1 alpha</p>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400" style={{ fontSize: '16px' }}>By Erich Petrocelli</p>
                    <div className="flex items-center space-x-3">
                        <a href="https://www.linkedin.com/in/erichpetrocelli/" target="_blank" rel="noopener noreferrer" title="LinkedIn Profile">
                            <LinkedInIcon className="w-5 h-5" />
                        </a>
                        <a href="https://github.com/erich0101" target="_blank" rel="noopener noreferrer" title="GitHub Profile">
                            <GitHubIcon className="w-5 h-5 text-gray-200 hover:text-white" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Sidebar;
