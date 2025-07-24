import { PostmanRequest } from '../types';

const replaceVariables = (str: string, variables: Record<string, string>): string => {
    if (!str) return '';
    return str.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
};

export const generateCurlCommand = (request: PostmanRequest, variables: Record<string, string>): string => {
    if (!request.url?.raw) {
        return 'echo "Error: Request has no URL"';
    }

    const url = replaceVariables(request.url.raw, variables);
    // Escape single quotes in URL for the final command
    const escapedUrl = url.replace(/'/g, "'\\''");
    let curl = `curl --location --request ${request.method || 'GET'} '${escapedUrl}'`;

    request.header?.forEach(h => {
        if (h.key) {
            const key = replaceVariables(h.key, variables);
            const value = replaceVariables(h.value, variables);
            const escapedValue = value.replace(/'/g, "'\\''");
            curl += ` \\\n--header '${key}: ${escapedValue}'`;
        }
    });

    if (request.body) {
        switch (request.body.mode) {
            case 'raw':
                if (request.body.raw) {
                    const rawBody = replaceVariables(request.body.raw, variables);
                    // Standard shell escape for single quotes
                    const escapedBody = rawBody.replace(/'/g, "'\\''");
                    curl += ` \\\n--data-raw '${escapedBody}'`;
                }
                break;
            case 'formdata':
                request.body.formdata?.forEach(p => {
                    if (p.key) {
                        const key = replaceVariables(p.key, variables);
                        let value;
                        if (p.type === 'file') {
                            // For file type, the value is often a path. We just use it as is.
                            // The user will need to ensure the path is correct on their machine.
                            value = `@'${p.value}'`;
                        } else {
                            value = replaceVariables(p.value, variables);
                        }
                        const escapedValue = value.replace(/'/g, "'\\''");
                        curl += ` \\\n--form '${key}=${escapedValue}'`;
                    }
                });
                break;
        }
    }

    return curl;
};
