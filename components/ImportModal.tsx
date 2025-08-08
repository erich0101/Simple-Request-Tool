import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportText: (text: string) => void;
    onImportFile: (file: File) => void;
}

type Tab = 'Raw Text' | 'File';

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportText, onImportFile }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Raw Text');
    const [rawText, setRawText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Reset state when modal is opened/closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setRawText('');
                setFile(null);
                setActiveTab('Raw Text');
            }, 200); // delay to allow closing animation
        }
    }, [isOpen]);

    const handleImportClick = () => {
        if (activeTab === 'Raw Text' && rawText.trim()) {
            onImportText(rawText);
        } else if (activeTab === 'File' && file) {
            onImportFile(file);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) {
            setFile(event.target.files[0]);
        }
    };

    const isImportDisabled = (activeTab === 'Raw Text' && !rawText.trim()) || (activeTab === 'File' && !file);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import">
            <div className="flex border-b border-gray-700 mb-4">
                {(['Raw Text', 'File'] as Tab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}>
                        {tab}
                    </button>
                ))}
            </div>
            
            {activeTab === 'Raw Text' && (
                 <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste your cURL, Fetch, Postman Collection, or OpenAPI/Swagger spec here."
                    className="w-full h-48 p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Raw text input for import"
                />
            )}

            {activeTab === 'File' && (
                <div className="p-4 border-2 border-dashed border-gray-600 rounded-md text-center bg-gray-900/50">
                    <input type="file" id="file-import" onChange={handleFileChange} accept=".json,.yaml,.yml" className="hidden" />
                    <label htmlFor="file-import" className="cursor-pointer text-blue-400 hover:text-blue-300 font-semibold">
                        {file ? `Selected: ${file.name}` : 'Choose a file'}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                        .json (Postman, OpenAPI) or .yaml, .yml (OpenAPI)
                    </p>
                </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold">
                    Cancel
                </button>
                <button
                    onClick={handleImportClick}
                    disabled={isImportDisabled}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Import
                </button>
            </div>
        </Modal>
    );
};

export default ImportModal;
