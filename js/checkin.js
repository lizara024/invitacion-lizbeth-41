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
