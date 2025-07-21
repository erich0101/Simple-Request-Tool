
import { PostmanCollection, PostmanItem, PostmanRequest } from '../types';

const mapToOpenApiPath = (req: PostmanRequest) => {
    if (!req.url?.raw) {
        return '/invalid-path';
    }

    // Remove Postman-style variables like {{baseUrl}} and trim whitespace/slashes
    let pathString = req.url.raw.replace(/\{\{.*?\}\}/g, '').trim();

    // If the remaining string is a full URL, extract just the pathname.
    // This handles cases where a full URL was provided without variables.
    try {
        const url = new URL(pathString);
        pathString = url.pathname;
    } catch (e) {
        // Not a full URL, which is expected for endpoints like /users/:id.
        // We'll proceed with the cleaned string.
    }
    
    // Ensure the path starts with a slash, but only one.
    pathString = pathString.startsWith('/') ? pathString : '/' + pathString;

    // Convert Postman-style :param to OpenAPI-style {param}
    return pathString.replace(/:(\w+)/g, '{$1}');
};

const mapToOpenApiParameters = (req: PostmanRequest) => {
    const parameters: any[] = [];
    const pathParams = new Set((req.url?.raw.match(/:(\w+)/g) || []).map(p => p.substring(1)));

    // Path parameters
    pathParams.forEach(paramName => {
        parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' }
        });
    });

    // Query parameters
    req.url?.query?.forEach(q => {
        if (q.key) { // only add if key exists
            parameters.push({
                name: q.key,
                in: 'query',
                schema: { type: 'string', default: q.value }
            });
        }
    });
    
    // Header parameters
    const standardHeaders = ['content-type', 'accept', 'authorization'];
    req.header?.forEach(h => {
        if (h.key && !standardHeaders.includes(h.key.toLowerCase())) {
            parameters.push({
                name: h.key,
                in: 'header',
                schema: { type: 'string', default: h.value }
            });
        }
    });

    return parameters;
}

const mapToOpenApiRequestBody = (req: PostmanRequest) => {
    if (!req.body || (req.method === 'GET' || req.method === 'HEAD')) {
        return undefined;
    }

    if (req.body.mode === 'raw' && req.body.raw) {
        let example;
        try {
            example = JSON.parse(req.body.raw)
        } catch {
            example = req.body.raw;
        }

        return {
            content: {
                'application/json': {
                    schema: {
                        type: typeof example === 'object' ? 'object' : 'string',
                        example: example
                    }
                }
            }
        };
    }

    if (req.body.mode === 'formdata' && req.body.formdata) {
        const properties: Record<string, any> = {};
        req.body.formdata.forEach(p => {
            if (p.key) {
                 properties[p.key] = {
                    type: 'string',
                    format: p.type === 'file' ? 'binary' : undefined,
                };
            }
        });
        return {
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties
                    }
                }
            }
        }
    }

    return undefined;
}


export const exportToOpenApi = (collectionName: string, items: PostmanItem[]): object => {
    const paths: Record<string, any> = {};

    const processItems = (itemList: PostmanItem[]) => {
        for (const item of itemList) {
            if (item.request && item.request.url?.raw) {
                const path = mapToOpenApiPath(item.request);
                if (!paths[path]) {
                    paths[path] = {};
                }
                const method = item.request.method?.toLowerCase() || 'get';

                paths[path][method] = {
                    summary: item.name,
                    description: item.request.description || '',
                    parameters: mapToOpenApiParameters(item.request),
                    requestBody: mapToOpenApiRequestBody(item.request),
                    responses: {
                        '200': {
                            description: 'Successful response'
                        }
                    }
                };

            } else if (item.item) {
                // Recursively process folders
                processItems(item.item);
            }
        }
    }
    
    processItems(items);

    return {
        openapi: '3.0.1',
        info: {
            title: collectionName,
            version: '1.0.0'
        },
        paths,
    };
};
