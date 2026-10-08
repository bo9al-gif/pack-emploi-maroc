const { chatWithFreeFallback } = require("./free-router");

const LANGUAGES = new Set(["الدارجة المغربية", "العربية", "Français", "English"]);
const hits = new Map();

function limited(req, limit = 12, windowMs = 60000) {
  const key = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const a = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (a.length >= limit) { hits.set(key, a); return true; }
  a.push(now); hits.set(key, a);
  return false;
}

async function external(url, headers = {}, timeoutMs = 2500) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), Math.max(1, timeoutMs));
  try {
    const r = await fetch(url, { headers, signal: c.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(t); }
}

async function liveContext(prompt) {
  const p = prompt.toLowerCase();
  const tasks = [];

  if (/صرف|عملة|دولار|يورو|درهم|exchange|currency|eur|usd/.test(p)) {
    tasks.push(
      external("https://api.frankfurter.dev/v2/rates?base=EUR&quotes=MAD,USD")
        .then(d => "بيانات صرف حديثة من Frankfurter: " + JSON.stringify(d))
        .catch(() => null)
    );
  }

  if (/كتاب|كتب|رواية|book|books/.test(p)) {
    const q = encodeURIComponent(prompt.slice(0, 80));
    tasks.push(
      external("https://openlibrary.org/search.json?q=" + q + "&limit=5&fields=title,author_name,first_publish_year")
        .then(d => "نتائج كتب من Open Library: " + JSON.stringify(d.docs || []))
        .catch(() => null)
    );
  }

  if (/وظيف|عمل|توظيف|job|jobs|emploi|travail/.test(p)) {
    tasks.push(
      external("https://www.arbeitnow.com/api/job-board-api")
        .then(d => {
          const items = Array.isArray(d) ? d : (d.data || []);
          return "فرص من Arbeitnow، وهي ليست قاعدة وظائف مغربية رسمية: " + JSON.stringify(items.slice(0, 8));
        })
        .catch(() => null)
    );
  }

  if (!tasks.length) return "";

  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve([]), 3000);
  });

  try {
    const values = await Promise.race([Promise.all(tasks), timeout]);
    return values.filter(Boolean).join("\n");
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (limited(req)) return res.status(429).json({ error: "طلبات كثيرة دابا. عاود المحاولة من بعد دقيقة." });

  try {
    const body = req.body || {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const language = LANGUAGES.has(body.language) ? body.language : "الدارجة المغربية";
    if (!prompt) return res.status(400).json({ error: "كتب الطلب ديالك الأول." });
    if (prompt.length > 8000) return res.status(413).json({ error: "الطلب طويل بزاف. قصّرو وخليه أقل من 8000 حرف." });

    const live = await liveContext(prompt);
    const system = [
      "أنت AI Maroc، مساعد عملي للمستخدمين في المغرب.",
      "أجب بلغة المستخدم المطلوبة: " + language + ".",
      "كن واضحاً ومختصراً ومفيداً، واستعمل أمثلة مغربية فقط عندما تكون مفيدة.",
      "لا تخترع معلومات رسمية أو أرقاماً غير مؤكدة.",
      "إذا كان السؤال متعلقاً بإجراء رسمي أو معلومة متغيرة، وضّح أن المستخدم يجب أن يتحقق من المصدر الرسمي.",
      "عند طلب كتابة رسالة، أعط النص الجاهز للاستعمال مباشرة.",
      live ? "بيانات حية مساعدة من APIs عامة، استعملها فقط إذا كانت مرتبطة بالسؤال ولا تعتبرها مصدراً رسمياً: " + live : ""
    ].filter(Boolean).join(" ");

    const result = await chatWithFreeFallback([
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]);
    return res.status(200).json(result);
  } catch (e) {
    console.error("AI Maroc error:", e.details || e.message);
    return res.status(503).json({ error: "محركات AI المجانية ما جاوباتش دابا. عاود المحاولة من بعد لحظات." });
  }
};