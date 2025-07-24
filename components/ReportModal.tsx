import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { PostmanItem, ResponseData } from '../types';
import { CopyIcon, CheckCircleIcon } from './icons';
import CodeEditor from './CodeEditor';
import { analyzeJwtInResponse } from '../services/jwtAnalyzer';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: PostmanItem | null;
    responseData: ResponseData | null;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode; isCode?: boolean; className?: string }> = ({ label, children, isCode = false, className = '' }) => (
    <div className={`flex items-start py-1 ${className}`}>
        <span className="w-28 flex-shrink-0 font-semibold text-gray-400">{label}</span>
        {isCode ? (
            <pre className="flex-1 bg-gray-900 rounded font-mono text-sm whitespace-pre-wrap break-words p-1.5 -my-1">{children}</pre>
        ) : (
            <span className="flex-1 text-gray-200 break-words">{children || 'None'}</span>
        )}
    </div>
);


const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, item, responseData }) => {
    const [copied, setCopied] = useState(false);
    
    const {
        fullUrl,
        path,
        queryParams,
        payload,
        reqHeaders,
        respHeaders,
        responseBody,
        jwtAnalysis
    } = useMemo(() => {
        if (!item || !responseData) return {};
        
        const req = item.request;
        const resp = responseData.response;
        const body = resp?.body;

        const getPath = (rawUrl: string = ''): string => {
            try {
                const url = new URL(rawUrl);
                return url.pathname;
            } catch {
                return rawUrl.split('?')[0];
            }
        };

        const getQuery = (rawUrl: string = ''): string => {
            try {
                const url = new URL(rawUrl);
                return url.search ? url.search.substring(1) : 'None';
            } catch {
                const qIndex = rawUrl.indexOf('?');
                return qIndex !== -1 ? rawUrl.substring(qIndex + 1) : 'None';
            }
        };

        const getPayload = (): string => {
             if (!req?.body) return 'None';
            switch (req.body.mode) {
                case 'raw': return req.body.raw || 'Empty';
                case 'formdata':
                    return (req.body.formdata || []).map(p => `${p.key}: ${p.type === 'file' ? `(file) ${p.value}` : p.value}`).join('\n');
                default: return 'None';
            }
        };

        return {
            fullUrl: req?.url?.raw || '',
            path: getPath(req?.url?.raw),
            queryParams: getQuery(req?.url?.raw),
            payload: getPayload(),
            reqHeaders: Object.entries(responseData?.requestHeaders || {}).map(([k,v]) => `${k}: ${v}`).join('\n'),
            respHeaders: Object.entries(resp?.headers || {}).map(([k,v]) => `${k}: ${v}`).join('\n'),
            responseBody: body,
            jwtAnalysis: body ? analyzeJwtInResponse(body) : '',
        };
    }, [item, responseData]);

    if (!isOpen || !item || !responseData) {
        return null;
    }

    const handleCopyJson = () => {
        if (!responseBody) return;
        const jsonString = typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : String(responseBody);
        navigator.clipboard.writeText(jsonString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const handleSaveJson = () => {
        if (!responseBody) return;
        const jsonString = typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : String(responseBody);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.name.replace(/\s/g, '_')}_response.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="DETAIL RESPONSE" maxWidth="4xl">
             <div className="max-h-[80vh] overflow-y-auto pr-2 text-sm">
                <div className="space-y-1">
                    <DetailRow label="Endpoint">{`${item.request?.method} ${path}`}</DetailRow>
                    <DetailRow label="URL">{fullUrl}</DetailRow>
                    <DetailRow label="Time">{`${responseData.responseTime}ms    ${responseData.requestTimestamp ? new Date(responseData.requestTimestamp).toLocaleString() : ''}`}</DetailRow>
                    <DetailRow label="Payload" isCode>{payload}</DetailRow>
                    <DetailRow label="Query Params">{queryParams}</DetailRow>
                    <DetailRow label="Req Headers" isCode>{reqHeaders}</DetailRow>
                    <DetailRow label="Resp Headers" isCode>{respHeaders}</DetailRow>
                    <DetailRow label="HTTP Code">{`${responseData.response?.status} ${responseData.response?.statusText}`}</DetailRow>
                </div>
                
                <div className="my-3 border-t border-gray-600"></div>

                <div>
                    <h3 className="font-bold mb-2 text-gray-300">Response Body</h3>
                    <div className="h-48 border border-gray-700 rounded overflow-hidden bg-gray-900">
                        <CodeEditor 
                            value={typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : String(responseBody ?? '')}
                            readOnly
                            language={typeof responseBody === 'object' && responseBody !== null ? 'json' : 'text'}
                            wrapLines
                        />
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <button onClick={handleCopyJson} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold flex items-center">
                            {copied ? <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                            {copied ? 'Copied!' : 'Copy JSON'}
                        </button>
                         <button onClick={handleSaveJson} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold">
                            Save as .json
                        </button>
                    </div>
                </div>

                {jwtAnalysis && (
                    <>
                        <div className="my-3 border-t border-gray-600"></div>
                        <div>
                            <h3 className="font-bold mb-2 text-gray-300">JWT Analysis</h3>
                            <pre className="bg-gray-900 p-2 rounded text-sm whitespace-pre-wrap">{jwtAnalysis}</pre>
                        </div>
                    </>
                )}
             </div>
        </Modal>
    );
};

export default ReportModal;
