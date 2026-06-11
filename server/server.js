import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "80mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analysisPrompt = `
너는 계약서 위험도 평가 AI다.

반드시 아래 형식을 정확히 지켜서 답변해라.

위험도 점수: XX/100

위험도 등급: 안전 또는 주의 또는 위험

발견된 위험 조항:
- 항목1
- 항목2

계약서 핵심 요약:
(3~5줄)

반드시 확인해야 할 부분:
- 항목1
- 항목2

쉬운 설명:
(일반인이 이해하기 쉽게 설명)

최종 의견:
(계약 체결 전 확인해야 할 사항)

규칙:

1. 첫 줄은 반드시 "위험도 점수: 숫자/100"
2. 두 번째 줄은 반드시 "위험도 등급:"
3. 위험도 점수는 반드시 계산해서 표시
4. 발견된 위험 조항은 반드시 목록으로 출력
5. 형식을 변경하지 마라

위험도 기준:

0~30 = 안전
31~70 = 주의
71~100 = 위험

위험 요소:
- 자동 연장
- 위약금
- 손해배상
- 책임 면제
- 중도해지 제한
- 과도한 개인정보 수집
- 불리한 관할 법원

위 요소가 많을수록 위험도를 높여라.
`;

app.get("/", (req, res) => {
  res.send("Gemini 계약서 분석 서버 실행 중");
});

app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "계약서 내용을 입력해주세요." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(`
${analysisPrompt}

계약서 내용:
${text}
`);

    res.json({ result: result.response.text() });
  } catch (error) {
    console.error("Gemini 텍스트 분석 오류:", error);
    res.status(500).json({ error: "AI 분석 중 오류가 발생했습니다." });
  }
});

app.post("/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "이미지가 없습니다." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent([
      `
이미지 속 계약서 글자를 먼저 읽어낸 뒤 분석해라.

${analysisPrompt}
`,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ]);

    res.json({ result: result.response.text() });
  } catch (error) {
    console.error("Gemini 이미지 분석 오류:", error);
    res.status(500).json({ error: "이미지 분석 중 오류가 발생했습니다." });
  }
});

app.post("/analyze-pdf", async (req, res) => {
  try {
    const { pdfBase64, mimeType } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF 파일이 없습니다." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent([
      `
PDF 계약서 내용을 읽고 분석해라.

${analysisPrompt}
`,
      {
        inlineData: {
          data: pdfBase64,
          mimeType: mimeType || "application/pdf",
        },
      },
    ]);

    res.json({ result: result.response.text() });
  } catch (error) {
    console.error("Gemini PDF 분석 오류:", error);
    res.status(500).json({ error: "PDF 분석 중 오류가 발생했습니다." });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});