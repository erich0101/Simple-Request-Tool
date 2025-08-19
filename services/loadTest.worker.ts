// services/loadTest.worker.ts

import { PostmanRequest, LoadTestWorkerMessage, LoadTestStats } from '../types';

let stopTesting = false;

const replaceVariables = (str: string, variables: Record<string, string>): string => {
    if (!str) return '';
    return str.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
};

const sendRequest = async (request: PostmanRequest, variables: Record<string, string>, timeout: number) => {
    if (!request.url?.raw) {
        throw new Error("Request URL is missing");
    }

    const url = replaceVariables(request.url.raw, variables);
    const headers = new Headers();
    request.header?.forEach(h => {
        if (h.key) {
            headers.append(replaceVariables(h.key, variables), replaceVariables(h.value, variables));
        }
    });

    let body: BodyInit | undefined = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.body?.mode === 'raw' && request.body.raw) {
            body = replaceVariables(request.body.raw, variables);
        } else if (request.body?.mode === 'formdata') {
            const formData = new FormData();
            request.body.formdata?.forEach(p => {
                if (p.key && p.type === 'text') {
                    formData.append(replaceVariables(p.key, variables), replaceVariables(p.value, variables));
                }
            });
            body = formData;
            headers.delete('Content-Type'); // Let browser set it
        }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = performance.now();
    try {
        const response = await fetch(url, {
            method: request.method,
            headers: headers,
            body: body,
            signal: controller.signal
        });
        
        // Consume the response body to free up the connection.
        // This is crucial for endpoints that return files, preventing the connection pool from being saturated.
        await response.arrayBuffer();
        
        const endTime = performance.now();
        
        clearTimeout(timeoutId);

        return {
            status: response.status,
            time: endTime - startTime,
            error: !response.ok
        };
    } catch (error) {
        const endTime = performance.now();
        clearTimeout(timeoutId);
        
        const isTimeout = (error as Error).name === 'AbortError';

        return {
            status: isTimeout ? 408 : 0, // 408 for timeout, 0 for other network errors
            time: endTime - startTime,
            error: true,
            isTimeout: isTimeout
        };
    }
};


self.onmessage = async (e: MessageEvent<LoadTestWorkerMessage>) => {
    if (e.data.type === 'start') {
        stopTesting = false;
        const { config, request, variables } = e.data;
        
        const stats: LoadTestStats = {
            sent: 0, success: 0, error: 0, timeout: 0,
            totalTime: 0, avgTime: 0, rps: 0,
            errorsByStatus: {}
        };

        const testStartTime = Date.now();
        let activeRequests = 0;
        let requestQueue = Array.from({ length: config.totalRequests }, (_, i) => i);

        const run = async () => {
            while (requestQueue.length > 0) {
                if (stopTesting) break;

                while (activeRequests < config.concurrency && requestQueue.length > 0) {
                    requestQueue.shift();
                    activeRequests++;

                    sendRequest(request, variables, config.timeout).then(result => {
                        stats.sent++;
                        stats.totalTime += result.time;
                        stats.avgTime = stats.totalTime / stats.sent;
                        
                        const elapsedSeconds = (Date.now() - testStartTime) / 1000;
                        stats.rps = elapsedSeconds > 0 ? stats.sent / elapsedSeconds : 0;
                        
                        if (result.error) {
                            if (result.isTimeout) {
                                stats.timeout++;
                            } else {
                                stats.error++;
                            }
                            stats.errorsByStatus[result.status] = (stats.errorsByStatus[result.status] || 0) + 1;
                        } else {
                            stats.success++;
                        }

                        // Post progress at regular intervals
                        if (stats.sent % 10 === 0 || stats.sent === config.totalRequests) {
                            self.postMessage({ type: 'progress', stats: { ...stats } });
                        }
                        
                    }).finally(() => {
                        activeRequests--;
                    });
                }
                await new Promise(resolve => setTimeout(resolve, config.delay));
            }
        };

        await run();

        // Wait for all active requests to finish
        while(activeRequests > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        self.postMessage({ type: 'complete', stats: { ...stats } });

    } else if (e.data.type === 'stop') {
        stopTesting = true;
    }
};

export {};