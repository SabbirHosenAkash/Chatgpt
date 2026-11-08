const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const TABLES = {
  projects: { table: "projects", fields: ["title","slug","summary","content","image_url","url","status","sort_order"] },
  services: { table: "services", fields: ["title","slug","summary","content","image_url","price","status","sort_order"] },
  products: { table: "products", fields: ["title","slug","summary","content","image_url","url","price","status","sort_order"] },
  posts: { table: "posts", fields: ["title","slug","summary","content","image_url","url","status","published_at"] },
  testimonials: { table: "testimonials", fields: ["title","summary","content","image_url","status"] },
  messages: { table: "contact_messages", fields: ["status","admin_notes"] },
  orders: { table: "orders", fields: ["status","admin_notes"] }
};
const uuid = () => crypto.randomUUID();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
const clean = value => typeof value === "string" ? value.trim() : value;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://sabbirhosenakash.github.io").split(",").map(v => v.trim());
  const allowOrigin = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([k,v]) => headers.set(k,v));
  return new Response(response.body, { status: response.status, headers });
}
async function supabase(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Backend is not configured.");
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/,"")}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${body.slice(0,300)}`);
  return body ? JSON.parse(body) : null;
}
async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
  });
  return response.ok;
}
async function rateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) return true;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `contact:${ip}:${new Date().toISOString().slice(0,13)}`;
  const count = Number(await env.RATE_LIMIT_KV.get(key) || 0);
  if (count >= 12) return false;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3600 });
  return true;
}
async function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new Error("Unauthorized.");
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/,"")}/auth/v1/user`, {
    headers: { "apikey": env.SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Unauthorized.");
  const user = await response.json();
  const admins = await supabase(env, `admin_users?id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=id,email&limit=1`);
  if (!admins || !admins.length) throw new Error("Administrator access is not enabled for this account.");
  return user;
}
function allowedPayload(resource, body) {
  const config = TABLES[resource];
  if (!config) throw new Error("Unsupported resource.");
  const out = {};
  for (const key of config.fields) if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = clean(body[key]);
  if (out.title !== undefined && !String(out.title).trim()) throw new Error("Title is required.");
  if (out.slug !== undefined) out.slug = String(out.slug).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
  return out;
}
async function logAdmin(env, user, action, resource, recordId) {
  try { await supabase(env, "admin_activity", { method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({admin_id:user.id,action,resource,record_id:recordId||null}) }); } catch {}
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status:204, headers:cors });
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] !== "api") return withCors(json({error:"Not found"},404),request,env);
      if (request.method === "GET" && parts[1] === "health") {
        return withCors(json({ok:true,service:"portfolio-api",databaseConfigured:!!(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY),telegramConfigured:!!(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID)}),request,env);
      }
      if (request.method === "GET" && parts[1] === "public" && ["products","posts","projects","services","testimonials"].includes(parts[2])) {
        const table = TABLES[parts[2]].table;
        const items = await supabase(env, `${table}?status=eq.published&select=*&order=created_at.desc&limit=50`);
        return withCors(json({items}),request,env);
      }
      if (parts[1] === "contact" && request.method === "POST") {
        if (!(await rateLimit(request,env))) return withCors(json({error:"Too many submissions. Please try again later."},429),request,env);
        const body = await request.json();
        if (body._honey) return withCors(json({ok:true,notification:"skipped"}),request,env);
        const name=clean(body.name), email=clean(body.email), message=clean(body.message);
        if (!name || name.length>120 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message || message.length>6000) return withCors(json({error:"Please provide a valid name, email and message."},400),request,env);
        const row = {id:uuid(),name,email,service:clean(body.service)||null,budget:clean(body.budget)||null,message,source:"portfolio",status:"pending"};
        const inserted = await supabase(env,"contact_messages",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});
        let notified=false;
        try { notified=await sendTelegram(env,`New portfolio message\nName: ${name}\nEmail: ${email}\nService: ${row.service||"Not specified"}\nBudget: ${row.budget||"Not specified"}\nMessage: ${message.slice(0,2500)}\nID: ${row.id}`); } catch {}
        return withCors(json({ok:true,id:row.id,notification:notified?"sent":"pending"}),request,env);
      }
      if (parts[1] === "orders" && request.method === "POST") {
        if (!(await rateLimit(request,env))) return withCors(json({error:"Too many submissions. Please try again later."},429),request,env);
        const body=await request.json();
        if (body._honey) return withCors(json({ok:true,notification:"skipped"}),request,env);
        const name=clean(body.name),email=clean(body.email),details=clean(body.message);
        if(!name||name.length>120||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!details||details.length>6000) return withCors(json({error:"Please provide valid order details."},400),request,env);
        const row={id:uuid(),name,email,product_title:clean(body.product_title)||null,service:clean(body.service)||null,budget:clean(body.budget)||null,details,status:"pending"};
        await supabase(env,"orders",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});
        let notified=false;try{notified=await sendTelegram(env,`New website order request\nName: ${name}\nEmail: ${email}\nProduct: ${row.product_title||"Custom request"}\nBudget: ${row.budget||"Not specified"}\nDetails: ${details.slice(0,2500)}\nID: ${row.id}`);}catch{}
        return withCors(json({ok:true,id:row.id,notification:notified?"sent":"pending"}),request,env);
      }
      if (parts[1] === "admin") {
        const user=await requireAdmin(request,env);
        if(parts[2]==="me"&&request.method==="GET") return withCors(json({user:{id:user.id,email:user.email}}),request,env);
        const resource=parts[2], conf=TABLES[resource];
        if(!conf) return withCors(json({error:"Unsupported resource."},404),request,env);
        const id=parts[3];
        if(request.method==="GET"&&!id){
          const items=await supabase(env,`${conf.table}?select=*&order=created_at.desc&limit=200`);
          return withCors(json({items}),request,env);
        }
        if(request.method==="POST"&&!id){
          const payload=allowedPayload(resource,await request.json());
          if(["messages","orders"].includes(resource)) throw new Error("New messages and orders are created through public forms.");
          if(!payload.title) throw new Error("Title is required.");
          if(!payload.slug) payload.slug=String(payload.title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
          const items=await supabase(env,conf.table,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
          await logAdmin(env,user,"create",resource,items?.[0]?.id);
          return withCors(json({item:items?.[0]||null}),request,env);
        }
        if(request.method==="PATCH"&&id){
          const payload=allowedPayload(resource,await request.json());
          if(!Object.keys(payload).length) throw new Error("No editable fields provided.");
          const items=await supabase(env,`${conf.table}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
          await logAdmin(env,user,"update",resource,id);
          return withCors(json({item:items?.[0]||null}),request,env);
        }
        if(request.method==="DELETE"&&id){
          await supabase(env,`${conf.table}?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
          await logAdmin(env,user,"delete",resource,id);
          return withCors(json({ok:true}),request,env);
        }
      }
      return withCors(json({error:"Not found"},404),request,env);
    } catch(error) {
      const message=error.message||"Internal server error";
      const status=/Unauthorized/.test(message)?401:/Administrator access/.test(message)?403:/Please provide|Title is required|No editable|Unsupported resource|No records/.test(message)?400:500;
      return withCors(json({error:status===500?"Server error. Check Worker logs and backend configuration.":message},status),request,env);
    }
  }
};
