export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mimeType } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 }
            },
            {
              type: 'text',
              text: `Analiza esta prenda de ropa y responde SOLO en JSON con este formato exacto sin markdown:
{
  "nombre": "nombre descriptivo de la prenda",
  "tipo": "Camisa/Pantalón/Chaqueta/Zapatos/etc",
  "color_nombre": "nombre del color en español",
  "color_hex": "#xxxxxx",
  "tono": "frío/cálido/neutro",
  "material": "material principal estimado",
  "textura": "lisa/texturizada/estampada",
  "estilo": "casual/formal/sport/smart casual",
  "lavado_temp": "30°C/40°C/60°C",
  "lavado_tipo": "máquina/mano/seco",
  "plancha": "no/baja/media/alta",
  "secadora": "sí/no",
  "subtono_ok": "frío/cálido/neutro/todos",
  "consejo_uso": "cómo usar esta prenda para verse bien en máximo 2 oraciones"
}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const texto = data.content[0].text.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(texto);
    res.status(200).json(resultado);
  } catch (e) {
    res.status(500).json({ error: 'Error al analizar la prenda: ' + e.message });
  }
}
