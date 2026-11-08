(() => {
  "use strict";
  const cfg = window.ADMIN_CONFIG || {};
  const api = (cfg.API_BASE_URL || "").replace(/\/+$/, "");
  const $ = id => document.getElementById(id);
  let accessToken = "", currentResource = "projects", records = [];
  const labels = {projects:"Projects",services:"Services",products:"Marketplace products",posts:"Blog posts",testimonials:"Testimonials",messages:"Contact messages",orders:"Orders"};
  const setupWarning = $("setup-warning");
  if (cfg.API_BASE_URL && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) setupWarning.classList.add("hidden");

  async function authRequest(path, body) {
    const response = await fetch(`${cfg.SUPABASE_URL}/auth/v1/${path}`, {
      method:"POST", headers:{"Content-Type":"application/json","apikey":cfg.SUPABASE_ANON_KEY},
      body:JSON.stringify(body)
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Authentication failed.");
    return data;
  }
  async function apiRequest(path, options={}) {
    if (!api) throw new Error("API Worker URL is not configured.");
    const response = await fetch(`${api}${path}`, {
      ...options, headers:{"Content-Type":"application/json","Authorization":`Bearer ${accessToken}`,...(options.headers||{})}
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function status(message, error=false) {
    $("dashboard-status").textContent = message;
    $("dashboard-status").style.color = error ? "#ff9b9b" : "#a9d9bb";
  }
  function showDashboard(user) {
    $("login-panel").classList.add("hidden"); $("dashboard").classList.remove("hidden"); $("logout-btn").classList.remove("hidden");
    $("admin-user").textContent = `Signed in: ${user.email || "Administrator"}`;
    loadItems(currentResource);
  }
  $("login-form").addEventListener("submit", async event => {
    event.preventDefault(); $("login-status").textContent = "Signing in…";
    try {
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !api) throw new Error("Complete admin-config.js and config.js first.");
      const auth = await authRequest("token?grant_type=password",{email:$("email").value,password:$("password").value});
      accessToken = auth.access_token;
      const me = await apiRequest("/api/admin/me");
      showDashboard(me.user || {email:$("email").value});
    } catch(error) { accessToken=""; $("login-status").textContent=error.message; }
  });
  $("logout-btn").addEventListener("click", async () => {
    try { if (accessToken) await authRequest("logout",{}); } catch {}
    accessToken=""; $("dashboard").classList.add("hidden"); $("login-panel").classList.remove("hidden"); $("logout-btn").classList.add("hidden");
  });
  $("tabs").addEventListener("click", event => {
    const btn=event.target.closest("button[data-tab]"); if(!btn)return;
    document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("active",b===btn));
    currentResource=btn.dataset.tab; $("editor").classList.add("hidden"); loadItems(currentResource);
  });
  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  async function loadItems(resource) {
    $("section-title").textContent=labels[resource]; $("items-list").textContent="Loading…";
    try {
      const data=await apiRequest(`/api/admin/${resource}`);
      records=data.items||[];
      $("items-list").replaceChildren();
      if(!records.length){$("items-list").textContent="No records yet.";return;}
      records.forEach(item=>{
        const row=document.createElement("article");row.className="item-row";
        const info=document.createElement("div");
        const title=document.createElement("strong");title.textContent=item.title||item.name||item.email||`Record #${item.id}`;
        const meta=document.createElement("p");meta.textContent=`${item.status||"—"} · ${item.created_at?new Date(item.created_at).toLocaleString():""}`;
        info.append(title,meta);
        const detailText = item.message || item.details || item.summary || item.email || "";
        if (detailText) { const detail=document.createElement("p"); detail.textContent=detailText; info.append(detail); }
        if (item.email && detailText !== item.email) { const email=document.createElement("p"); email.textContent=item.email; info.append(email); }
        row.append(info);
        const actions=document.createElement("div");actions.className="row-actions";
        if(!["messages","orders"].includes(resource)){
          const edit=document.createElement("button");edit.textContent="Edit";edit.addEventListener("click",()=>editItem(item));actions.append(edit);
        }
        const del=document.createElement("button");del.textContent="Delete";del.className="delete";del.addEventListener("click",()=>deleteItem(item));actions.append(del);
        if(["messages","orders"].includes(resource)){
          const state=document.createElement("select");["pending","replied","completed"].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;o.selected=item.status===s;state.append(o);});
          state.addEventListener("change",()=>updateStatus(item,state.value));actions.prepend(state);
        }
        row.append(actions);$("items-list").append(row);
      });
    } catch(error){$("items-list").textContent=error.message;status(error.message,true);}
  }
  function editItem(item={}) {
    $("editor").classList.remove("hidden");$("editor-title").textContent=item.id?"Edit item":"Add item";
    $("item-id").value=item.id||"";$("item-title").value=item.title||item.name||"";
    $("item-slug").value=item.slug||"";$("item-summary").value=item.summary||item.description||"";
    $("item-content").value=item.content||"";$("item-image").value=item.image_url||"";
    $("item-url").value=item.url||item.demo_url||"";$("item-price").value=item.price||"";
    $("item-status").value=item.status||"draft";
    $("editor").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("add-btn").addEventListener("click",()=>editItem());
  $("cancel-edit").addEventListener("click",()=>$("editor").classList.add("hidden"));
  $("item-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const payload={title:$("item-title").value,slug:$("item-slug").value,summary:$("item-summary").value,content:$("item-content").value,image_url:$("item-image").value||null,url:$("item-url").value||null,price:$("item-price").value||null,status:$("item-status").value};
    try{
      const id=$("item-id").value;
      await apiRequest(`/api/admin/${currentResource}${id?`/${encodeURIComponent(id)}`:""}`,{method:id?"PATCH":"POST",body:JSON.stringify(payload)});
      $("editor").classList.add("hidden");status("Saved.");loadItems(currentResource);
    }catch(error){status(error.message,true);}
  });
  async function deleteItem(item){
    if(!confirm("Delete this record permanently?"))return;
    try{await apiRequest(`/api/admin/${currentResource}/${encodeURIComponent(item.id)}`,{method:"DELETE"});status("Deleted.");loadItems(currentResource);}
    catch(error){status(error.message,true);}
  }
  async function updateStatus(item,value){
    try{await apiRequest(`/api/admin/${currentResource}/${encodeURIComponent(item.id)}`,{method:"PATCH",body:JSON.stringify({status:value})});status("Status updated.");}
    catch(error){status(error.message,true);}
  }
})();
