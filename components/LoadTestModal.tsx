

import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { PostmanRequest, LoadTestConfig, LoadTestStats, LoadTestWorkerMessage } from '../types';
import { PlayIcon, StopIcon, BoltIcon, DocumentReportIcon } from './icons';
import LoadTestReport from './LoadTestReport';

interface LoadTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: PostmanRequest;
    activeVariables: Record<string, string>;
}

const INITIAL_STATS: LoadTestStats = {
    sent: 0, success: 0, error: 0, timeout: 0,
    totalTime: 0, avgTime: 0, rps: 0,
    errorsByStatus: {}
};

const LoadTestModal: React.FC<LoadTestModalProps> = ({ isOpen, onClose, request, activeVariables }) => {
    const [config, setConfig] = useState<LoadTestConfig>({
        totalRequests: 100,
        concurrency: 10,
        delay: 0,
        timeout: 5000
    });
    const [isRunning, setIsRunning] = useState(false);
    const [isTestComplete, setIsTestComplete] = useState(false);
    const [stats, setStats] = useState<LoadTestStats>(INITIAL_STATS);
    const workerRef = useRef<Worker | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        // Cleanup worker on unmount or when modal closes
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);
    
    useEffect(() => {
        if(!isOpen) {
            handleStop();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isPrinting) {
            // A short timeout ensures the DOM has updated before the print dialog opens.
            const timer = setTimeout(() => {
                window.print();
                setIsPrinting(false); // Reset the state after print dialog is triggered
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isPrinting]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        
        let validatedValue = isNaN(numValue) ? 0 : numValue;
        
        // Apply limits
        if (name === 'totalRequests') validatedValue = Math.min(validatedValue, 5000);
        if (name === 'concurrency') validatedValue = Math.min(validatedValue, 50);
        if (name === 'timeout') validatedValue = Math.max(validatedValue, 1000);

        setConfig(prev => ({ ...prev, [name]: validatedValue }));
    };

    const handleStart = () => {
        if (!request) return;

        setIsRunning(true);
        setIsTestComplete(false);
        setStats(INITIAL_STATS);
        
        workerRef.current = new Worker(new URL('../services/loadTest.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent<LoadTestWorkerMessage>) => {
            if (e.data.type === 'progress') {
                setStats(e.data.stats);
            }
            if (e.data.type === 'complete') {
                setStats(e.data.stats);
                setIsRunning(false);
                setIsTestComplete(true);
                if (workerRef.current) {
                    workerRef.current.terminate();
                    workerRef.current = null;
                }
            }
             if (e.data.type === 'error') {
                alert(`Worker error: ${e.data.message}`);
                setIsRunning(false);
             }
        };

        workerRef.current.postMessage({
            type: 'start',
            config,
            request: request,
            variables: activeVariables
        });
    };

    const handleStop = () => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'stop' });
            // The worker will send a 'complete' message after stopping, which will set isRunning to false.
            // We can also terminate it directly for an immediate stop.
            setTimeout(() => {
                 if (workerRef.current) {
                    workerRef.current.terminate();
                    workerRef.current = null;
                 }
                 setIsRunning(false);
            }, 500);
        }
    };
    
    const handleGenerateReport = () => {
        setIsPrinting(true);
    };

    const progressPercentage = config.totalRequests > 0 ? (stats.sent / config.totalRequests) * 100 : 0;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Prueba de Carga Ligera" maxWidth="5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Configuration Panel */}
                    <div className="md:col-span-1 bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-200">Configuración</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Solicitudes Totales (máx. 5000)</label>
                                <input type="number" name="totalRequests" value={config.totalRequests} onChange={handleConfigChange} disabled={isRunning} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Concurrencia (máx. 50)</label>
                                <input type="number" name="concurrency" value={config.concurrency} onChange={handleConfigChange} disabled={isRunning} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Retardo entre Ráfagas (ms)</label>
                                <input type="number" name="delay" value={config.delay} onChange={handleConfigChange} disabled={isRunning} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Timeout por Solicitud (ms, min. 1000)</label>
                                <input type="number" name="timeout" value={config.timeout} onChange={handleConfigChange} disabled={isRunning} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                            </div>
                        </div>
                         <div className="mt-6">
                            {!isRunning ? (
                                <button onClick={handleStart} className="w-full flex items-center justify-center p-3 bg-blue-600 hover:bg-blue-500 rounded text-base font-semibold transition-colors">
                                    <PlayIcon className="w-5 h-5 mr-2" /> Iniciar Prueba
                                </button>
                            ) : (
                                <button onClick={handleStop} className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-500 rounded text-base font-semibold transition-colors">
                                    <StopIcon className="w-5 h-5 mr-2" /> Detener Prueba
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Results Panel */}
                    <div className="md:col-span-2 bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-4 text-gray-200">Resultados en Tiempo Real</h3>
                            
                            {/* Progress Bar */}
                             <div className="mb-4">
                                <div className="flex justify-between mb-1">
                                    <span className="text-base font-medium text-gray-200">Progreso</span>
                                    <span className="text-sm font-medium text-gray-200">{stats.sent} / {config.totalRequests}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="bg-gray-800 p-3 rounded-lg"><div className="text-xs text-gray-400">Éxitos (2xx)</div><div className="text-xl font-bold text-green-400">{stats.success}</div></div>
                                <div className="bg-gray-800 p-3 rounded-lg"><div className="text-xs text-gray-400">Errores</div><div className="text-xl font-bold text-red-400">{stats.error}</div></div>
                                <div className="bg-gray-800 p-3 rounded-lg"><div className="text-xs text-gray-400">Timeouts</div><div className="text-xl font-bold text-yellow-400">{stats.timeout}</div></div>
                                <div className="bg-gray-800 p-3 rounded-lg"><div className="text-xs text-gray-400">RPS</div><div className="text-xl font-bold">{stats.rps.toFixed(2)}</div></div>
                                <div className="bg-gray-800 p-3 rounded-lg col-span-2"><div className="text-xs text-gray-400">Tiempo Promedio</div><div className="text-xl font-bold">{stats.avgTime.toFixed(0)} ms</div></div>
                            </div>
                            
                            {/* Errors Breakdown */}
                            {Object.keys(stats.errorsByStatus).length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-gray-300">Resumen de Errores:</h4>
                                    <div className="bg-gray-800 p-3 mt-2 rounded-lg text-sm">
                                        {Object.entries(stats.errorsByStatus).map(([status, count]) => (
                                            <p key={status} className="font-mono">{`Status ${status}: ${count} veces`}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {isTestComplete && !isRunning && (
                             <div className="mt-6 text-center">
                                <button
                                    onClick={handleGenerateReport}
                                    className="w-full flex items-center justify-center p-3 bg-green-600 hover:bg-green-500 rounded text-base font-semibold transition-colors"
                                >
                                    <DocumentReportIcon className="w-5 h-5 mr-2" />
                                    Generar Reporte
                                </button>
                            </div>
                        )}
                        
                        {/* Warning */}
                        <div className="mt-6 p-3 bg-yellow-900/40 border border-yellow-700/60 rounded-lg text-yellow-300 text-xs">
                            <p><strong><BoltIcon className="w-4 h-4 inline-block mr-1"/> Advertencia:</strong> Esta no es una prueba de estrés profesional. Todas las solicitudes se originan desde su navegador y su IP. Usar un número elevado de solicitudes puede hacer que su navegador se vuelva lento o que su IP sea bloqueada temporalmente por el servidor de destino. Úselo con responsabilidad.</p>
                        </div>

                    </div>
                </div>
            </Modal>
            {isPrinting && (
                <LoadTestReport request={request} config={config} stats={stats} />
            )}
        </>
    );
};

export default LoadTestModal;