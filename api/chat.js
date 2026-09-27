const { chatWithFreeFallback } = require("./free-router");

const LANGUAGES = new Set(["الدارجة المغربية", "العربية", "Français", "English"]);

module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const language = LANGUAGES.has(body.language) ? body.language : "الدارجة المغربية";

    if (!prompt) {
      return res.status(400).json({ error: "كتب الطلب ديالك الأول." });
    }

    if (prompt.length > 8000) {
      return res.status(413).json({ error: "الطلب طويل بزاف. قصّرو وخليه أقل من 8000 حرف." });
    }

    const system = [
      "أنت AI Maroc، مساعد عملي للمستخدمين في المغرب.",
      "أجب بلغة المستخدم المطلوبة: " + language + ".",
      "كن واضحاً ومختصراً ومفيداً، واستعمل أمثلة مغربية فقط عندما تكون مفيدة.",
      "لا تخترع معلومات رسمية أو أرقاماً غير مؤكدة.",
      "إذا كان السؤال متعلقاً بإجراء رسمي أو معلومة متغيرة، وضّح أن المستخدم يجب أن يتحقق من المصدر الرسمي.",
      "عند طلب كتابة رسالة، أعط النص الجاهز للاستعمال مباشرة."
    ].join(" ");

    const messages = [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ];

    const result = await chatWithFreeFallback(messages);
    return res.status(200).json(result);
  } catch (e) {
    console.error("AI Maroc error:", e.details || e.message);
    return res.status(503).json({
      error: "محركات AI المجانية ما جاوباتش دابا. عاود المحاولة من بعد لحظات."
    });
  }
};
