export interface PostmanCollection {
    info: {
        _postman_id: string;
        name: string;
        schema: string;
    };
    item: PostmanItem[];
}

export interface PostmanItem {
    id?: string;
    name: string;
    item?: PostmanItem[]; // For folders
    request?: PostmanRequest;
    response?: any[];
    event?: PostmanEvent[];
}

export interface PostmanRequest {
    id?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
    header?: { key: string; value: string; type: 'text'; }[];
    body?: {
        mode: 'raw' | 'formdata' | 'urlencoded';
        raw?: string;
        formdata?: { key: string; value: string; type: 'text' | 'file'; }[];
    };
    url?: {
        raw: string;
        host?: string[];
        path?: string[];
        query?: { key: string; value: string; }[];
    };
    description?: string;
    event?: PostmanEvent[];
}

export interface PostmanEvent {
    listen: 'test' | 'prerequest';
    script: {
        id?: string;
        type: string;
        exec: string[];
    };
}

export interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

export interface ResponseData {
    response: any;
    testResults: TestResult[];
    requestHeaders?: Record<string, string>;
    requestTimestamp?: number;
    responseTime?: number;
}

export interface Environment {
    id: string;
    name: string;
    values: EnvironmentValue[];
}

export interface EnvironmentValue {
    key: string;
    value: string;
    enabled: boolean;
}
