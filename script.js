(() => {
  "use strict";
  const config = window.PORTFOLIO_CONFIG || {};
  const apiBase = (config.API_BASE_URL || "").replace(/\/+$/, "");
  const $ = (selector, scope = document) => scope.querySelector(selector);

  // Animated professional headline
  const roles = ["Web Developer", "Digital Creator", "Creative Writer", "Musician"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  function typeEffect() {
    const target = $("#typing-effect");
    if (!target) return;
    const word = roles[roleIndex];
    target.textContent = word.slice(0, deleting ? --charIndex : ++charIndex);
    let delay = deleting ? 65 : 105;
    if (!deleting && charIndex >= word.length) { deleting = true; delay = 1500; }
    else if (deleting && charIndex <= 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; delay = 350; }
    window.setTimeout(typeEffect, delay);
  }

  // Mobile navigation
  window.toggleMenu = function toggleMenu() {
    const nav = $("#nav-links"), btn = $(".menu-btn");
    if (!nav) return;
    const open = nav.classList.toggle("active");
    if (btn) btn.setAttribute("aria-expanded", String(open));
  };
  document.querySelectorAll("#nav-links a").forEach(link => link.addEventListener("click", () => {
    const nav = $("#nav-links"), btn = $(".menu-btn");
    nav?.classList.remove("active");
    btn?.setAttribute("aria-expanded", "false");
  }));

  // Progressive enhancement: animations and slider are optional dependencies.
  if (window.AOS && typeof window.AOS.init === "function") {
    window.AOS.init({ duration: 700, once: true, mirror: false, disable: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }
  if (window.Swiper && $(".project-slider")) {
    new window.Swiper(".project-slider", {
      loop: true, autoplay: { delay: 3500, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
      effect: "coverflow", grabCursor: true, centeredSlides: true, slidesPerView: "auto",
      coverflowEffect: { rotate: 35, stretch: 0, depth: 90, modifier: 1, slideShadows: true }
    });
  }
  const skillSection = $("#skills");
  if (skillSection && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll(".fill-3d").forEach(bar => { bar.style.width = bar.style.getPropertyValue("--width") || "0"; });
        observer.disconnect();
      }
    }), { threshold: 0.25 });
    observer.observe(skillSection);
  } else {
    document.querySelectorAll(".fill-3d").forEach(bar => bar.style.width = bar.style.getPropertyValue("--width") || "0");
  }

  // Lightweight background animation; disabled for reduced motion and small screens.
  if (window.particlesJS && $("#particles-js") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && window.innerWidth > 640) {
    try { window.particlesJS("particles-js", {
      particles: { number: { value: 42, density: { enable: true, value_area: 900 } }, color: { value: "#00ff88" },
        shape: { type: "circle" }, opacity: { value: 0.32, random: true }, size: { value: 2, random: true },
        line_linked: { enable: true, distance: 145, color: "#00ff88", opacity: 0.14, width: 1 },
        move: { enable: true, speed: 1.5, direction: "none", random: false, straight: false, out_mode: "out" } },
      interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" } } },
      retina_detect: true
    }); } catch (error) { console.warn("Background animation unavailable", error); }
  }

  const showStatus = (message, ok) => {
    const status = $("#form-status");
    if (!status) return;
    status.hidden = false; status.style.display = "block";
    status.className = ok ? "success" : "error";
    status.textContent = message;
  };

  async function submitForm(form) {
    const button = $("#submit-btn", form), buttonText = $("#btn-text", form);
    const original = buttonText?.textContent || "Send Message";
    if (button) button.disabled = true;
    if (buttonText) buttonText.textContent = "Sending...";
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      if (apiBase) {
        const response = await fetch(`${apiBase}/api/contact`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "The message could not be submitted.");
        showStatus(result.notification === "sent" ? "Message saved and notification sent successfully." : "Message received. Notification delivery may be delayed.", true);
      } else {
        // Existing email delivery remains as a fallback until the Worker is configured.
        const response = await fetch("https://formsubmit.co/ajax/info.sabbirhosenakash@gmail.com", {
          method: "POST", body: new FormData(form), headers: { Accept: "application/json" }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error("Email service did not confirm delivery. Please try again or email directly.");
        showStatus("Your message was accepted by the email form service.", true);
      }
      form.reset();
    } catch (error) {
      showStatus(error.message || "Something went wrong. Please email directly.", false);
    } finally {
      if (button) button.disabled = false;
      if (buttonText) buttonText.textContent = original;
    }
  }
  const contactForm = $("#contact-form");
  if (contactForm) contactForm.addEventListener("submit", event => {
    event.preventDefault();
    if ($('input[name="_honey"]', contactForm)?.value) return;
    submitForm(contactForm);
  });

  // Marketplace inquiries use the same contact flow and retain the user's selection.
  document.querySelectorAll("[data-inquiry]").forEach(link => link.addEventListener("click", () => {
    const service = $("#form-service");
    if (service) service.value = "Website Development";
    const message = $("#form-message");
    if (message) message.value = `${link.dataset.inquiry}: `;
  }));

  // Public CMS content loads only after an API URL is configured.
  function safeText(value) { return String(value ?? ""); }
  function createCard(item, kind) {
    const article = document.createElement("article"); article.className = "interactive-box cms-card";
    const title = document.createElement("h3"); title.textContent = safeText(item.title || item.name || "Untitled");
    const summary = document.createElement("p"); summary.textContent = safeText(item.summary || item.description || item.content || "");
    article.append(title, summary);
    if (item.price) { const price = document.createElement("p"); price.className = "cms-price"; price.textContent = safeText(item.price); article.append(price); }
    if (item.image_url) { const img = document.createElement("img"); img.src = item.image_url; img.alt = safeText(item.title || item.name || ""); img.loading = "lazy"; img.className = "cms-image"; article.prepend(img); }
    const href = kind === "posts" && item.slug ? `blog.html?slug=${encodeURIComponent(item.slug)}` : (item.url || item.demo_url);
    if (href && (kind === "posts" || /^https?:\/\//i.test(href))) {
      const link = document.createElement("a"); link.href = href; link.className = "btn-link"; link.textContent = kind === "products" ? "View Details" : "Read / Explore";
      if (/^https?:\/\//i.test(href)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
      article.append(link);
    }
    if (kind === "products") {
      const order = document.createElement("a"); order.href = `#marketplace`; order.className = "btn-link"; order.textContent = "Request / Order";
      order.addEventListener("click", () => {
        const product = $('input[name="product_title"]', orderForm);
        const details = $('textarea[name="message"]', orderForm);
        if (product) product.value = safeText(item.title);
        if (details) details.value = `I would like to order or customize: ${safeText(item.title)}\\n`;
      });
      article.append(order);
    }
    return article;
  }
  async function loadPublicContent(resource, targetId, emptyMessage) {
    const target = document.getElementById(targetId);
    if (!target || !apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/public/${resource}`);
      if (!response.ok) return;
      const result = await response.json();
      const items = Array.isArray(result.items) ? result.items : [];
      if (!items.length) return;
      target.replaceChildren(...items.map(item => createCard(item, resource)));
      const note = $(`#${targetId === "marketplace-list" ? "marketplace-note" : "blog-note"}`);
      if (note) note.textContent = "";
    } catch (error) { console.warn(`Could not load ${resource}`, error); }
  }

  const orderForm = $("#order-form");
  if (orderForm) orderForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("#order-submit"), status = $("#order-status");
    if (button) button.disabled = true;
    if (status) status.textContent = "Sending request…";
    const payload = Object.fromEntries(new FormData(orderForm).entries());
    try {
      if (payload._honey) return;
      if (apiBase) {
        const response = await fetch(`${apiBase}/api/orders`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
        const result = await response.json().catch(()=>({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "Order request failed.");
        if (status) status.textContent = result.notification === "sent" ? "Request saved and Telegram notification sent." : "Request received; notification may be delayed.";
      } else {
        payload._subject = "Website order request";
        const fallbackData = new FormData(orderForm);
        fallbackData.set("_subject", "Website order request");
        const response = await fetch("https://formsubmit.co/ajax/info.sabbirhosenakash@gmail.com", {method:"POST",body:fallbackData,headers:{Accept:"application/json"}});
        const result = await response.json().catch(()=>({}));
        if (!response.ok || result.success === false) throw new Error("Email service did not confirm delivery.");
        if (status) status.textContent = "Your request was accepted by the email form service. Database and Telegram storage are not configured yet.";
      }
      orderForm.reset();
    } catch(error) { if(status) status.textContent=error.message; }
    finally { if(button) button.disabled=false; }
  });

  document.addEventListener("DOMContentLoaded", () => {
    typeEffect();
    const year = $("#current-year"); if (year) year.textContent = String(new Date().getFullYear());
    loadPublicContent("products", "marketplace-list", "No products published.");
    loadPublicContent("posts", "blog-list", "No articles published.");
    loadPublicContent("services", "services-list", "No services published.");
    loadPublicContent("projects", "projects-cms-list", "No projects published.");
    loadPublicContent("testimonials", "testimonials-list", "No testimonials published.");
    const installBanner = $("#install-banner"), installButton = $("#btn-install"), closeButton = $("#btn-close");
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault(); deferredPrompt = event;
      if (installBanner) window.setTimeout(() => { installBanner.style.display = "flex"; }, 3500);
    });
    installButton?.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt(); await deferredPrompt.userChoice;
      if (installBanner) installBanner.style.display = "none";
      deferredPrompt = null;
    });
    closeButton?.addEventListener("click", () => { if (installBanner) installBanner.style.display = "none"; });
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service worker registration failed", error));
    }
  });
  window.addEventListener("online", () => console.info("Connection restored."));
  window.addEventListener("offline", () => console.info("You are offline."));
})();
