// Helper to decode Base64URL, which is different from standard Base64
const decodeJwtPart = (tokenPart: string): any => {
    try {
        const base64 = tokenPart.replace(/-/g, '+').replace(/_/g, '/');
        // Use decodeURIComponent and atob to handle UTF-8 characters correctly
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode JWT part:", e);
        return null;
    }
};

// Formats the date consistently to 'YYYY-MM-DD HH:MM'
const formatExpiryDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Analyzes a single token string and returns a human-readable analysis in Spanish
const analyzeToken = (token: string): string => {
    if (typeof token !== 'string' || token.split('.').length !== 3) {
        return 'formato de token inválido';
    }
    const payload = decodeJwtPart(token.split('.')[1]);
    if (!payload) {
        return 'payload de token inválido';
    }
    if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        const formattedDate = formatExpiryDate(expiryDate);
        if (expiryDate > new Date()) {
            return `valid, expira en ${formattedDate}`;
        } else {
            return `expirado, expiró en ${formattedDate}`;
        }
    }
    return 'válido, sin fecha de expiración';
};

/**
 * Finds and analyzes all JWTs within a given JSON response body.
 * @param responseBody The JSON object from the API response.
 * @returns A string containing the analysis of all found JWTs, separated by newlines.
 */
export const analyzeJwtInResponse = (responseBody: any): string => {
    if (typeof responseBody !== 'object' || responseBody === null) {
        return '';
    }

    const results: string[] = [];
    // Use a Set to avoid analyzing the same token string multiple times if it appears in different places
    const foundTokens = new Set<string>();

    const findJwtsRecursively = (obj: any) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'string' && value.split('.').length === 3 && !foundTokens.has(value)) {
                    // Basic check for JWT format (x.y.z) and ensure it's not already processed
                    const analysis = analyzeToken(value);
                    // Check if the analysis is not indicating an invalid format before adding
                    if (!analysis.includes('inválido')) {
                       results.push(`${key}: ${analysis}`);
                       foundTokens.add(value);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    findJwtsRecursively(value);
                }
            }
        }
    };

    findJwtsRecursively(responseBody);
    return results.join('\n');
};
