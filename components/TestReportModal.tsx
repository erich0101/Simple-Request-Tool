import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { PostmanItem, ResponseData } from '../types';
import { CopyIcon, CheckCircleIcon, PrintIcon, SparklesIcon, XCircleIcon } from './icons';
import { generateTestExecutionReport } from '../services/geminiService';

interface TestReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: PostmanItem | null;
    responseData: ResponseData | null;
    apiKey: string;
    onOpenApiKeyModal: () => void;
}

const TestReportModal: React.FC<TestReportModalProps> = ({ isOpen, onClose, item, responseData, apiKey, onOpenApiKeyModal }) => {
    const [reportContent, setReportContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && item && responseData) {
            if (!apiKey) {
                onOpenApiKeyModal();
                onClose();
                return;
            }

            const generateReport = async () => {
                setIsLoading(true);
                setError(null);
                setReportContent('');
                try {
                    const content = await generateTestExecutionReport(item, responseData, apiKey);
                    setReportContent(content);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };

            generateReport();
        }
    }, [isOpen, item, responseData, apiKey, onClose, onOpenApiKeyModal]);

    const handleCopy = () => {
        if (reportContentRef.current) {
            navigator.clipboard.writeText(reportContentRef.current.innerText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <SparklesIcon className="w-10 h-10 text-blue-400 animate-pulse" />
                    <p className="mt-4 text-lg text-gray-300">Generando informe con IA...</p>
                    <p className="text-sm text-gray-500">Esto puede tardar unos segundos.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md h-64 overflow-y-auto">
                    <h3 className="font-bold mb-2">Error al generar el informe</h3>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }

        return (
            <div 
                id="test-report-printable-area" 
                ref={reportContentRef} 
                className="bg-gray-900 p-4 rounded-md border border-gray-700 max-h-[65vh] overflow-y-auto text-gray-300"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'sans-serif' }}
            >
                {reportContent}
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="3xl">
             <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4 -mt-4">
                <div className="flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-2 text-yellow-400" />
                    <h2 className="text-xl font-semibold text-gray-100">Informe de Prueba Generado por IA</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <XCircleIcon className="w-6 h-6" />
                </button>
            </div>
            
            <div className="space-y-4">
                {renderContent()}

                <div className="no-print flex justify-end space-x-3 mt-4 border-t border-gray-700 pt-4">
                    <button
                        onClick={handlePrint}
                        disabled={isLoading || !!error}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PrintIcon className="w-5 h-5 mr-2" />
                        Imprimir / Guardar PDF
                    </button>
                     <button
                        onClick={handleCopy}
                        disabled={isLoading || !!error}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {copied ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <CopyIcon className="w-5 h-5 mr-2" />}
                        {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TestReportModal;
