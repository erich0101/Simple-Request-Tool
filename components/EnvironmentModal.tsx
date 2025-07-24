import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Environment, EnvironmentValue } from '../types';
import { PlusIcon, TrashIcon, ExportIcon, ImportIcon } from './icons';

interface EnvironmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    environments: Environment[];
    onUpdateEnvironments: (environments: Environment[]) => void;
}

const EnvironmentModal: React.FC<EnvironmentModalProps> = ({ isOpen, onClose, environments, onUpdateEnvironments }) => {
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [editedEnvironments, setEditedEnvironments] = useState<Environment[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Deep copy to avoid mutating parent state directly
            setEditedEnvironments(JSON.parse(JSON.stringify(environments)));
            if (environments.length > 0 && !selectedEnvId) {
                setSelectedEnvId(environments[0].id);
            } else if (environments.length === 0) {
                setSelectedEnvId(null);
            }
        }
    }, [isOpen, environments]);

    const handleSaveChanges = () => {
        onUpdateEnvironments(editedEnvironments);
        onClose();
    };

    const handleCreateEnvironment = () => {
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: `New Environment ${editedEnvironments.length + 1}`,
            values: [],
        };
        setEditedEnvironments([...editedEnvironments, newEnv]);
        setSelectedEnvId(newEnv.id);
    };

    const handleDeleteEnvironment = (envId: string) => {
        if (!window.confirm("Are you sure you want to delete this environment?")) return;
        const newEnvs = editedEnvironments.filter(env => env.id !== envId);
        setEditedEnvironments(newEnvs);
        if (selectedEnvId === envId) {
            setSelectedEnvId(newEnvs.length > 0 ? newEnvs[0].id : null);
        }
    };
    
    const handleExportEnvironment = (envId: string) => {
        const envToExport = editedEnvironments.find(e => e.id === envId);
        if (!envToExport) return;

        const postmanEnv = {
            id: envToExport.id,
            name: envToExport.name,
            values: envToExport.values.map(v => ({ key: v.key, value: v.value, enabled: v.enabled })),
            _postman_variable_scope: 'environment'
        };

        const blob = new Blob([JSON.stringify(postmanEnv, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${envToExport.name.replace(/\s/g, '_')}.postman_environment.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    const updateSelectedEnv = (updateFn: (env: Environment) => Environment) => {
        setEditedEnvironments(prevEnvs =>
            prevEnvs.map(env =>
                env.id === selectedEnvId ? updateFn(env) : env
            )
        );
    };

    const handleVarChange = (index: number, field: keyof EnvironmentValue, value: string | boolean) => {
        updateSelectedEnv(env => {
            const newValues = [...env.values];
            newValues[index] = { ...newValues[index], [field]: value };
            return { ...env, values: newValues };
        });
    };

    const handleAddVar = () => {
        updateSelectedEnv(env => ({
            ...env,
            values: [...env.values, { key: '', value: '', enabled: true }]
        }));
    };

    const handleRemoveVar = (index: number) => {
        updateSelectedEnv(env => {
            const newValues = [...env.values];
            newValues.splice(index, 1);
            return { ...env, values: newValues };
        });
    };
    
    const selectedEnv = editedEnvironments.find(env => env.id === selectedEnvId);

    return (
        <Modal isOpen={isOpen} onClose={handleSaveChanges} title="Administrador de Entornos" maxWidth="4xl">
            <div className="flex flex-col md:flex-row h-[70vh] md:h-[60vh]">
                {/* Left Panel: Environment List */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-700 p-2 flex flex-col">
                    <button onClick={handleCreateEnvironment} className="w-full mb-2 flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold">
                        <PlusIcon className="w-4 h-4 mr-2" /> Crear Entorno
                    </button>
                    <div className="flex-1 overflow-y-auto">
                        {editedEnvironments.map(env => (
                            <div
                                key={env.id}
                                onClick={() => setSelectedEnvId(env.id)}
                                className={`p-2 rounded cursor-pointer text-sm mb-1 flex justify-between items-center ${selectedEnvId === env.id ? 'bg-blue-800/50' : 'hover:bg-gray-700/50'}`}
                            >
                                <span>{env.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEnvironment(env.id); }}
                                    className="p-1 text-gray-400 hover:text-red-500 opacity-50 hover:opacity-100"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Variable Editor */}
                <div className="w-full md:w-2/3 p-2 pt-4 md:pt-2 flex flex-col">
                    {selectedEnv ? (
                        <>
                            <div className="flex items-center mb-2">
                                <input
                                    type="text"
                                    value={selectedEnv.name}
                                    onChange={(e) => updateSelectedEnv(env => ({ ...env, name: e.target.value }))}
                                    className="text-lg font-semibold bg-transparent flex-1 focus:outline-none focus:bg-gray-700 rounded px-2 py-1 mr-2"
                                />
                                <button
                                    onClick={() => handleExportEnvironment(selectedEnv.id)}
                                    className="flex items-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                                    title="Exportar este entorno"
                                >
                                    <ExportIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                                <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-2 items-center text-xs text-gray-400 font-bold mb-2 sticky top-0 bg-gray-800 py-1">
                                    <span></span>
                                    <span>VARIABLE</span>
                                    <span>VALUE</span>
                                    <span></span>
                                </div>
                                {selectedEnv.values.map((variable, index) => (
                                    <div key={index} className="grid grid-cols-[auto,1fr,1fr,auto] gap-2 items-center mb-1">
                                        <input
                                            type="checkbox"
                                            checked={variable.enabled}
                                            onChange={(e) => handleVarChange(index, 'enabled', e.target.checked)}
                                            className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-600"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Key"
                                            value={variable.key}
                                            onChange={(e) => handleVarChange(index, 'key', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Value"
                                            value={variable.value}
                                            onChange={(e) => handleVarChange(index, 'value', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button onClick={() => handleRemoveVar(index)} className="p-1 text-gray-500 hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={handleAddVar} className="mt-2 flex items-center text-sm text-blue-400 hover:text-blue-300">
                                    <PlusIcon className="w-4 h-4 mr-1"/> Add Variable
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Seleccione un entorno para editar o cree uno nuevo.
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end mt-4 p-2 border-t border-gray-700">
                <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold"
                >
                    Aceptar
                </button>
            </div>
        </Modal>
    );
};

export default EnvironmentModal;
