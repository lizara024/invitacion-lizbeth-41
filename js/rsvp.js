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
