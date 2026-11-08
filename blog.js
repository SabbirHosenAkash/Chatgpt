(() => {
  const root = document.getElementById("blog-content");
  const config = window.PORTFOLIO_CONFIG || {};
  const api = (config.API_BASE_URL || "").replace(/\/+$/,"");
  const slug = new URLSearchParams(location.search).get("slug");
  const safe = v => String(v ?? "");
  document.getElementById("year").textContent = new Date().getFullYear();
  function meta(property, content) {
    let node=document.querySelector(`meta[property="${property}"]`);
    if(!node){node=document.createElement("meta");node.setAttribute("property",property);document.head.append(node);}
    node.setAttribute("content",content);
  }
  async function run(){
    if(!api){root.textContent="The article service has not been configured yet. Please return to the portfolio.";return;}
    try{
      const response=await fetch(`${api}/api/public/posts`);
      if(!response.ok)throw new Error("Could not load articles.");
      const data=await response.json(), posts=Array.isArray(data.items)?data.items:[];
      if(slug){
        const post=posts.find(p=>p.slug===slug);
        if(!post){root.textContent="Article not found or not published.";return;}
        document.title=`${safe(post.title)} | Sabbir Hosen Akash`;
        const description=safe(post.summary||post.title);
        const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=description.slice(0,160);
        meta("og:title",document.title);meta("og:description",description);meta("og:url",location.href);
        let canonical=document.querySelector('link[rel="canonical"]');
        if(canonical)canonical.href=location.href;
        root.replaceChildren();
        if(post.image_url){const img=document.createElement("img");img.src=post.image_url;img.alt=safe(post.title);img.loading="lazy";root.append(img);}
        const title=document.createElement("h1");title.textContent=safe(post.title);root.append(title);
        if(post.published_at){const date=document.createElement("p");date.className="blog-meta";date.textContent=new Date(post.published_at).toLocaleDateString();root.append(date);}
        if(post.summary){const summary=document.createElement("p");summary.className="blog-meta";summary.textContent=safe(post.summary);root.append(summary);}
        const content=document.createElement("div");content.className="blog-content";content.textContent=safe(post.content||post.summary||"");root.append(content);
      }else{
        root.replaceChildren();
        const title=document.createElement("h1");title.textContent="Blog & Articles";root.append(title);
        if(!posts.length){root.textContent="No articles have been published yet.";return;}
        posts.forEach(post=>{
          const card=document.createElement("article");card.className="interactive-box";
          const h=document.createElement("h2");h.textContent=safe(post.title);
          const p=document.createElement("p");p.textContent=safe(post.summary||"");
          const a=document.createElement("a");a.className="btn-link";a.href=`blog.html?slug=${encodeURIComponent(post.slug)}`;a.textContent="Read Article";
          card.append(h,p,a);root.append(card);
        });
      }
    }catch(error){root.textContent=error.message;}
  }
  run();
})();
