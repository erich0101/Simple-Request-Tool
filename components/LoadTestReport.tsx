import React from 'react';
import { LoadTestConfig, LoadTestStats, PostmanRequest } from '../types';

interface LoadTestReportProps {
    request: PostmanRequest;
    config: LoadTestConfig;
    stats: LoadTestStats;
}

const DetailItem: React.FC<{ label: string; value: string | number; mono?: boolean }> = ({ label, value, mono=true }) => (
    <li className="flex justify-between items-center py-2 border-b">
        <span className="font-semibold">{label}</span>
        <span className={mono ? 'font-mono' : ''}>{value}</span>
    </li>
);

const LoadTestReport: React.FC<LoadTestReportProps> = ({ request, config, stats }) => {
    const errorEntries = Object.entries(stats.errorsByStatus);

    return (
        <div id="load-test-report-printable-area" className="p-8 bg-white text-black">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-bold">Informe de Prueba de carga desde navegador</h1>
                <p className="text-lg text-gray-600 mt-2">Resultados para: <span className="font-mono bg-gray-100 p-1 rounded">{request.method} {request.url?.raw}</span></p>
            </header>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold border-b-2 pb-2 mb-4">Resumen de Resultados</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-bold">ÉXITOS (2xx)</p>
                        <p className="text-3xl font-bold">{stats.success}</p>
                    </div>
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-bold">ERRORES</p>
                        <p className="text-3xl font-bold">{stats.error}</p>
                    </div>
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-bold">TIMEOUTS</p>
                        <p className="text-3xl font-bold">{stats.timeout}</p>
                    </div>
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-bold">SOLICITUDES POR SEGUNDO (RPS)</p>
                        <p className="text-3xl font-bold">{stats.rps.toFixed(2)}</p>
                    </div>
                     <div className="border p-4 rounded-lg col-span-2">
                        <p className="text-sm font-bold">TIEMPO PROMEDIO DE RESPUESTA</p>
                        <p className="text-3xl font-bold">{stats.avgTime.toFixed(0)} ms</p>
                    </div>
                </div>
            </section>
            
            <section className="mb-8">
                <h2 className="text-2xl font-semibold border-b-2 pb-2 mb-4">Configuración de la Prueba</h2>
                <ul className="divide-y">
                    <DetailItem label="Solicitudes Totales" value={config.totalRequests} />
                    <DetailItem label="Nivel de Concurrencia" value={config.concurrency} />
                    <DetailItem label="Retardo entre Ráfagas" value={`${config.delay} ms`} />
                    <DetailItem label="Timeout por Solicitud" value={`${config.timeout} ms`} />
                </ul>
            </section>

            {errorEntries.length > 0 && (
                 <section>
                    <h2 className="text-2xl font-semibold border-b-2 pb-2 mb-4">Desglose de Errores</h2>
                    <ul className="divide-y">
                         {errorEntries.map(([status, count]) => (
                            <DetailItem key={status} label={`Código de Estado ${status}`} value={`${count} ocurrencias`} />
                        ))}
                    </ul>
                </section>
            )}

            <footer className="mt-12 text-center text-xs text-gray-500">
                <p>Reporte generado el {new Date().toLocaleString()}</p>
            </footer>
        </div>
    );
};

export default LoadTestReport;
