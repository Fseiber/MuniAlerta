import { GoogleGenAI, Type } from '@google/genai';
import type { Gravedad } from '@prisma/client';

const MODELO = 'gemini-3.8-flash';
const GRAVEDADES: Gravedad[] = ['LEVE', 'MODERADO', 'GRAVE'];

function obtenerCliente(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('tu_')) return null;
  return new GoogleGenAI({ apiKey });
}

export async function clasificarGravedad(texto: string): Promise<Gravedad> {
  const cliente = obtenerCliente();
  if (!cliente) return 'MODERADO';

  const respuesta = await cliente.models.generateContent({
    model: MODELO,
    contents: `Clasifica la gravedad del siguiente reporte ciudadano: "${texto}"`,
    config: {
      systemInstruction: 'Devuelve exclusivamente un objeto JSON con la gravedad. Usa solo LEVE, MODERADO o GRAVE.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          gravedad: { type: Type.STRING, enum: GRAVEDADES },
        },
        required: ['gravedad'],
      },
    },
  });

  const contenido = respuesta.text?.trim();
  if (!contenido) throw new Error('Gemini no devolvió una clasificación');
  const resultado = JSON.parse(contenido) as { gravedad?: string };
  if (!resultado.gravedad || !GRAVEDADES.includes(resultado.gravedad as Gravedad)) {
    throw new Error('Gemini devolvió una gravedad inválida');
  }
  return resultado.gravedad as Gravedad;
}

export async function generarBoletin(contexto: string): Promise<string> {
  const cliente = obtenerCliente();
  if (!cliente) throw new Error('GEMINI_API_KEY no está configurada');

  const respuesta = await cliente.models.generateContent({
    model: MODELO,
    contents: `Redacta un Boletín Municipal de Incidencias usando estos reportes:\n${contexto}`,
    config: {
      systemInstruction: "Redacta un Boletín Municipal de Incidencias. Responde únicamente con Markdown. Escribe exactamente 3 viñetas muy breves: zonas más afectadas y acciones sugeridas para la municipalidad. No agregues título ni introducción. PROHIBIDO usar el término 'Defensa Civil'. Para equipos de rescate, debes utilizar EXCLUSIVAMENTE los términos 'bomberos', 'ambulancias' o 'equipos de emergencia'.",
    },
  });

  const boletin = respuesta.text?.trim();
  if (!boletin) throw new Error('Gemini no devolvió un boletín');
  return boletin;
}
