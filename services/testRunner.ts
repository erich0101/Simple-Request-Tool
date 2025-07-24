import { TestResult } from '../types';

class AssertionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AssertionError';
    }
}

const createExpect = (actual: any, negated = false): any => {
    const self: any = {};

    const check = (condition: boolean, positiveMessage: string) => {
        if (negated ? condition : !condition) {
            throw new AssertionError(positiveMessage);
        }
    };

    // Chainers that return the expect object itself for fluent interface
    self.to = self;
    self.be = self;
    self.have = self;
    self.a = self;
    self.an = self;
    
    // The 'not' getter returns a new expect instance with the negation flag flipped.
    Object.defineProperty(self, 'not', {
        get: () => createExpect(actual, !negated)
    });

    // --- Assertions ---

    self.eql = (expected: any) => {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        const message = `expected ${actualStr} ${negated ? 'not ' : ''}to deeply equal ${expectedStr}`;
        check(actualStr === expectedStr, message);
    };

    self.equal = (expected: any) => {
        const message = `expected ${JSON.stringify(actual)} ${negated ? 'not ' : ''}to equal ${JSON.stringify(expected)}`;
        check(actual === expected, message);
    };

    self.property = (prop: string) => {
        const message = `expected ${JSON.stringify(actual)} ${negated ? 'not ' : ''}to have property '${prop}'`;
        check(actual !== null && actual !== undefined && typeof actual === 'object' && prop in actual, message);
        return self; // Return self to chain more assertions on the same object
    };

    self.ok = () => {
        const message = `expected ${JSON.stringify(actual)} ${negated ? 'not ' : ''}to be truthy`;
        check(!!actual, message);
    };
    
    self.above = (val: number) => {
        const message = `expected ${actual} to be ${negated ? 'not ' : ''}above ${val}`;
        check(typeof actual === 'number' && actual > val, message);
    };
    
    self.empty = () => {
        let isEmpty = false;
        if (typeof actual === 'string' || Array.isArray(actual)) {
            isEmpty = actual.length === 0;
        } else if (typeof actual === 'object' && actual !== null) {
            isEmpty = Object.keys(actual).length === 0;
        } else {
            throw new AssertionError(`'empty' assertion is not supported for type ${typeof actual}`);
        }
        const message = `expected ${JSON.stringify(actual)} to be ${negated ? 'not ' : ''}empty`;
        check(isEmpty, message);
    };

    const typeOf = (type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null') => {
        let actualType: string = typeof actual;
        if (actual === null) actualType = 'null';
        else if (Array.isArray(actual)) actualType = 'array';
        
        const message = `expected ${JSON.stringify(actual)} to be ${negated ? 'not ' : ''}a ${type}, but got ${actualType}`;
        check(actualType === type, message);
    };

    // To support .a('string') and .an('number')
    self.a = typeOf;
    self.an = typeOf;
    
    Object.defineProperty(self, 'null', {
      get: () => {
        const message = `expected ${JSON.stringify(actual)} to be ${negated ? 'not ' : ''}null`;
        check(actual === null, message);
        return self;
      },
    });

    return self;
};


export const runTests = async (
    script: string, 
    response: Response, 
    responseBody: any,
    environmentVariables: Record<string, string>
): Promise<{ testResults: TestResult[]; updatedVariables: Record<string, string> }> => {
    const results: TestResult[] = [];
    const mutableEnv = { ...environmentVariables };

    const pm = {
        response: {
            code: response.status,
            status: response.statusText,
            headers: response.headers,
            json: () => responseBody,
            text: () => typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
            to: {
                have: {
                    status: (code: number) => {
                        if (response.status !== code) {
                            throw new AssertionError(`expected response status to be ${code} but got ${response.status}`);
                        }
                    },
                    header: (key: string, value?: string) => {
                        if (!response.headers.has(key)) {
                            throw new AssertionError(`expected header '${key}' to exist`);
                        }
                        if (value !== undefined && response.headers.get(key) !== value) {
                            throw new AssertionError(`expected header '${key}' to be '${value}' but got '${response.headers.get(key)}'`);
                        }
                    }
                }
            }
        },
        environment: {
            get: (key: string): string | undefined => {
                return mutableEnv[key];
            },
            set: (key: string, value: any) => {
                mutableEnv[key] = String(value);
            }
        },
        test: (testName: string, callback: () => void) => {
            try {
                callback();
                results.push({ name: testName, passed: true });
            } catch (error) {
                results.push({
                    name: testName,
                    passed: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        },
        expect: createExpect
    };

    try {
        const testRunner = new Function('pm', script);
        testRunner(pm);
    } catch (error) {
        console.error("Error executing test script:", error);
        results.push({
            name: "Test Script Execution",
            passed: false,
            error: `Global script error: ${error instanceof Error ? error.message : String(error)}`,
        });
    }

    return { testResults: results, updatedVariables: mutableEnv };
};