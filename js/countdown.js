(function () {
  "use strict";

  const selectors = {
    days: document.querySelector('[data-countdown="days"]'),
    hours: document.querySelector('[data-countdown="hours"]'),
    minutes: document.querySelector('[data-countdown="minutes"]'),
    seconds: document.querySelector('[data-countdown="seconds"]')
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateCountdown() {
    const config = window.INVITATION_CONFIG;
    if (!config || !config.event || !config.event.dateISO) return;

    const target = new Date(config.event.dateISO).getTime();
    const now = Date.now();
    const remaining = Math.max(0, target - now);

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    selectors.days.textContent = String(days).padStart(3, "0");
    selectors.hours.textContent = pad(hours);
    selectors.minutes.textContent = pad(minutes);
    selectors.seconds.textContent = pad(seconds);
  }

  window.Countdown = { update: updateCountdown };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
})();
