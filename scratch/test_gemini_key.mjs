import 'dotenv/config';

const GEMINI_API_KEY = "AIzaSyC8YnKSZYQXCMPjfArc42lDZZAJhO-HV0A";
const model = "gemini-flash-latest";

async function testGemini() {
    console.log(`Testing ${model}...`);
    
    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: "Hola, ¿quién eres y qué puedes hacer por mi clínica estética?" }]
            }
        ],
        system_instruction: {
            parts: [{ text: "Eres Citenly AI, un experto asesor de crecimiento para clínicas médicas estéticas." }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Gemini Error:", data.error);
            return;
        }

        console.log("Response:", data.candidates[0].content.parts[0].text);
        console.log("\nSuccess!");
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testGemini();
