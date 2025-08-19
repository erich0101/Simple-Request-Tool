
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { KeyIcon } from './icons';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string) => void;
    currentApiKey: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
    const [key, setKey] = useState(currentApiKey);

    useEffect(() => {
        if (isOpen) {
            setKey(currentApiKey);
        }
    }, [isOpen, currentApiKey]);

    const handleSaveClick = () => {
        if (key.trim()) {
            onSave(key.trim());
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gemini API Key">
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Su clave API solo es necesaria si quiere generar script de pruebas con IA. La clave se almacena de forma segura en el almacenamiento local de su navegador y nunca se envía a ningún lugar, excepto a Google para las llamadas API.
                </p>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                         <KeyIcon className="h-5 w-5 text-gray-500" />
                    </div>
                     <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Ingrese su Google AI API Key"
                        className="w-full p-2 pl-10 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Gemini API Key"
                    />
                </div>
               
                <p className="text-xs text-gray-500">
                    Puede obtener su clave API desde {' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Google AI Studio
                    </a>.
                </p>

                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={!key.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ApiKeyModal;
