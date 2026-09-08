(function () {
  "use strict";

  const config = window.INVITATION_CONFIG || {};
  const address = [config.event?.venue, ...(config.event?.addressLines || [])].join(", ");

  function setupSmoothScroll() {
    document.querySelectorAll("[data-scroll-to]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector(button.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setupEnvelope() {
    const opening = document.getElementById("opening");
    const button = document.querySelector("[data-open-envelope]");
    if (!opening || !button) return;

    document.body.classList.add("has-opening");

    function openInvitation() {
      if (opening.classList.contains("is-opening")) return;
      opening.classList.add("is-opening");
      button.disabled = true;

      const finish = () => {
        opening.hidden = true;
        document.body.classList.remove("has-opening");
        document.getElementById("inicio")?.focus?.({ preventScroll: true });
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
      } else {
        window.setTimeout(finish, 1050);
      }
    }

    button.addEventListener("click", openInvitation);
  }

  function setupReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    items.forEach((item) => observer.observe(item));
  }

  function setupModals() {
    let lastFocused = null;

    function openModal(modal) {
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      const closeButton = modal.querySelector("[data-close-modal]");
      if (closeButton) closeButton.focus();
    }

    function closeModal(modal) {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    document.querySelectorAll("[data-open-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = document.getElementById(button.dataset.openModal);
        if (modal) openModal(modal);
      });
    });

    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.closest("[data-close-modal]")) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".modal:not([hidden])").forEach(closeModal);
    });
  }

  function setupMapLinks() {
    const encodedAddress = encodeURIComponent(address);
    const google = document.querySelector('[data-map-link="google"]');
    const waze = document.querySelector('[data-map-link="waze"]');
    if (google) google.href = `${config.links?.googleMapsBase || ""}${encodedAddress}`;
    if (waze) waze.href = `${config.links?.wazeBase || ""}${encodedAddress}&navigate=yes`;
  }

  function setupConfiguredImages() {
    document.querySelectorAll("[data-config-image]").forEach((image) => {
      const key = image.dataset.configImage;
      const path = config.images?.[key];
      if (path) image.src = path;
    });
  }

  function setupWhatsapp() {
    const button = document.querySelector("[data-whatsapp]");
    const note = document.querySelector("[data-whatsapp-note]");
    if (!button) return;

    button.addEventListener("click", () => {
      const number = config.contact?.WHATSAPP_NUMBER;
      if (!number) {
        if (note) note.hidden = false;
        return;
      }

      const message = encodeURIComponent(config.contact?.whatsappMessage || "");
      window.open(`https://wa.me/${number}?text=${message}`, "_blank", "noopener");
    });
  }

  setupEnvelope();
  setupSmoothScroll();
  setupReveal();
  setupModals();
  setupConfiguredImages();
  setupMapLinks();
  setupWhatsapp();
})();
