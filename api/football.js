const BASE_URL = "https://api.sportmonks.com/v3/football";
const hits = new Map();
const BASE_INCLUDES = "participants;league;state;scores;venue";
const DETAIL_INCLUDES = "participants;league;state;scores;venue;statistics.type;events.type;lineups.details.type;odds;predictions;sidelined;expectedLineups;xGFixture;coaches;referees";

function json(res, status, payload, cache = "no-store") {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  return res.json(payload);
}

function clientKey(req) {
  return String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0].trim();
}

function limited(req, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const key = clientKey(req);
  const previous = hits.get(key) || [];
  const active = previous.filter(timestamp => now - timestamp < windowMs);
  if (active.length >= limit) {
    hits.set(key, active);
    return true;
  }
  active.push(now);
  hits.set(key, active);
  if (hits.size > 5000) {
    for (const [address, timestamps] of hits) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1] >= windowMs) hits.delete(address);
    }
  }
  return false;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(start, end) {
  return Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000);
}

function positiveInteger(value, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? number : null;
}

function buildRequest(query) {
  const action = String(query.action || "");
  const params = new URLSearchParams();
  let path;
  let maxRangeDays = 14;

  if (action === "live") {
    path = "/livescores";
    params.set("include", BASE_INCLUDES);
    params.set("per_page", "50");
  } else if (action === "fixtures") {
    if (query.date !== undefined) {
      if (!validDate(String(query.date))) return { error: "التاريخ خاصو يكون صحيح وبصيغة YYYY-MM-DD." };
      path = "/fixtures/date/" + String(query.date);
    } else {
      const from = String(query.from || "");
      const to = String(query.to || "");
      if (!validDate(from) || !validDate(to)) {
        return { error: "دخل تاريخ البداية والنهاية بصيغة YYYY-MM-DD." };
      }
      if (daysBetween(from, to) < 0) return { error: "تاريخ النهاية خاصو يكون من بعد أو يساوي تاريخ البداية." };
      if (daysBetween(from, to) > maxRangeDays) return { error: "الفترة القصوى للبحث هي 14 يوم فكل طلب." };
      path = "/fixtures/between/" + from + "/" + to;
    }
    params.set("include", BASE_INCLUDES);
    params.set("per_page", "50");
    params.set("order", "asc");
  } else if (action === "fixture") {
    const id = positiveInteger(query.id);
    if (!id) return { error: "معرّف المباراة غير صالح." };
    path = "/fixtures/" + id;
    params.set("include", DETAIL_INCLUDES);
  } else if (action === "search") {
    const term = String(query.q || "").trim().slice(0, 80);
    if (term.length < 2) return { error: "كتب على الأقل جوج حروف من اسم الفريق أو المباراة." };
    path = "/fixtures/search/" + encodeURIComponent(term);
    params.set("include", BASE_INCLUDES);
    params.set("per_page", "30");
    params.set("order", "desc");
  } else if (action === "team-form") {
    const teamId = positiveInteger(query.team_id);
    const from = String(query.from || "");
    const to = String(query.to || "");
    if (!teamId) return { error: "معرّف الفريق غير صالح." };
    if (!validDate(from) || !validDate(to)) return { error: "دخل تاريخ البداية والنهاية بصيغة YYYY-MM-DD." };
    if (daysBetween(from, to) < 0 || daysBetween(from, to) > 100) {
      return { error: "الفترة خاصها تكون بين 0 و100 يوم." };
    }
    path = "/fixtures/between/" + from + "/" + to + "/" + teamId;
    params.set("include", BASE_INCLUDES);
    params.set("per_page", "50");
    params.set("order", "desc");
  } else if (action === "leagues") {
    path = "/leagues";
    params.set("include", "country;currentSeason");
    params.set("per_page", "50");
  } else if (action === "standings") {
    const seasonId = positiveInteger(query.season_id);
    if (!seasonId) return { error: "معرّف الموسم غير صالح." };
    path = "/standings/seasons/" + seasonId;
    params.set("include", "participant;details.type");
    params.set("per_page", "50");
  } else {
    return { error: "طلب غير معروف. استعمل live أو fixtures أو fixture أو search أو team-form أو leagues أو standings." };
  }

  if (query.page !== undefined) {
    const page = positiveInteger(query.page, 1000);
    if (!page) return { error: "رقم الصفحة غير صالح." };
    params.set("page", String(page));
  }

  return { action, path, params };
}

async function requestSportmonks(path, params, token) {
  const url = new URL(BASE_URL + path);
  url.search = params.toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: token,
        Accept: "application/json"
      },
      signal: controller.signal
    });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = null; }

    if (!response.ok) {
      const error = new Error("Sportmonks request failed");
      error.status = response.status;
      throw error;
    }
    if (!payload || typeof payload !== "object") throw new Error("Invalid Sportmonks response");
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "الطلب غير مسموح. استعمل GET." });
  }

  const built = buildRequest(req.query || {});
  if (built.error) return json(res, 400, { error: built.error });

  if (limited(req)) {
    return json(res, 429, { error: "طلبات كثيرة دابا. عاود المحاولة من بعد دقيقة." });
  }

  const token = process.env.SPORTMONKS_API_TOKEN || process.env.SPORTMONKS_TOKEN;
  if (!token) {
    return json(res, 503, {
      error: "Sportmonks مازال ما مفعّلش فالسيرفر.",
      code: "SPORTMONKS_TOKEN_MISSING",
      required_environment_variable: "SPORTMONKS_API_TOKEN"
    });
  }

  try {
    const payload = await requestSportmonks(built.path, built.params, token);
    return json(res, 200, {
      source: "Sportmonks",
      action: built.action,
      fetched_at: new Date().toISOString(),
      ...payload
    }, "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
  } catch (error) {
    const status = error.status;
    if (status === 403 && built.action === "fixture") {
      try {
        const basicParams = new URLSearchParams();
        basicParams.set("include", BASE_INCLUDES);
        const basicPayload = await requestSportmonks(built.path, basicParams, token);
        return json(res, 200, {
          source: "Sportmonks",
          action: "fixture",
          fetched_at: new Date().toISOString(),
          limited_detail: true,
          warning: "بعض الإحصائيات المتقدمة غير متاحة ضمن الخطة الحالية؛ تم إرجاع بيانات المباراة الأساسية.",
          ...basicPayload
        }, "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
      } catch (fallbackError) {
        if (fallbackError.status === 401) {
          return json(res, 502, { error: "Sportmonks رفض مفتاح API. تحقق من المفتاح داخل إعدادات السيرفر.", code: "SPORTMONKS_INVALID_TOKEN" });
        }
        return json(res, 502, { error: "Sportmonks لا يسمح بالبيانات المطلوبة ضمن الخطة الحالية.", code: "SPORTMONKS_PLAN_ACCESS" });
      }
    }
    if (status === 401) {
      return json(res, 502, { error: "Sportmonks رفض مفتاح API. تحقق من المفتاح داخل إعدادات السيرفر.", code: "SPORTMONKS_INVALID_TOKEN" });
    }
    if (status === 403) {
      return json(res, 502, { error: "Sportmonks لا يسمح بهذا النوع من البيانات ضمن الخطة الحالية.", code: "SPORTMONKS_PLAN_ACCESS" });
    }
    if (status === 429) {
      return json(res, 502, { error: "وصلنا للحد المسموح من طلبات Sportmonks. حاول لاحقاً.", code: "SPORTMONKS_RATE_LIMIT" });
    }
    if (error.name === "AbortError") {
      return json(res, 504, { error: "Sportmonks تأخر فالرد. عاود المحاولة.", code: "SPORTMONKS_TIMEOUT" });
    }
    return json(res, 502, { error: "تعذر جلب بيانات كرة القدم من Sportmonks دابا.", code: "SPORTMONKS_UPSTREAM_ERROR" });
  }
};

module.exports._test = { buildRequest, validDate, daysBetween };
