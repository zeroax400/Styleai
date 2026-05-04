export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mimeType } = req.body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: 'Faltan los campos base64 y mimeType' });
    }

    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Formato invalido: ' + mimeType });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            },
            {
              text: `Analiza esta prenda de ropa y responde SOLO en JSON valido sin markdown ni texto adicional. Formato exacto:
{
  "nombre": "nombre descriptivo de la prenda",
  "tipo": "Camisa/Pantalon/Chaqueta/Zapatos/etc",
  "color_nombre": "color en espanol",
  "color_hex": "#xxxxxx",
  "tono": "frio/calido/neutro",
  "material": "material principal",
  "textura": "lisa/texturizada/estampada",
  "estilo": "casual/formal/sport/smart casual",
  "lavado_temp": "30C/40C/60C",
  "lavado_tipo": "maquina/mano/seco",
  "plancha": "no/baja/media/alta",
  "secadora": "si/no",
  "subtono_ok": "frio/calido/neutro/todos",
  "consejo_uso": "como usar esta prenda para verse bien en maximo 2 oraciones"
}`
            }
          ]
        }],
        generationConfig: {
          response_mime_type: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`API error ${response.status}: ${errData.error?.message || JSON.stringify(errData)}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Respuesta de IA invalida');
    }

    const texto = data.candidates[0].content.parts[0].text.trim();
    const resultado = JSON.parse(texto.replace(/```json\s*|\s*```/g, ''));
    res.status(200).json(resultado);
  } catch (e) {
    console.error('StyleAI API Error:', e);
    res.status(500).json({ error: 'Error al analizar la prenda: ' + e.message });
  }
}
