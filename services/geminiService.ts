

import { GoogleGenAI, Type } from "@google/genai";
import { PostmanItem, PostmanRequest, ResponseData } from '../types';

const schema = {
  type: Type.OBJECT,
  properties: {
    testScript: {
      type: Type.STRING,
      description: "A JavaScript test script for Postman. It must include tests for the status code and validations for the response body's structure and data types. Use pm.test() and pm.expect(). Test names should be in Spanish and follow the provided example structure."
    }
  },
  required: ["testScript"]
};

export const generateTestsForRequest = async (request: PostmanRequest, responseData: any, apiKey: string, userInstructions: string): Promise<{ testScript: string; }> => {
    if (!apiKey) {
        throw new Error("API Key not provided. Please set your Gemini API key.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const statusCode = responseData.status;
    const responseBody = responseData.body;
    
    const responseToAnalyze = JSON.stringify(responseBody, null, 2);

    const userInstructionsSection = userInstructions.trim() 
    ? `
### INSTRUCCIONES ADICIONALES DEL USUARIO ###
El usuario ha proporcionado el siguiente texto. Puede contener instrucciones específicas (ej. "guarda el token en una variable de entorno"), o tests ya existentes que el usuario quiere mantener o mejorar. Tu tarea es integrar estas instrucciones de forma inteligente con los tests que generas automáticamente.
\`\`\`
${userInstructions}
\`\`\`
` 
    : '';

    const prompt = `
      Eres un ingeniero de QA experto en automatización de pruebas de API. Tu tarea es crear un script de pruebas de Postman que siga un formato muy específico y respete las limitaciones de sintaxis de un motor de pruebas personalizado.

      ### EJEMPLO DE ESTRUCTURA PERFECTA ###

      **Contexto de Ejemplo (Respuesta Exitosa):**
      - Código de Estado: 200
      - Cuerpo de Respuesta:
        \`\`\`json
        {
          "success": "OK",
          "data": { "user_id": 123, "active": true },
          "errors": []
        }
        \`\`\`

      **Script de Pruebas IDEAL para el ejemplo:**
      \`\`\`javascript
      const jsonData = pm.response.json();

      pm.test("El estado de la respuesta es 200", () => { pm.response.to.have.status(200); });
      pm.test("Cuerpo de respuesta tiene propiedades esperadas", () => {
          pm.expect(jsonData).to.have.property('success');
          pm.expect(jsonData).to.have.property('data');
          pm.expect(jsonData).to.have.property('errors');
      });
      pm.test("Tipos de datos son correctos", () => {
          pm.expect(jsonData.success).to.be.a('string');
          pm.expect(jsonData.data).to.be.an('object');
          pm.expect(jsonData.errors).to.be.an('array');
      });
      pm.test("El array 'errors' está vacío", () => {
          pm.expect(jsonData.errors).to.be.empty;
      });
      pm.test("El campo 'success' tiene el valor esperado", () => {
          pm.expect(jsonData.success).to.eql('OK');
      });
      \`\`\`

      ### REGLAS DE SINTAXIS CRÍTICAS ###
      El motor de pruebas es limitado. Sigue estas reglas SIN EXCEPCIÓN:
      1.  **Arrays no vacíos:** Para verificar que un array NO está vacío, usa \`pm.expect(miArray).to.not.be.empty;\`.
      2.  **Arrays vacíos:** Para verificar que un array SÍ está vacío, usa \`pm.expect(miArray).to.be.empty;\`.
      3.  **Sintaxis Prohibida:** NUNCA uses \`.and\`, \`.length\`, \`.lengthOf\`, \`.at\`, \`.least\`, \`.above\`. Son inválidos y romperán el script.
          - **INCORRECTO:** \`pm.expect(jsonData.messages).to.be.an('array').and.to.have.lengthOf.at.least(1);\`
          - **CORRECTO:** \`pm.expect(jsonData.messages).to.not.be.empty;\`

      ### TU TAREA ###

      Ahora, basándote en el **CONTEXTO REAL** de la respuesta de la API, y las **INSTRUCCIONES DEL USUARIO** (si existen), genera un script de pruebas completo.

      **CONTEXTO REAL DE LA RESPUESTA:**
      - **Código de Estado:** ${statusCode}
      - **Cuerpo de la Respuesta:**
      \`\`\`json
      ${responseToAnalyze}
      \`\`\`
      ${userInstructionsSection}
      **Instrucciones Adicionales:**
      -   **Genera Pruebas Base:** Siempre genera pruebas básicas para el código de estado y la estructura del cuerpo de la respuesta (si es JSON), como se muestra en el ejemplo.
      -   **Integra Instrucciones del Usuario:** Combina inteligentemente las pruebas base con las peticiones del usuario. Si el usuario pide guardar una variable, añade esa línea (ej. \`pm.environment.set("mi_variable", jsonData.data.token);\`). Si el texto del usuario ya contiene tests válidos, puedes mantenerlos y añadir los tuyos. El objetivo es un script final coherente y completo.
      -   **Nombres en Español:** Todos los nombres de las pruebas (\`pm.test("nombre", ...)\`) deben estar en español.
      -   **Siempre 'jsonData':** El script DEBE comenzar con \`const jsonData = pm.response.json();\` (a menos que la respuesta no sea JSON, en cuyo caso adáptate).
      -   **Formato de Salida Obligatorio:** El script DEBE ser una cadena de texto multilínea. Cada prueba \`pm.test(...);\` y cada declaración importante (como \`const jsonData ...\`) DEBE estar en su propia línea. Usa saltos de línea (\\n) para separar las sentencias. NO devuelvas todo el script en una sola línea.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonText = response.text;
        
        if (typeof jsonText !== 'string' || !jsonText.trim()) {
            console.error("Gemini API returned an empty or invalid response.", { response });
            const candidate = response.candidates?.[0];
            const finishReason = candidate?.finishReason;
            let reasonText = "el servicio de IA devolvió una respuesta vacía o inválida.";
            if (finishReason && finishReason !== 'STOP') {
                reasonText = `la generación fue detenida por la razón: ${finishReason}.`;
                if (finishReason === 'SAFETY') {
                    reasonText += ' El contenido puede haber sido bloqueado por políticas de seguridad.'
                }
            }
             throw new Error(`La generación de tests falló: ${reasonText} Revisa la consola del navegador para más detalles.`);
        }

        try {
            const result = JSON.parse(jsonText.trim());
            if (!result.testScript) {
                 throw new Error("La respuesta de la IA no contiene la propiedad 'testScript' esperada.");
            }
            return {
                testScript: result.testScript,
            };
        } catch (parseError) {
             console.error("Failed to parse JSON response from Gemini:", parseError);
             console.error("Malformed JSON string:", jsonText);
             throw new Error("La generación de tests falló: la respuesta de la IA no era un JSON válido.");
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Error al generar los casos de prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};


export const generateTestExecutionReport = async (item: PostmanItem, responseData: ResponseData, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key not provided. Please set your Gemini API key.");
    }
    const ai = new GoogleGenAI({ apiKey });

    // Prepare data for the prompt
    const { request } = item;
    const { testResults, requestTimestamp, responseTime, requestHeaders } = responseData;
    const { status, statusText, body: responseBody, headers: responseHeaders } = responseData.response;

    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    
    const getPayloadString = (req?: PostmanRequest): string => {
        if (!req?.body) return 'N/A';
        switch (req.body.mode) {
            case 'raw':
                if (!req.body.raw) return '(Empty)';
                try {
                    return JSON.stringify(JSON.parse(req.body.raw), null, 2);
                } catch {
                    return req.body.raw;
                }
            case 'formdata':
                return (req.body.formdata || []).map(p => `${p.key}: ${p.type === 'file' ? `[File: ${p.value}]` : p.value}`).join('\n');
            default: return 'N/A';
        }
    };
    
    const dataForAI = {
        requestName: item.name,
        overallStatus: passedCount === totalCount && totalCount > 0 ? 'PASSED' : 'FAILED',
        passedCount,
        totalCount,
        timestamp: requestTimestamp ? new Date(requestTimestamp).toLocaleString() : 'N/A',
        method: request?.method,
        url: request?.url?.raw,
        responseTime: `${responseTime}ms`,
        requestPayload: getPayloadString(request),
        requestHeaders: JSON.stringify(requestHeaders, null, 2),
        responseStatusCode: status,
        responseStatusText: statusText,
        responseBody: typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : String(responseBody),
        responseHeaders: JSON.stringify(responseHeaders, null, 2),
        detailedTestResults: testResults.map(({ name, passed, error }) => ({ name, passed, error: error || '' })),
    };

const prompt = `
Eres un analista de QA y redactor técnico experto. Tu tarea es generar un informe de ejecución de pruebas de APIs profesional, claro y en español, basado en los siguientes datos.

Debes estructurar el informe en secciones con títulos claros. El formato es similar a Markdown pero sin tablas Markdown, solo listas y bloques de código cuando sea necesario.

NO incluyas encabezados, comentarios o explicaciones fuera del contenido del informe.

### PLANTILLA A USAR

# Informe de Ejecución de Pruebas

## 1. Resumen General
- **Nombre de la Prueba:** ${dataForAI.requestName}
- **Resultado General:** ${dataForAI.overallStatus} - (${dataForAI.passedCount} de ${dataForAI.totalCount} pasaron)
- **Fecha de Ejecución:** ${dataForAI.timestamp}
- **Endpoint:** ${dataForAI.method} ${dataForAI.url}
- **Tiempo de Respuesta:** ${dataForAI.responseTime}

## 2. Detalles de la Request
### Payload Enviado
\`\`\`json
${dataForAI.requestPayload || '{}'}
\`\`\`

### Headers Enviados
\`\`\`json
${dataForAI.requestHeaders || '{}'}
\`\`\`

## 3. Detalles de la Respuesta
### Código de Estado
- ${dataForAI.responseStatusCode} - ${dataForAI.responseStatusText || ''}

### Cuerpo de la Respuesta
\`\`\`json
${dataForAI.responseBody || '{}'}
\`\`\`

### Headers de la Respuesta
\`\`\`json
${dataForAI.responseHeaders || '{}'}
\`\`\`

## 4. Resultados Detallados de las Pruebas
${dataForAI.detailedTestResults.map(result => `
- ${result.passed ? '✅' : '❌'} ${result.name}
${!result.passed ? `  - **Error:** ${result.error}` : ''}`).join('')}

## 5. Análisis y Recomendaciones
Analiza el estado general del endpoint considerando el código HTTP, la estructura del JSON, los tokens presentes (si existen) y la validez de los datos. Si todo fue exitoso, incluye una breve validación de salud del endpoint. Si hubo fallas, explica de forma técnica y concisa las causas más probables y qué se podría revisar.

Entrega solo el informe final, sin explicaciones adicionales, sin repetir el contenido JSON ni los datos crudos.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        return response.text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Error al generar el informe de pruebas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};
