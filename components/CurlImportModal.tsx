import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface CurlImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (curlCommand: string) => void;
}

const CurlImportModal: React.FC<CurlImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [curl, setCurl] = useState('');

    // This effect ensures that whenever the modal is closed (for any reason),
    // the text area is cleared for the next use.
    useEffect(() => {
        if (!isOpen) {
            setCurl('');
        }
    }, [isOpen]);

    const handleImportClick = () => {
        if (curl.trim()) {
            onImport(curl);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import from cURL">
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Paste a cURL command below to import it as a new request.
                </p>
                <textarea
                    value={curl}
                    onChange={(e) => setCurl(e.target.value)}
                    placeholder="curl 'https://api.example.com/...' -H 'Authorization: Bearer ...'"
                    className="w-full h-48 p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="cURL command input"
                />
                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImportClick}
                        disabled={!curl.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Import Request
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CurlImportModal;