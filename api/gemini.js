const GEMINI_API_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4
].filter(Boolean);

const MODELS = [
    "gemini-3-flash-preview",
    "gemini-3-pro",
    "gemini-3-flash-8b",
    "gemini-3-flash",
    "gemini-1.5-flash"
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt requerido' });
    }

    const contents = [{ parts: [{ text: prompt }] }];

    for (let modelName of MODELS) {
        let keys = [...GEMINI_API_KEYS].sort(() => Math.random() - 0.5);

        for (let key of keys) {
            for (let ver of ['v1beta', 'v1']) {
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/${ver}/models/${modelName}:generateContent?key=${key}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents,
                                generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }
                            })
                        }
                    );

                    const data = await response.json();
console.error(`${modelName} | ${ver} | status: ${response.status} | ${JSON.stringify(data)}`);

if (response.ok && data.candidates) {
    return res.status(200).json(data);
}

                } catch (error) {
                    console.error(`Error con ${modelName}:`, error.message);
                }
            }
        }
    }

    return res.status(500).json({ error: 'Todas las claves API están agotadas o bloqueadas' });
}
