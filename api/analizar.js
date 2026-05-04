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

    console.log('Image received, type:', mimeType, 'size:', base64.length);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2024-06-20'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: 'Analiza prendas de ropa y responde SOLO en JSON valido, sin markdown ni texto adicional.',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 }
            },
            {
              type: 'text',
              text: `Analiza esta prenda y responde SOLO JSON con este formato exacto:
{
  "nombre": "nombre descriptivo",
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
  "consejo_uso": "como usar esta prenda para verse bien (maximo 2 oraciones)"
}`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`API error ${response.status}: ${errData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Respuesta de IA invalida');
    }

    let texto = data.content[0].text.replace(/```json\s*|\s*```/g, '').trim();
    const resultado = JSON.parse(texto);
    res.status(200).json(resultado);
  } catch (e) {
    console.error('StyleAI API Error:', e);
    res.status(500).json({ error: 'Error al analizar la prenda: ' + e.message });
  }
}
