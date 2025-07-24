import React, { useState } from 'react';
import Modal from './Modal';

interface NewEnvironmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

const NewEnvironmentModal: React.FC<NewEnvironmentModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
            setName(''); // Reset for next time
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Entorno">
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Un script intentó guardar una variable, pero no hay ningún entorno activo. Ingrese un nombre para crear un nuevo entorno y guardar estas variables.
                </p>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del Entorno"
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="New Environment Name"
                    autoFocus
                />
                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Crear y Guardar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default NewEnvironmentModal;
