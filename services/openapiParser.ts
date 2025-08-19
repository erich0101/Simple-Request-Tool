import { PostmanCollection, PostmanItem, PostmanRequest } from '../types';

// Helper to generate a sample value from a schema object
const generateSampleFromSchema = (schema: any): any => {
    if (!schema) return null;

    if (schema.example) return schema.example;
    if (schema.default) return schema.default;

    switch (schema.type) {
        case 'object':
            const obj: Record<string, any> = {};
            if (schema.properties) {
                for (const key in schema.properties) {
                    obj[key] = generateSampleFromSchema(schema.properties[key]);
                }
            }
            return obj;
        case 'array':
            if (schema.items) {
                return [generateSampleFromSchema(schema.items)];
            }
            return [];
        case 'string':
            if (schema.format === 'date-time') return new Date().toISOString();
            if (schema.format === 'date') return new Date().toISOString().split('T')[0];
            if (schema.format === 'email') return 'user@example.com';
            return 'string';
        case 'number':
        case 'integer':
            return 0;
        case 'boolean':
            return false;
        default:
            return null;
    }
};

export const parseOpenApi = (spec: any): PostmanCollection => {
    const collectionName = spec.info?.title || 'OpenAPI Import';
    const baseUrl = spec.servers?.[0]?.url || '';
    const items: PostmanItem[] = [];

    for (const path in spec.paths) {
        for (const method in spec.paths[path]) {
            const op = spec.paths[path][method];
            if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].indexOf(method) === -1) {
                continue;
            }

            const requestId = crypto.randomUUID();
            const request: PostmanRequest = {
                id: requestId,
                method: method.toUpperCase() as PostmanRequest['method'],
                url: {
                    raw: `${baseUrl}${path}`,
                    host: [baseUrl],
                    path: path.split('/').filter(p => p),
                    query: []
                },
                header: [],
                body: { mode: 'raw', raw: '' },
                description: op.description || op.summary || ''
            };

            // Parameters (query, header, path)
            const parameters = [...(spec.paths[path].parameters || []), ...(op.parameters || [])];
            for (const param of parameters) {
                const paramSchema = param.schema || param;
                switch (param.in) {
                    case 'query':
                        request.url?.query?.push({ key: param.name, value: String(generateSampleFromSchema(paramSchema)) });
                        break;
                    case 'header':
                        request.header?.push({ key: param.name, value: String(generateSampleFromSchema(paramSchema)), type: 'text' });
                        break;
                    case 'path':
                         // Postman uses :var syntax for path variables
                        if (request.url?.raw) {
                            request.url.raw = request.url.raw.replace(`{${param.name}}`, `:${param.name}`);
                        }
                        break;
                }
            }
            
             // Update raw URL with query params
            if (request.url?.query && request.url.query.length > 0) {
                const queryString = request.url.query.map(q => `${q.key}=${q.value}`).join('&');
                request.url.raw += `?${queryString}`;
            }

            // Request Body
            if (op.requestBody?.content) {
                if (op.requestBody.content['application/json']?.schema) {
                    const sampleBody = generateSampleFromSchema(op.requestBody.content['application/json'].schema);
                    request.body = {
                        mode: 'raw',
                        raw: JSON.stringify(sampleBody, null, 2),
                    };
                    // Ensure Content-Type header is not duplicated
                    if (!request.header?.some(h => h.key.toLowerCase() === 'content-type')) {
                        request.header?.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
                    }
                } else if (op.requestBody.content['multipart/form-data']?.schema) {
                     const schema = op.requestBody.content['multipart/form-data'].schema;
                     const sampleBody = generateSampleFromSchema(schema);
                     request.body = {
                         mode: 'formdata',
                         formdata: Object.keys(sampleBody).map(key => ({
                            key,
                            value: String(sampleBody[key]),
                            type: schema.properties[key]?.format === 'binary' ? 'file' : 'text'
                         }))
                     };
                }
            }

            items.push({
                id: requestId,
                name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
                request: request,
            });
        }
    }

    return {
        info: {
            _postman_id: crypto.randomUUID(),
            name: collectionName,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: items
    };
};
