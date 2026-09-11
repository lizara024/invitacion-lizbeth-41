Estoy en el repo de la invitación digital de Lizbeth (invitacion-lizbeth-41).

Ya creé mi proyecto de Supabase, la tabla `rsvps` con sus políticas de
seguridad, y mi usuario de staff. Todo lo de abajo ya lo probé de mi lado
con un backend simulado y funciona correctamente. Vamos a conectar el
backend real.

No toques ningún otro archivo ni ninguna otra parte del código más allá de
lo que se indica aquí.

============================================================
CAMBIO 1 — data/config.js: agregar credenciales de Supabase
============================================================

Busca:
window.INVITATION_CONFIG = {
  honoree: {
    name: "Lizbeth",
    displayName: "LIZBETH",
    age: 41
  },

Reemplaza por:
window.INVITATION_CONFIG = {
  honoree: {
    name: "Lizbeth",
    displayName: "LIZBETH",
    age: 41
  },
  backend: {
    supabaseUrl: "PEGA_AQUI_TU_PROJECT_URL",
    supabaseAnonKey: "PEGA_AQUI_TU_ANON_KEY"
  },

Después de aplicar esto, YO voy a reemplazar manualmente esos dos valores
placeholder con mi Project URL y mi anon key reales de Supabase (Project
Settings → API). No inventes valores.

============================================================
CAMBIO 2 — index.html: honeypot anti-spam, botón de declinar, scripts
============================================================

Busca:
          <div class="rsvp__progress"><span data-rsvp-progress></span></div>
          <div class="rsvp__step" data-step="1">

Reemplaza por:
          <div class="rsvp__progress"><span data-rsvp-progress></span></div>
          <div class="hp-field" aria-hidden="true">
            <label for="companyWebsite">No llenar este campo</label>
            <input id="companyWebsite" name="companyWebsite" type="text" tabindex="-1" autocomplete="off">
          </div>
          <div class="rsvp__step" data-step="1">

Busca:
            <p class="decline-message" data-decline-message hidden>Gracias por avisarme.<br>Será una pena no verte, pero espero que podamos celebrar juntos en otra ocasión.</p>
          </div>

Reemplaza por:
            <p class="decline-message" data-decline-message hidden>Gracias por avisarme.<br>Será una pena no verte, pero espero que podamos celebrar juntos en otra ocasión.</p>
            <button type="button" class="button button--primary" data-decline-submit hidden>ENVIAR AVISO</button>
            <p class="decline-sent" data-decline-sent hidden>Tu respuesta quedó registrada. ¡Gracias por avisarme!</p>
          </div>

Busca:
    <script src="data/config.js"></script>
    <script src="js/countdown.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="js/rsvp.js"></script>
    <script src="js/app.js"></script>

Reemplaza por:
    <script src="data/config.js"></script>
    <script src="js/countdown.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="js/rsvp.js"></script>
    <script src="js/app.js"></script>

(Si tu index.html todavía no tiene la línea del CDN de qrcodejs de una
ronda anterior, agrégala igual, en ese mismo orden, antes de rsvp.js.)

============================================================
CAMBIO 3 — css/styles.css: estilos del honeypot y de declinar
============================================================

Busca:
.decline-message { padding: 1rem; color: var(--wine); border-left: 3px solid var(--gold); background: rgba(185, 138, 58, .11); }

Reemplaza por:
.decline-message { padding: 1rem; color: var(--wine); border-left: 3px solid var(--gold); background: rgba(185, 138, 58, .11); }
.decline-sent { padding: 1rem; color: var(--wine); border-left: 3px solid var(--teal); background: rgba(35, 127, 120, .11); }
.hp-field { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

============================================================
CAMBIO 4 — js/rsvp.js: REEMPLAZA TODO EL ARCHIVO por este contenido
============================================================

(function () {
  "use strict";

  const form = document.getElementById("rsvpForm");
  if (!form) return;

  const config = window.INVITATION_CONFIG || {};
  let supabaseClient = null;

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const url = config.backend?.supabaseUrl;
    const key = config.backend?.supabaseAnonKey;
    if (!url || !key || url.startsWith("PEGA_AQUI") || key.startsWith("PEGA_AQUI")) return null;
    if (typeof window.supabase === "undefined") return null;
    supabaseClient = window.supabase.createClient(url, key);
    return supabaseClient;
  }

  function isLikelyBot() {
    return Boolean(form.companyWebsite && form.companyWebsite.value);
  }

  const state = {
    step: 1,
    maxStep: 7,
    confirmName: "",
    phone: "",
    attends: null,
    partyCount: 1,
    guests: [""],
    folio: ""
  };

  const progress = form.querySelector("[data-rsvp-progress]");
  const error = form.querySelector("[data-form-error]");
  const nextButton = form.querySelector("[data-rsvp-next]");
  const backButton = form.querySelector("[data-rsvp-back]");
  const partyCount = form.querySelector("[data-party-count]");
  const guestFields = form.querySelector("[data-guest-fields]");
  const review = form.querySelector("[data-review]");

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function visibleStep() {
    return form.querySelector(`.rsvp__step[data-step="${state.step}"]`);
  }

  function collectCurrentStep() {
    if (state.step === 1) {
      state.confirmName = form.confirmName.value.trim();
    }
    if (state.step === 2) {
      state.phone = form.phone.value.trim();
    }
    if (state.step === 5) {
      state.guests = Array.from(form.querySelectorAll("[data-guest-input]")).map((input) => input.value.trim());
    }
  }

  function phoneLooksValid(value) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }

  function validateStep() {
    collectCurrentStep();
    form.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));

    if (state.step === 1 && !state.confirmName) {
      form.confirmName.setAttribute("aria-invalid", "true");
      showError("Escribe el nombre de la persona que confirma.");
      return false;
    }

    if (state.step === 2 && !phoneLooksValid(state.phone)) {
      form.phone.setAttribute("aria-invalid", "true");
      showError("Escribe un WhatsApp válido de al menos 10 dígitos.");
      return false;
    }

    if (state.step === 3 && state.attends === null) {
      showError("Selecciona si podrás acompañarnos.");
      return false;
    }

    if (state.step === 5 && state.guests.some((name) => !name)) {
      showError("Escribe el nombre de cada asistente.");
      return false;
    }

    showError("");
    return true;
  }

  function setGuestCount(count) {
    state.partyCount = Math.min(20, Math.max(1, count));
    while (state.guests.length < state.partyCount) state.guests.push("");
    state.guests = state.guests.slice(0, state.partyCount);
    partyCount.textContent = String(state.partyCount);
    renderGuestFields();
  }

  function renderGuestFields() {
    guestFields.innerHTML = "";
    state.guests.forEach((name, index) => {
      const wrapper = document.createElement("div");
      const id = `guest-${index + 1}`;
      wrapper.innerHTML = `
        <label for="${id}">Persona ${index + 1}</label>
        <input id="${id}" data-guest-input value="${escapeHtml(name)}" autocomplete="name" required>
      `;
      guestFields.appendChild(wrapper);
    });
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function renderReview() {
    const guestList = state.guests.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
    review.innerHTML = `
      <p><strong>${escapeHtml(state.confirmName)}</strong></p>
      <p>Asistiremos:<br><strong>${state.partyCount} ${state.partyCount === 1 ? "persona" : "personas"}</strong></p>
      <ul>${guestList}</ul>
    `;
  }

  function showFolioAndQr(folio) {
    state.folio = folio;
    form.querySelector("[data-folio]").textContent = folio;
    form.querySelector("[data-final-count]").textContent = String(state.partyCount);
    renderFolioQr(folio);
  }

  function renderFolioQr(folio) {
    const container = form.querySelector("[data-qr-code]");
    if (!container) return;
    container.innerHTML = "";
    try {
      // eslint-disable-next-line no-undef
      new QRCode(container, {
        text: folio,
        width: 168,
        height: 168,
        colorDark: "#3b102b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      const fallback = document.createElement("p");
      fallback.className = "qr-code__fallback";
      fallback.textContent = folio;
      container.appendChild(fallback);
    }
  }

  function buildRsvpPayload() {
    return {
      confirm_name: state.confirmName,
      phone: state.phone,
      attends: state.attends,
      party_count: state.partyCount,
      guests: state.guests
    };
  }

  async function submitRsvp() {
    if (isLikelyBot()) {
      showFolioAndQr(`L41-${Math.floor(Math.random() * 900 + 100)}`);
      state.step = 7;
      renderStep();
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      showError("La confirmación aún no está conectada. Avísale a Lizbeth para revisar la configuración.");
      return;
    }

    nextButton.disabled = true;
    nextButton.textContent = "ENVIANDO...";
    showError("");

    const { data, error } = await client
      .from("rsvps")
      .insert(buildRsvpPayload())
      .select()
      .single();

    nextButton.disabled = false;
    nextButton.textContent = "CONFIRMAR ASISTENCIA";

    if (error || !data) {
      showError("No pudimos guardar tu confirmación. Revisa tu conexión e intenta de nuevo.");
      return;
    }

    showFolioAndQr(data.folio);
    state.step = 7;
    renderStep();
  }

  function renderStep() {
    form.querySelectorAll(".rsvp__step").forEach((step) => {
      step.hidden = Number(step.dataset.step) !== state.step;
    });

    const percentage = state.step >= 7 ? 100 : Math.round((state.step - 1) / 5 * 100);
    progress.style.width = `${Math.max(12.5, percentage)}%`;
    backButton.hidden = state.step === 1 || state.step === 7;
    nextButton.hidden = state.step === 3 && state.attends === false;
    nextButton.textContent = state.step === 6 ? "CONFIRMAR ASISTENCIA" : "SIGUIENTE";

    if (state.step === 5) renderGuestFields();
    if (state.step === 6) renderReview();
    if (state.step === 7) {
      nextButton.hidden = true;
      backButton.hidden = true;
    }

    const current = visibleStep();
    const focusable = current?.querySelector("input, textarea, button");
    if (focusable) window.setTimeout(() => focusable.focus(), 60);
  }

  async function nextStep() {
    if (!validateStep()) return;

    if (state.step === 6) {
      await submitRsvp();
    } else {
      state.step += 1;
      renderStep();
    }
  }

  function previousStep() {
    showError("");
    state.step = Math.max(1, state.step - 1);
    renderStep();
  }

  form.querySelectorAll("[data-attendance]").forEach((button) => {
    button.addEventListener("click", () => {
      state.attends = button.dataset.attendance === "yes";
      form.querySelectorAll("[data-attendance]").forEach((choice) => choice.classList.remove("is-selected"));
      button.classList.add("is-selected");
      form.querySelector("[data-decline-message]").hidden = state.attends;
      form.querySelector("[data-decline-submit]").hidden = state.attends;
      form.querySelector("[data-decline-sent]").hidden = true;
      nextButton.hidden = !state.attends;
      showError("");
    });
  });

  form.querySelector("[data-decline-submit]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (isLikelyBot()) {
      form.querySelector("[data-decline-message]").hidden = true;
      button.hidden = true;
      form.querySelector("[data-decline-sent]").hidden = false;
      return;
    }

    const client = getSupabaseClient();
    button.disabled = true;
    button.textContent = "ENVIANDO...";

    if (client) {
      await client.from("rsvps").insert({
        confirm_name: state.confirmName,
        phone: state.phone,
        attends: false,
        party_count: 0,
        guests: []
      });
    }

    button.disabled = false;
    button.textContent = "ENVIAR AVISO";
    form.querySelector("[data-decline-message]").hidden = true;
    button.hidden = true;
    form.querySelector("[data-decline-sent]").hidden = false;
  });

  form.querySelector("[data-party-minus]").addEventListener("click", () => setGuestCount(state.partyCount - 1));
  form.querySelector("[data-party-plus]").addEventListener("click", () => setGuestCount(state.partyCount + 1));

  nextButton.addEventListener("click", nextStep);
  backButton.addEventListener("click", previousStep);

  form.addEventListener("input", (event) => {
    if (event.target.matches("[data-guest-input]")) {
      collectCurrentStep();
    }
    if (event.target.matches("input, textarea")) {
      showError("");
      event.target.removeAttribute("aria-invalid");
    }
  });

  renderGuestFields();
  renderStep();
})();

============================================================
CAMBIO 5 — Crear checkin.html (archivo nuevo)
============================================================

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Check-in · Lizbeth 41</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/checkin.css">
  </head>
  <body class="checkin-body">
    <main class="checkin">
      <h1>Check-in · Lizbeth 41</h1>
      <p class="checkin-sub">Solo para staff. No compartas este link.</p>

      <section id="loginView" class="checkin-card">
        <h2>Acceso de staff</h2>
        <label for="staffEmail">Correo</label>
        <input id="staffEmail" type="email" autocomplete="username">
        <label for="staffPassword">Contraseña</label>
        <input id="staffPassword" type="password" autocomplete="current-password">
        <button id="loginButton" type="button" class="button button--primary">ENTRAR</button>
        <p id="loginError" class="form-error" hidden></p>
      </section>

      <section id="scanView" class="checkin-card" hidden>
        <div id="qrReader"></div>
        <p class="field-hint">Apunta la cámara al QR del invitado, o búscalo a mano.</p>
        <div id="manualEntry">
          <label for="manualFolio">Folio</label>
          <input id="manualFolio" placeholder="L41-003">
          <button id="manualLookup" type="button" class="button button--secondary">BUSCAR</button>
        </div>
        <div id="resultCard" hidden></div>
      </section>
    </main>

    <script src="data/config.js"></script>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <script src="js/checkin.js"></script>
  </body>
</html>

============================================================
CAMBIO 6 — Crear css/checkin.css (archivo nuevo)
============================================================

.checkin-body { margin: 0; min-height: 100vh; background: var(--wine-deep); background-image: linear-gradient(135deg, rgba(182, 45, 104, .15), transparent 40%); font-family: var(--sans); color: var(--paper); }
.checkin { width: min(480px, calc(100% - 2rem)); margin: 0 auto; padding: 2.5rem 0 3rem; }
.checkin h1 { margin: 0; font-family: var(--serif); color: var(--paper); font-size: 2rem; text-align: center; }
.checkin-sub { margin: .35rem 0 0; color: rgba(255, 249, 238, .7); font-size: .8rem; text-align: center; letter-spacing: .05em; }
.checkin-card { margin-top: 1.75rem; padding: 1.5rem; color: var(--ink); background: var(--paper); border-radius: 6px; box-shadow: var(--shadow); }
.checkin-card h2 { margin: 0 0 .25rem; color: var(--wine); font-size: 1.3rem; }
.checkin-card label { display: block; margin: 1rem 0 .35rem; color: var(--wine); font-weight: 800; font-size: .85rem; }
.checkin-card input { width: 100%; min-height: 48px; padding: .8rem; border: 1px solid var(--line); border-radius: 3px; font: inherit; }
.checkin-card .button { width: 100%; margin-top: 1.1rem; }
#qrReader { margin-top: .25rem; overflow: hidden; border-radius: 6px; }
#manualEntry { padding-top: 1rem; margin-top: 1rem; border-top: 1px solid var(--line); }
#resultCard { padding: 1rem; margin-top: 1.25rem; border: 1px solid var(--line); border-radius: 4px; background: #fffdf8; }
.checkin-name { margin: 0 0 .2rem; color: var(--wine); font-family: var(--serif); font-size: 1.5rem; }
.checkin-status--ok { color: var(--teal); font-weight: 800; }
.checkin-status--pending { color: var(--terracotta); font-weight: 800; }
.checkin-error { color: var(--bougainvillea); font-weight: 800; }

============================================================
CAMBIO 7 — Crear js/checkin.js (archivo nuevo)
============================================================

(function () {
  "use strict";

  const config = window.INVITATION_CONFIG || {};
  const url = config.backend?.supabaseUrl;
  const key = config.backend?.supabaseAnonKey;

  const loginView = document.getElementById("loginView");
  const scanView = document.getElementById("scanView");
  const loginButton = document.getElementById("loginButton");
  const loginError = document.getElementById("loginError");
  const resultCard = document.getElementById("resultCard");
  const manualFolio = document.getElementById("manualFolio");
  const manualLookup = document.getElementById("manualLookup");

  if (!url || !key || url.startsWith("PEGA_AQUI") || key.startsWith("PEGA_AQUI") || typeof window.supabase === "undefined") {
    loginError.textContent = "El check-in aún no está conectado. Configura data/config.js primero.";
    loginError.hidden = false;
    loginButton.disabled = true;
    return;
  }

  const client = window.supabase.createClient(url, key);
  let scanner = null;

  async function login() {
    loginError.hidden = true;
    const email = document.getElementById("staffEmail").value.trim();
    const password = document.getElementById("staffPassword").value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
      loginError.hidden = false;
      return;
    }
    loginView.hidden = true;
    scanView.hidden = false;
    startScanner();
  }

  function startScanner() {
    if (typeof Html5Qrcode === "undefined") return;
    scanner = new Html5Qrcode("qrReader");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => lookupFolio(decodedText.trim().toUpperCase())
      )
      .catch(() => {
        // Sin cámara disponible: la búsqueda manual sigue funcionando.
      });
  }

  async function lookupFolio(folio) {
    const { data, error } = await client
      .from("rsvps")
      .select("*")
      .eq("folio", folio)
      .maybeSingle();

    if (error || !data) {
      renderResult(null, folio);
      return;
    }
    renderResult(data, folio);
  }

  function renderResult(record, folio) {
    if (!record) {
      resultCard.innerHTML = `<p class="checkin-error">Folio "${escapeHtml(folio)}" no encontrado.</p>`;
      resultCard.hidden = false;
      return;
    }

    const already = record.checked_in;
    const guestList = (record.guests || []).map((name) => `<li>${escapeHtml(name)}</li>`).join("");

    resultCard.innerHTML = `
      <p class="checkin-name">${escapeHtml(record.confirm_name)}</p>
      <p>${record.party_count} ${record.party_count === 1 ? "persona" : "personas"}</p>
      <ul>${guestList}</ul>
      <p class="${already ? "checkin-status--ok" : "checkin-status--pending"}">
        ${already ? "Ya había hecho check-in" : "Aún no había hecho check-in"}
      </p>
      <button type="button" id="confirmCheckin" class="button button--primary" ${already ? "disabled" : ""}>
        ${already ? "YA REGISTRADO" : "CONFIRMAR LLEGADA"}
      </button>
    `;
    resultCard.hidden = false;

    const confirmButton = document.getElementById("confirmCheckin");
    if (confirmButton && !already) {
      confirmButton.addEventListener("click", async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = "GUARDANDO...";
        await client
          .from("rsvps")
          .update({ checked_in: true, checked_in_at: new Date().toISOString() })
          .eq("folio", record.folio);
        renderResult({ ...record, checked_in: true }, folio);
      });
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  manualLookup.addEventListener("click", () => {
    const folio = manualFolio.value.trim().toUpperCase();
    if (folio) lookupFolio(folio);
  });

  loginButton.addEventListener("click", login);
})();

============================================================

Al terminar (con conexión real a internet, y ya con mis credenciales reales
pegadas en data/config.js):

1. Completa el RSVP en index.html hasta el final. Ve a tu proyecto de
   Supabase → Table Editor → rsvps, y confirma que apareció una fila nueva
   con tus datos y un folio como "L41-001".
2. Prueba también "No podré acompañarte" → "ENVIAR AVISO", y confirma que
   se creó una fila con attends = false.
3. Abre checkin.html en tu celular o computadora, inicia sesión con tu
   correo/contraseña de staff (el usuario que creaste en Supabase →
   Authentication → Users), y busca a mano el folio que generaste en el
   paso 1. Debe mostrar el nombre y "Aún no había hecho check-in". Dale
   "CONFIRMAR LLEGADA" y verifica en Supabase que checked_in ahora es true.
4. Si tienes cámara disponible, prueba que el lector de QR realmente
   escanee el QR mostrado en la pantalla de "¡GRACIAS!" del RSVP.
