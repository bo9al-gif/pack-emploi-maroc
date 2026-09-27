const ALLOWED = new Set(["weather","rates","books","jobs","geocode"]);
const hits = new Map();
function json(res,status,data){res.status(status).setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","public, max-age=300, s-maxage=300");return res.end(JSON.stringify(data));}
function clientKey(req){return String(req.headers?.["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim();}
function limited(req,type,limit=30,windowMs=60000){const now=Date.now(),key=clientKey(req)+":"+type;const a=(hits.get(key)||[]).filter(t=>now-t<windowMs);if(a.length>=limit){hits.set(key,a);return true}a.push(now);hits.set(key,a);return false;}
async function get(url,headers){const c=new AbortController();const t=setTimeout(()=>c.abort(),10000);try{const r=await fetch(url,{headers:headers||{},signal:c.signal});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}}if(!r.ok)throw new Error(String(r.status));return data}finally{clearTimeout(t)}}
module.exports=async function(req,res){
if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
const type=String((req.query||{}).type||"");if(!ALLOWED.has(type))return json(res,400,{error:"Unknown tool"});
if(limited(req,type))return json(res,429,{error:"طلبات كثيرة دابا. عاود المحاولة من بعد دقيقة."});
try{
if(type==="weather"){
 let lat=Number(req.query.lat),lon=Number(req.query.lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return json(res,400,{error:"إحداثيات غير صالحة."});
 lat=Math.round(lat*10000)/10000;lon=Math.round(lon*10000)/10000;
 const u="https://api.met.no/weatherapi/locationforecast/2.0/compact?lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lon);
 const d=await get(u,{"User-Agent":"AI-Maroc/1.0 github.com/bo9al-gif/pack-emploi-maroc"});
 const ts=d?.properties?.timeseries||[],first=ts[0],details=first?.data?.instant?.details||{};
 return json(res,200,{source:"MET Norway",license:"CC BY 4.0",coordinates:{lat,lon},current:{time:first?.time||null,temperature_c:details.air_temperature??null,humidity_pct:details.relative_humidity??null,wind_mps:details.wind_speed??null,pressure_hpa:details.air_pressure_at_sea_level??null},next_hours:ts.slice(0,24).map(x=>({time:x.time,temperature_c:x?.data?.instant?.details?.air_temperature??null,wind_mps:x?.data?.instant?.details?.wind_speed??null,symbol:x?.data?.next_1_hours?.summary?.symbol_code??null,precipitation_mm:x?.data?.next_1_hours?.details?.precipitation_amount??null}))});
}
if(type==="rates"){
 const base=(String(req.query.base||"EUR").toUpperCase()).replace(/[^A-Z]/g,"").slice(0,3)||"EUR";
 const quote=(String(req.query.quote||"MAD,USD").toUpperCase()).replace(/[^A-Z,]/g,"").slice(0,31);
 return json(res,200,await get("https://api.frankfurter.dev/v2/rates?base="+base+"&quotes="+quote));
}
if(type==="books"){
 const q=String(req.query.q||"").trim().slice(0,120);if(!q)return json(res,400,{error:"q required"});
 return json(res,200,await get("https://openlibrary.org/search.json?q="+encodeURIComponent(q)+"&limit=8&fields=key,title,author_name,first_publish_year,cover_i",{"User-Agent":"AI-Maroc/1.0 github.com/bo9al-gif/pack-emploi-maroc"}));
}
if(type==="jobs"){
 const data=await get("https://www.arbeitnow.com/api/job-board-api"),items=Array.isArray(data)?data:(data.data||[]);
 const q=String(req.query.q||"").trim().toLowerCase().slice(0,80),filtered=q?items.filter(j=>JSON.stringify(j).toLowerCase().includes(q)):items;
 return json(res,200,{data:filtered.slice(0,20),source:"Arbeitnow",note:"مصدر وظائف عام؛ النتائج ليست قاعدة وظائف مغربية رسمية."});
}
if(type==="geocode"){
 const q=String(req.query.q||"").trim().slice(0,120);if(!q)return json(res,400,{error:"q required"});
 return json(res,200,{source:"OpenStreetMap Nominatim",attribution:"© OpenStreetMap contributors",results:await get("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ma&q="+encodeURIComponent(q),{"User-Agent":"AI-Maroc/1.0 github.com/bo9al-gif/pack-emploi-maroc"})});
}
}catch(e){return json(res,502,{error:"الخدمة الخارجية ما جاوباتش دابا.",details:e.message})}}