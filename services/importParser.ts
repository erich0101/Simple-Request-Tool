import { PostmanCollection, PostmanItem, PostmanRequest } from '../types';
import { parseOpenApi } from './openapiParser';
import yaml from 'js-yaml';

/**
 * A simplified cURL command parser.
 * This function is designed to handle common cURL commands copied from browser developer tools.
 * It may not support all advanced cURL features.
 */
function parseCurl(curl: string): PostmanItem | null {
    const normalizedCurl = curl.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ').trim();
    const args = normalizedCurl.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];

    if (args.length === 0 || args[0] !== 'curl') {
        return null;
    }

    const request: PostmanRequest = {
        method: 'GET',
        header: [],
        url: { raw: '' },
        body: { mode: 'raw', raw: '' }
    };
    
    let urlFound = false;

    const unquote = (s: string) => (s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')) ? s.slice(1, -1) : s;

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        if (arg === '-X' || arg === '--request') {
            if (nextArg) {
                request.method = unquote(nextArg).toUpperCase() as PostmanRequest['method'];
                i++;
            }
        } else if (arg === '-H' || arg === '--header') {
            if (nextArg) {
                const header = unquote(nextArg);
                const separatorIndex = header.indexOf(':');
                if (separatorIndex !== -1) {
                    const key = header.substring(0, separatorIndex).trim();
                    const value = header.substring(separatorIndex + 1).trim();
                    request.header.push({ key, value, type: 'text' });
                }
                i++;
            }
        } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
            if (nextArg) {
                request.body = { mode: 'raw', raw: unquote(nextArg) };
                if (request.method === 'GET') {
                    request.method = 'POST';
                }
                i++;
            }
        } else if (!urlFound && (arg.startsWith('http') || (arg.startsWith("'") && arg.includes('http')) || (arg.startsWith('"') && arg.includes('http')))) {
             request.url.raw = unquote(arg);
             urlFound = true;
        }
    }
    
    if (!urlFound) return null;

    const id = crypto.randomUUID();
    request.id = id;

    let name = 'cURL Import';
    try {
        name = `cURL - ${new URL(request.url.raw).hostname}`;
    } catch(e) {/* ignore */}

    return { id, name, request };
}


/**
 * A simplified fetch command parser.
 * This is not a full JS parser and will only work on simple fetch commands.
 */
function parseFetch(fetchCommand: string): PostmanItem | null {
    const normalizedFetch = fetchCommand.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    const urlMatch = normalizedFetch.match(/fetch\(\s*['"`](.*?)['"`]/);
    if (!urlMatch || !urlMatch[1]) return null;

    const request: PostmanRequest = {
        method: 'GET',
        header: [],
        url: { raw: urlMatch[1] },
        body: { mode: 'raw', raw: '' }
    };
    
    const optionsMatch = normalizedFetch.match(/,\s*(\{[\s\S]*?\})\s*\)/);
    if (optionsMatch && optionsMatch[1]) {
        let optionsStr = optionsMatch[1];
        optionsStr = optionsStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // remove comments

        const methodMatch = optionsStr.match(/method:\s*['"`](.*?)['"`]/);
        if (methodMatch) request.method = methodMatch[1].toUpperCase() as PostmanRequest['method'];

        const headersMatch = optionsStr.match(/headers:\s*(\{[\s\S]*?\})/);
        if (headersMatch && headersMatch[1]) {
            const headersStr = headersMatch[1];
            const headerRegex = /['"`](.*?)['"`]\s*:\s*['"`](.*?)['"`]/g;
            let match;
            while ((match = headerRegex.exec(headersStr)) !== null) {
                request.header.push({ key: match[1], value: match[2], type: 'text' });
            }
        }
        
        const bodyMatch = optionsStr.match(/body:\s*(.*?)(?:,\s*['"]?\w+['"]?:|}})$/);
        if (bodyMatch && bodyMatch[1]) {
            let bodyContent = bodyMatch[1].trim();
            if (bodyContent.startsWith('JSON.stringify(')) {
                bodyContent = bodyContent.substring('JSON.stringify('.length, bodyContent.length - 1).trim();
            }
            if ((bodyContent.startsWith("'") && bodyContent.endsWith("'")) || (bodyContent.startsWith('"') && bodyContent.endsWith('"'))) {
                bodyContent = bodyContent.slice(1, -1);
            }

            let formattedBody = bodyContent;
            try {
                formattedBody = JSON.stringify(JSON.parse(bodyContent), null, 2);
            } catch(e) {
                // Ignore if not a valid JSON string, keep as is
            }
            request.body = { mode: 'raw', raw: formattedBody };
        }
    }
    
    const id = crypto.randomUUID();
    request.id = id;
    
    let name = 'fetch Import';
    try {
        name = `fetch - ${new URL(request.url.raw).hostname}`;
    } catch(e) {/* ignore */}

    return { id, name, request };
}


/**
 * Parses a text string to identify its type (cURL, fetch, Postman, OpenAPI)
 * and returns a structured object.
 * @param text The raw text to import.
 * @returns A PostmanItem or PostmanCollection, or null if parsing fails.
 */
export const parseImportText = (text: string): PostmanItem | PostmanCollection | null => {
    const trimmedText = text.trim();

    if (trimmedText.startsWith('curl')) {
        return parseCurl(trimmedText);
    }
    
    if (trimmedText.startsWith('fetch')) {
        return parseFetch(trimmedText);
    }

    try {
        const parsedJson = JSON.parse(trimmedText);
        if (parsedJson.info && parsedJson.item) {
            return parsedJson as PostmanCollection;
        }
        if (parsedJson.openapi || parsedJson.swagger) {
            return parseOpenApi(parsedJson);
        }
    } catch (e) {
        // Not a valid JSON or not a recognized structure, fall through to YAML
    }

    try {
        const parsedYaml = yaml.load(trimmedText);
        if (typeof parsedYaml === 'object' && parsedYaml !== null && ('openapi' in parsedYaml || 'swagger' in parsedYaml)) {
            return parseOpenApi(parsedYaml as any);
        }
    } catch (e) {
        // Not a valid YAML either
    }

    return null;
}
