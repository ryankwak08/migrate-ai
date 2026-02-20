import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// ES module 경로 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프론트엔드 서빙
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Gemini API 키
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post("/api/recommend", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    }

    const profile = req.body?.profile;
    if (!profile) return res.status(400).json({ error: "profile is required" });

    const prompt = `
너는 다문화가족(이주민)을 위한 AI 직업 추천기다.

원칙:
- 추천은 3개 이내
- 각 추천마다: 이유(3줄), 준비 단계(3~6단계), 예상 기간, 예상 비용, 리스크 1~2개
- 한국어로 간결하게 작성
- 체류자격 관련은 일반 정보로 안내하고, 최종 확인은 공식기관에서 하라고 안내

[사용자 프로필]
${JSON.stringify(profile, null, 2)}
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API error",
        detail: data
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "(응답을 받지 못했습니다)";

    res.json({ result });

  } catch (error) {
    res.status(500).json({ error: "Server error", detail: String(error) });
  }
});

app.listen(3000, () => {
  console.log("✅ MIGRATE AI demo running at http://localhost:3000");
});