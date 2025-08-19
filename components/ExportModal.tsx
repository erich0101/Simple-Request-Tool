
import React from 'react';
import Modal from './Modal';
import { ExportIcon } from './icons';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'postman' | 'openapi') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
    if (!isOpen) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportar">
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Elige el formato en el que quieres exportar tu colección.
                </p>
                <div className="flex flex-col space-y-3 pt-2">
                    <button
                        onClick={() => onExport('postman')}
                        className="w-full flex items-center justify-center p-3 bg-orange-700 hover:bg-orange-600 rounded text-base font-semibold transition-colors"
                    >
                        <ExportIcon className="w-5 h-5 mr-3" />
                        Exportar como Postman Collection
                    </button>
                    <button
                        onClick={() => onExport('openapi')}
                        className="w-full flex items-center justify-center p-3 bg-green-700 hover:bg-green-600 rounded text-base font-semibold transition-colors"
                    >
                        <ExportIcon className="w-5 h-5 mr-3" />
                        Exportar como OpenAPI 3.0 (Swagger)
                    </button>
                </div>
                 <div className="flex justify-end mt-4">
                     <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-semibold"
                    >
                        Cancel
                    </button>
                 </div>
            </div>
        </Modal>
    );
};

export default ExportModal;