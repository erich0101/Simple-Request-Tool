
import React from 'react';
import { XCircleIcon } from './icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'md' }) => {
    if (!isOpen) return null;

    const maxWidthClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div 
                className={`bg-gray-800 rounded-lg shadow-xl p-6 w-full ${maxWidthClasses[maxWidth]} mx-4 transform transition-all`}
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="text-gray-300">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
