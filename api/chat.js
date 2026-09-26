const OpenAI = require("openai");
const { chatWithFreeFallback } = require("./free-router");

module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, language = "الدارجة المغربية" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt required" });
    }

    const system = [
      "أنت AI Maroc، مساعد عملي للمستخدمين في المغرب.",
      "أجب بلغة المستخدم المطلوبة: " + language + ".",
      "كن واضحاً ومختصراً ومفيداً.",
      "لا تخترع معلومات رسمية أو أرقاماً غير مؤكدة.",
      "عند طلب كتابة رسالة، أعط النص الجاهز للاستعمال مباشرة."
    ].join(" ");

    const messages = [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ];

    // Use OpenAI only when explicitly configured, otherwise use the free-provider router.
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: messages
      });
      return res.status(200).json({
        answer: response.output_text,
        provider: "openai"
      });
    }

    const result = await chatWithFreeFallback(messages);
    return res.status(200).json(result);
  } catch (e) {
    console.error("AI Maroc error:", e.details || e.message);
    return res.status(503).json({
      error: "ما كاين حتى محرك AI متاح دابا. زيد مفتاح واحد على الأقل من Environment Variables.",
      details: e.details || undefined
    });
  }
};
