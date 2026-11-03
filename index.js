import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Mengambil API Key dari file .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { conversation, tone } = req.body;

  try {
    if (!Array.isArray(conversation)) {
      return res.status(400).json({ error: 'Conversation must be an array!' });
    }

    // Mengubah role bot menjadi model sesuai aturan SDK
    const contents = conversation.map(({ role, text }) => ({
      role: role === 'bot' ? 'model' : role,
      parts: [{ text }]
    }));

    let systemPrompt = "Kamu adalah Adelisa, asisten akademik pribadi mahasiswa. Jawab dengan Bahasa Indonesia yang jelas, ramah, dan mudah dipahami. Berikan jawaban yang ringkas namun lengkap, dan gunakan daftar bernomor hanya bila membantu. Tulis dalam teks biasa tanpa format markdown: jangan memakai **, *, #, atau simbol penekanan lainnya. Hindari emoji dan slang berlebihan.";
    if (tone === "santai") {
      systemPrompt += " Gunakan gaya bahasa santai dan akrab seperti teman sebaya, tetapi tetap sopan, rapi, dan tidak berlebihan.";
    } else if (tone === "formal") {
      systemPrompt += " Gunakan Bahasa Indonesia baku, terstruktur, dan akademis.";
    }

    // gemini-1.5-flash / 2.5-flash sudah pensiun untuk API key baru, pakai model aktif
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error("DETAIL ERROR DARI BACKEND:", e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));