
import { GoogleGenAI, Type } from "@google/genai";
import { PostmanRequest } from '../types';

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

export const generateTestsForRequest = async (request: PostmanRequest, responseData: any, apiKey: string): Promise<{ testScript: string; }> => {
    if (!apiKey) {
        throw new Error("API Key not provided. Please set your Gemini API key.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const statusCode = responseData.status;
    const responseBody = responseData.body;
    
    const responseToAnalyze = JSON.stringify(responseBody, null, 2);

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

      Ahora, basándote en el **CONTEXTO REAL** de la respuesta de la API, genera un script de pruebas que siga la estructura del ejemplo y respete TODAS las reglas de sintaxis.

      **CONTEXTO REAL DE LA RESPUESTA:**
      - **Código de Estado:** ${statusCode}
      - **Cuerpo de la Respuesta:**
      \`\`\`json
      ${responseToAnalyze}
      \`\`\`
      
      **Instrucciones Adicionales:**
      -   **Usa el Contexto Real:** El test para el código de estado debe usar el valor de "Código de Estado" real. Si es un error 4xx/5xx, crea pruebas que validen la estructura del mensaje de error.
      -   **Nombres en Español:** Todos los nombres de las pruebas (\`pm.test("nombre", ...)\`) deben estar en español.
      -   **Siempre 'jsonData':** El script DEBE comenzar con \`const jsonData = pm.response.json();\`.
      -   **Salida Limpia:** Retorna ÚNICAMENTE el código JavaScript del script. No incluyas explicaciones ni texto adicional.
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
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        return {
            testScript: result.testScript || '',
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Failed to generate test cases from AI service.");
    }
};
