'use strict';

/* =========================================================================
   Kaffeekasse – Vanilla-JS-App
   Kein Backend, keine Accounts. Alle Daten liegen lokal auf dem Gerät
   (IndexedDB, Fallback localStorage). Diese Datei ist in Abschnitte
   gegliedert: Konfiguration, Datenspeicherung, Zustand, Rendering,
   Ereignisse, Export/Import, Bootstrapping.
   ========================================================================= */

/* -------------------------------------------------------------------------
   Konfiguration
   ------------------------------------------------------------------------- */

// Zentrale Stelle für den PayPal-Pool-Link. Kann hier angepasst oder
// jederzeit über den Admin-Bereich überschrieben werden (Speicherung in den
// Einstellungen hat danach Vorrang vor diesem Standardwert).
const DEFAULT_POOL_URL = 'https://www.paypal.com/pools/c/DEIN_POOL_LINK';


// Eingebettete SVG-Icons statt Emojis: Emojis hängen von der Systemschrift
// des Geräts ab und fehlen auf älteren Android-Versionen teilweise – SVG
// rendert überall identisch. Farben kommen aus den CSS-Variablen.
const ICON_COFFEE = '<svg viewBox="0 0 48 48" aria-hidden="true">'
  + '<path d="M14 5c0 3-2.5 4-2.5 7M22 5c0 3-2.5 4-2.5 7M30 5c0 3-2.5 4-2.5 7" fill="none" stroke="var(--text-muted)" stroke-width="2.6" stroke-linecap="round"/>'
  + '<rect x="7" y="16" width="26" height="22" rx="4" fill="var(--accent)"/>'
  + '<path d="M33 20h3a6.5 6.5 0 0 1 0 13h-3" fill="none" stroke="var(--accent)" stroke-width="3.4"/>'
  + '</svg>';

const ICON_TEA = '<svg viewBox="0 0 48 48" aria-hidden="true">'
  + '<path d="M17 6c0 3-2.5 4-2.5 7M27 6c0 3-2.5 4-2.5 7" fill="none" stroke="var(--text-muted)" stroke-width="2.6" stroke-linecap="round"/>'
  + '<path d="M8 19h28v5a14 14 0 0 1-28 0v-5z" fill="var(--ok-text)"/>'
  + '<path d="M14 42h20" stroke="var(--text-muted)" stroke-width="2.6" stroke-linecap="round"/>'
  + '</svg>';

const ICON_TURTLE = '<svg viewBox="0 0 34 20" aria-hidden="true">'
  + '<path d="M4.5 8L1 9.5 4.5 11z" fill="#5c9a4e"/>'
  + '<rect x="7" y="14.5" width="3.4" height="4.5" rx="1.5" fill="#5c9a4e"/>'
  + '<rect x="17" y="14.5" width="3.4" height="4.5" rx="1.5" fill="#5c9a4e"/>'
  + '<circle cx="27" cy="8.5" r="3.6" fill="#5c9a4e"/>'
  + '<circle cx="28.3" cy="7.5" r="0.8" fill="#1e3a1c"/>'
  + '<ellipse cx="14" cy="9.5" rx="10" ry="7" fill="#3f7d3a"/>'
  + '<path d="M6.5 6.5c5-3 10-3 15 0M6.5 12.5c5 3 10 3 15 0" stroke="#2e5c2a" stroke-width="1.1" fill="none"/>'
  + '</svg>';

const ARTICLES = [
  { key: 'kaffee', label: 'Kaffee', icon: ICON_COFFEE },
  { key: 'tee', label: 'Tee', icon: ICON_TEA },
];

const INVENTORY_ITEMS = [
  { key: 'kaffee', label: 'Kaffee' },
  { key: 'tee', label: 'Tee' },
  { key: 'milch', label: 'Milch' },
  { key: 'hafermilch', label: 'Hafermilch' },
  { key: 'tabs', label: 'Spülmaschinentabs' },
  { key: 'salz', label: 'Spülmaschinensalz' },
  { key: 'klarspueler', label: 'Klarspüler' },
  { key: 'reinigungstabs', label: 'Reinigungstabletten Kaffeemaschine' },
  { key: 'entkalker', label: 'Entkalker Kaffeemaschine' },
];

const INVENTORY_STATES = ['ok', 'wenig', 'bestellen', 'bestellung'];
const INVENTORY_STATE_LABELS = {
  ok: 'OK', wenig: 'Wenig', bestellen: 'Bestellen', bestellung: 'In Bestellung',
};

function defaultSettings() {
  return {
    prices: { kaffee: 0.5, tee: 0.5 },
    poolUrl: DEFAULT_POOL_URL,
    pin: '',
    inventory: {
      kaffee: 'ok', tee: 'ok', milch: 'ok', hafermilch: 'ok', tabs: 'ok',
      salz: 'ok', klarspueler: 'ok', reinigungstabs: 'ok', entkalker: 'ok',
    },
    standby: { enabled: true, start: '19:00', end: '06:30', weekend: true },
    lastUnitPrice: {},
  };
}

const currencyFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
function formatMoney(n) { return currencyFmt.format(n || 0); }

function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function todayKey() { return dateKey(Date.now()); }
function thisMonthKey() { return monthKey(Date.now()); }

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* -------------------------------------------------------------------------
   Datenspeicherung: IndexedDB mit localStorage-Fallback
   ------------------------------------------------------------------------- */

const DB_NAME = 'kaffeekasse-db';
const DB_VERSION = 1;
const STORE_BOOKINGS = 'bookings';
const STORE_KV = 'kv';

function openIndexedDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB nicht verfügbar'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_BOOKINGS)) {
        db.createObjectStore(STORE_BOOKINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };
    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error || new Error('IndexedDB-Fehler'));
    req.onblocked = () => reject(new Error('IndexedDB durch andere Verbindung blockiert'));
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB-Anfrage fehlgeschlagen'));
  });
}

const IdbBackend = {
  db: null,
  async init() {
    this.db = await openIndexedDb();
  },
  store(name, mode) {
    return this.db.transaction(name, mode).objectStore(name);
  },
  getAllBookings() {
    return idbRequest(this.store(STORE_BOOKINGS, 'readonly').getAll());
  },
  getBookingById(id) {
    return idbRequest(this.store(STORE_BOOKINGS, 'readonly').get(id));
  },
  addBooking(booking) {
    return idbRequest(this.store(STORE_BOOKINGS, 'readwrite').put(booking));
  },
  async updateBooking(id, patch) {
    const existing = await this.getBookingById(id);
    if (!existing) return;
    await this.addBooking(Object.assign({}, existing, patch));
  },
  clearBookings() {
    return idbRequest(this.store(STORE_BOOKINGS, 'readwrite').clear());
  },
  async replaceAllBookings(arr) {
    await this.clearBookings();
    const store = this.store(STORE_BOOKINGS, 'readwrite');
    await Promise.all(arr.map((b) => idbRequest(store.put(b))));
  },
  async getKv(key) {
    const rec = await idbRequest(this.store(STORE_KV, 'readonly').get(key));
    return rec ? rec.value : undefined;
  },
  setKv(key, value) {
    return idbRequest(this.store(STORE_KV, 'readwrite').put({ key, value }));
  },
  async wipeAll() {
    await this.clearBookings();
    await this.setKv('settings', defaultSettings());
    await this.setKv('closures', []);
  },
};

const LsBackend = {
  KEY_BOOKINGS: 'kaffeekasse:bookings',
  KEY_SETTINGS: 'kaffeekasse:settings',
  KEY_CLOSURES: 'kaffeekasse:closures',
  init() { return Promise.resolve(); },
  _readArr(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  },
  _writeArr(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); },
  getAllBookings() { return Promise.resolve(this._readArr(this.KEY_BOOKINGS)); },
  addBooking(b) {
    const arr = this._readArr(this.KEY_BOOKINGS);
    arr.push(b);
    this._writeArr(this.KEY_BOOKINGS, arr);
    return Promise.resolve();
  },
  updateBooking(id, patch) {
    const arr = this._readArr(this.KEY_BOOKINGS);
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], patch);
    this._writeArr(this.KEY_BOOKINGS, arr);
    return Promise.resolve();
  },
  clearBookings() { this._writeArr(this.KEY_BOOKINGS, []); return Promise.resolve(); },
  replaceAllBookings(arr) { this._writeArr(this.KEY_BOOKINGS, arr); return Promise.resolve(); },
  getKv(key) {
    if (key === 'settings') {
      const v = localStorage.getItem(this.KEY_SETTINGS);
      return Promise.resolve(v ? JSON.parse(v) : undefined);
    }
    if (key === 'closures') return Promise.resolve(this._readArr(this.KEY_CLOSURES));
    return Promise.resolve(undefined);
  },
  setKv(key, value) {
    if (key === 'settings') localStorage.setItem(this.KEY_SETTINGS, JSON.stringify(value));
    else if (key === 'closures') this._writeArr(this.KEY_CLOSURES, value);
    return Promise.resolve();
  },
  wipeAll() {
    localStorage.removeItem(this.KEY_BOOKINGS);
    localStorage.removeItem(this.KEY_SETTINGS);
    localStorage.removeItem(this.KEY_CLOSURES);
    return Promise.resolve();
  },
};

const Store = {
  backend: null,
  async init() {
    try {
      await IdbBackend.init();
      this.backend = IdbBackend;
    } catch (err) {
      console.warn('IndexedDB nicht verfügbar, Fallback auf localStorage.', err);
      await LsBackend.init();
      this.backend = LsBackend;
    }
    let settings = await this.backend.getKv('settings');
    if (!settings) {
      settings = defaultSettings();
      await this.backend.setKv('settings', settings);
    } else {
      // Fehlende Felder aus zukünftigen Versionen defensiv ergänzen.
      settings = Object.assign(defaultSettings(), settings);
      settings.prices = Object.assign(defaultSettings().prices, settings.prices);
      settings.inventory = Object.assign(defaultSettings().inventory, settings.inventory);
      settings.standby = Object.assign(defaultSettings().standby, settings.standby);
      settings.lastUnitPrice = Object.assign({}, settings.lastUnitPrice);
    }
    let closures = await this.backend.getKv('closures');
    if (!closures) {
      closures = [];
      await this.backend.setKv('closures', closures);
    }
    return { settings, closures };
  },
  isFallback() { return this.backend === LsBackend; },
  getAllBookings() { return this.backend.getAllBookings(); },
  addBooking(b) { return this.backend.addBooking(b); },
  updateBooking(id, patch) { return this.backend.updateBooking(id, patch); },
  replaceAllBookings(arr) { return this.backend.replaceAllBookings(arr); },
  getSettings() { return this.backend.getKv('settings'); },
  saveSettings(s) { return this.backend.setKv('settings', s); },
  getClosures() { return this.backend.getKv('closures'); },
  saveClosures(c) { return this.backend.setKv('closures', c); },
  wipeAll() { return this.backend.wipeAll(); },
};

/* -------------------------------------------------------------------------
   Anwendungszustand
   ------------------------------------------------------------------------- */

const state = {
  bookings: [],
  settings: defaultSettings(),
  closures: [],
  pendingBooking: null, // { article, qty }
  pinUnlockAction: null, // Funktion, die nach erfolgreicher PIN-Eingabe läuft
  standbyAwakeUntil: 0, // bis wann der Ruhemodus nach Antippen pausiert
  standbyActive: false,
  purchaseSelection: {}, // im Einkaufs-Block angetippte Lager-Artikel
};

/* -------------------------------------------------------------------------
   DOM-Referenzen
   ------------------------------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);

const el = {
  clock: $('#clock'),
  kasseStand: $('#kasse-stand'),
  productGrid: $('#product-grid'),
  inventoryList: $('#inventory-list'),
  raceTrack: $('#race-track'),
  raceMonth: $('#race-month'),
  nameSuggest: $('#name-suggest'),
  storageBadge: $('#storage-mode-badge'),
  toast: $('#toast'),

  overlayBooking: $('#overlay-booking'),
  bookingEmoji: $('#booking-emoji'),
  bookingLabel: $('#booking-label'),
  qtyValue: $('#qty-value'),
  unitPrice: $('#unit-price'),
  totalPrice: $('#total-price'),
  bookingNote: $('#booking-note'),
  btnQtyMinus: $('#btn-qty-minus'),
  btnQtyPlus: $('#btn-qty-plus'),
  btnCancelBooking: $('#btn-cancel-booking'),
  btnMarkBar: $('#btn-mark-bar'),
  btnMarkPaypal: $('#btn-mark-paypal'),
  btnMarkAbrechnung: $('#btn-mark-abrechnung'),
  btnMarkGuthaben: $('#btn-mark-guthaben'),
  bookingStepChoose: $('#booking-step-choose'),
  bookingStepPaypal: $('#booking-step-paypal'),
  qrBoxSheet: $('#qr-box-sheet'),
  paypalTotal: $('#paypal-total'),
  btnPaypalBack: $('#btn-paypal-back'),
  btnPaypalConfirm: $('#btn-paypal-confirm'),

  btnOpenAdmin: $('#btn-open-admin'),
  standbyOverlay: $('#standby-overlay'),
  standbyClock: $('#standby-clock'),
  standbyEnabled: $('#standby-enabled'),
  standbyStart: $('#standby-start'),
  standbyEnd: $('#standby-end'),
  standbyWeekend: $('#standby-weekend'),
  btnSaveStandby: $('#btn-save-standby'),
  overlayPin: $('#overlay-pin'),
  pinInput: $('#pin-input'),
  pinError: $('#pin-error'),
  btnPinCancel: $('#btn-pin-cancel'),
  btnPinConfirm: $('#btn-pin-confirm'),

  overlayAdmin: $('#overlay-admin'),
  btnCloseAdmin: $('#btn-close-admin'),
  adminStats: $('#admin-stats'),
  adminPrices: $('#admin-prices'),
  btnSavePrices: $('#btn-save-prices'),
  adminPoolUrl: $('#admin-pool-url'),
  btnSavePool: $('#btn-save-pool'),
  adminInventory: $('#admin-inventory'),
  adminPin: $('#admin-pin'),
  btnSavePin: $('#btn-save-pin'),
  creditName: $('#credit-name'),
  creditAmount: $('#credit-amount'),
  creditNames: $('#credit-names'),
  btnCreditBar: $('#btn-credit-bar'),
  btnCreditPaypal: $('#btn-credit-paypal'),
  adminCreditList: $('#admin-credit-list'),
  creditNameSuggest: $('#credit-name-suggest'),
  purchaseNameSuggest: $('#purchase-name-suggest'),
  purchaseProducts: $('#purchase-products'),
  purchaseLines: $('#purchase-lines'),
  purchaseTotal: $('#purchase-total'),
  adminSpendList: $('#admin-spend-list'),
  purchaseName: $('#purchase-name'),
  purchaseAmount: $('#purchase-amount'),
  purchaseInfo: $('#purchase-info'),
  btnPurchaseRefunded: $('#btn-purchase-refunded'),
  btnPurchaseCredit: $('#btn-purchase-credit'),
  btnPurchaseOpen: $('#btn-purchase-open'),
  adminPurchaseList: $('#admin-purchase-list'),
  adminRecentList: $('#admin-recent-list'),
  adminAccountList: $('#admin-account-list'),
  cashcountCash: $('#cashcount-cash'),
  cashcountPaypal: $('#cashcount-paypal'),
  cashcountResult: $('#cashcount-result'),
  btnCashcountApply: $('#btn-cashcount-apply'),
  btnSettleOpen: $('#btn-settle-open'),
  btnDayClose: $('#btn-day-close'),
  btnMonthClose: $('#btn-month-close'),
  btnExportCsv: $('#btn-export-csv'),
  btnExportJson: $('#btn-export-json'),
  importFile: $('#import-file'),
  btnWipeAll: $('#btn-wipe-all'),
};

/* -------------------------------------------------------------------------
   Toast
   ------------------------------------------------------------------------- */

let toastTimer = null;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
}

/* -------------------------------------------------------------------------
   Uhrzeit
   ------------------------------------------------------------------------- */

function tickClock() {
  const now = new Date();
  el.clock.textContent = now.toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  checkStandby();
}

/* -------------------------------------------------------------------------
   Ruhemodus: außerhalb der Nutzungszeiten dunkles Overlay (und in der
   APK zusätzlich native Bildschirm-Dimmung), Antippen weckt für 10 min.
   ------------------------------------------------------------------------- */

function parseTimeToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? (Number(m[1]) * 60 + Number(m[2])) : null;
}

function inStandbyWindow(date, standby) {
  if (!standby || !standby.enabled) return false;
  const day = date.getDay();
  if (standby.weekend && (day === 0 || day === 6)) return true;
  const start = parseTimeToMinutes(standby.start);
  const end = parseTimeToMinutes(standby.end);
  if (start === null || end === null || start === end) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  // start > end bedeutet: Fenster läuft über Mitternacht (z. B. 19:00–06:30)
  return start < end ? (mins >= start && mins < end) : (mins >= start || mins < end);
}

function setNativeBrightness(value) {
  try {
    if (window.KaffeekasseNative && typeof window.KaffeekasseNative.setBrightness === 'function') {
      window.KaffeekasseNative.setBrightness(value);
    }
  } catch (err) { /* Bridge optional – PWA läuft ohne */ }
}

function checkStandby() {
  const now = new Date();
  const shouldSleep = inStandbyWindow(now, state.settings.standby)
    && now.getTime() > state.standbyAwakeUntil;
  if (shouldSleep) {
    el.standbyClock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }
  if (shouldSleep === state.standbyActive) return;
  state.standbyActive = shouldSleep;
  el.standbyOverlay.hidden = !shouldSleep;
  setNativeBrightness(shouldSleep ? 0.05 : -1);
}

function wakeFromStandby() {
  state.standbyAwakeUntil = Date.now() + 10 * 60 * 1000;
  checkStandby();
}

async function saveStandbySettings() {
  const start = el.standbyStart.value;
  const end = el.standbyEnd.value;
  if (parseTimeToMinutes(start) === null || parseTimeToMinutes(end) === null) {
    showToast('Bitte gültige Zeiten angeben (HH:MM).');
    return;
  }
  state.settings.standby = {
    enabled: el.standbyEnabled.checked,
    start,
    end,
    weekend: el.standbyWeekend.checked,
  };
  await Store.saveSettings(state.settings);
  state.standbyAwakeUntil = 0;
  checkStandby();
  showToast('Ruhemodus gespeichert.');
}

/* -------------------------------------------------------------------------
   Zeitraum-Statistik (für "Heute" und Monatsauswertung in Admin)
   Ein Abschluss (Tages-/Monatsabschluss) verschiebt die Grundlinie für den
   jeweiligen Zeitraum, ohne historische Buchungen zu löschen.
   ------------------------------------------------------------------------- */

function getPeriodBookings(periodType) {
  const key = periodType === 'day' ? todayKey() : thisMonthKey();
  const keyFn = periodType === 'day' ? dateKey : monthKey;
  const lastClosureTs = state.closures
    .filter((c) => c.type === periodType && c.periodKey === key)
    .reduce((max, c) => Math.max(max, c.ts), 0);

  return state.bookings.filter(
    (b) => keyFn(b.ts) === key && b.ts > lastClosureTs
  );
}

// Aggregiert Namen aus dem Notizfeld (Groß-/Kleinschreibung egal), absteigend
// nach Becherzahl sortiert. minCups steuert, ab wie vielen Bechern ein Name
// auftaucht: das Rennen startet ab dem ersten Becher, die Vorschlags-Chips
// erst ab dem zweiten, damit die Liste ruhig bleibt.
function aggregateNames(bookings, minCups) {
  const map = {};
  for (const b of bookings) {
    if (b.article === 'guthaben' || b.article === 'einkauf') continue; // keine Becher
    const raw = (b.note || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!map[key]) map[key] = { name: raw, cups: 0 };
    map[key].cups += b.qty;
  }
  return Object.keys(map)
    .map((k) => map[k])
    .filter((e) => e.cups >= minCups)
    .sort((a, b) => b.cups - a.cups);
}

// Guthaben je Name: Aufladungen (article 'guthaben') minus Verbrauch
// (Getränkebuchungen mit Status 'guthaben'). Namen case-insensitiv.
function getCreditMap() {
  const map = {};
  for (const b of state.bookings) {
    const raw = (b.note || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!map[key]) map[key] = { name: raw, credit: 0 };
    if (b.article === 'guthaben') map[key].credit += b.total;
    else if (b.article === 'einkauf') {
      if (b.status === 'guthaben') map[key].credit += b.total;
    } else if (b.status === 'guthaben') map[key].credit -= b.total;
  }
  return map;
}

function getCreditFor(name) {
  const entry = getCreditMap()[name.trim().toLowerCase()];
  return entry ? entry.credit : 0;
}

function getPeriodStats(periodType) {
  const key = periodType === 'day' ? todayKey() : thisMonthKey();
  const bookings = getPeriodBookings(periodType).filter((b) => b.article !== 'guthaben' && b.article !== 'einkauf');

  const stats = {
    key,
    count: bookings.length,
    countByArticle: {},
    sumTotal: 0,
    sumBar: 0,
    sumPaypal: 0,
    sumGuthaben: 0,
    sumAbrechnung: 0,
  };
  for (const a of ARTICLES) stats.countByArticle[a.key] = 0;

  for (const b of bookings) {
    stats.sumTotal += b.total;
    // Ältere Buchungen können noch die Status 'bezahlt'/'offen' tragen:
    // 'offen' zählt zur Abrechnung, alles Übrige außer 'paypal' als bar.
    if (b.status === 'paypal') stats.sumPaypal += b.total;
    else if (b.status === 'guthaben') stats.sumGuthaben += b.total;
    else if (b.status === 'abrechnung' || b.status === 'offen') stats.sumAbrechnung += b.total;
    else stats.sumBar += b.total;
    stats.countByArticle[b.article] = (stats.countByArticle[b.article] || 0) + b.qty;
  }
  return stats;
}

/* -------------------------------------------------------------------------
   Rendering
   ------------------------------------------------------------------------- */

function renderProductGrid() {
  el.productGrid.innerHTML = '';
  for (const article of ARTICLES) {
    const price = state.settings.prices[article.key] || 0;
    const btn = document.createElement('button');
    btn.className = 'product-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="product-emoji">${article.icon}</span>
      <span class="product-label">${article.label}</span>
      <span class="product-price">${formatMoney(price)}</span>`;
    btn.addEventListener('click', () => openBookingSheet(article.key));
    el.productGrid.appendChild(btn);
  }
}

// Erwartetes Geld getrennt nach Kanal – Basis für Kassensturz und für
// die Frage, wie viel bar erstattet werden kann.
function getCashBreakdown() {
  let cashSoll = 0;
  let paypalSoll = 0;
  for (const b of state.bookings) {
    if (b.article === 'einkauf') {
      if (b.status === 'erstattet') cashSoll -= b.total; // bar aus der Box
      continue;
    }
    if (b.status === 'paypal') paypalSoll += b.total;
    else if (b.status === 'bar' || b.status === 'bezahlt') cashSoll += b.total;
  }
  return { cashSoll, paypalSoll };
}

// Bilanz über die gesamte Historie: eingegangen ist alles tatsächlich
// erhaltene Geld (bar/PayPal bezahlte Getränke, beglichene Anschreiben und
// Guthaben-Aufladungen). Vom Guthaben getrunkene Becher zählen nicht erneut.
// Es gilt: Kasse = Gesamtwert Entnahmen − offene Anschreiben + Restguthaben.
function getBalance() {
  let paid = 0;
  let open = 0;
  let creditTop = 0;
  let creditUsed = 0;
  let drinksTotal = 0;
  let purchasesTotal = 0;
  let refundsOpen = 0;
  for (const b of state.bookings) {
    if (b.article === 'guthaben') {
      creditTop += b.total;
      paid += b.total;
      continue;
    }
    if (b.article === 'einkauf') {
      purchasesTotal += b.total;
      if (b.status === 'erstattet') paid -= b.total;
      else if (b.status === 'guthaben') creditTop += b.total;
      else refundsOpen += b.total;
      continue;
    }
    if (b.article === 'korrektur') { paid += b.total; continue; }
    drinksTotal += b.total;
    if (b.status === 'abrechnung' || b.status === 'offen') open += b.total;
    else if (b.status === 'guthaben') creditUsed += b.total;
    else paid += b.total;
  }
  return {
    paid, open, drinksTotal, purchasesTotal, refundsOpen,
    creditRest: creditTop - creditUsed,
  };
}

// Kopfband: zwei Werte.
//   Kasse = alles bar oder direkt per PayPal Eingezahlte (Getränke + Guthaben-
//           Aufladungen).
//   Offen = offene Anschreiben (Forderungen der Kasse, +) minus alle
//           Einkaufsausgaben (−). So gilt: Kasse + Offen = Gesamtbilanz.
function renderKasseStand() {
  let kasse = 0;
  let offen = 0;
  for (const b of state.bookings) {
    if (b.article === 'einkauf') { offen -= b.total; continue; }
    if (b.status === 'bar' || b.status === 'paypal' || b.status === 'bezahlt') kasse += b.total;
    else if (b.status === 'abrechnung' || b.status === 'offen') offen += b.total;
  }
  el.kasseStand.innerHTML = `Kasse: ${formatMoney(kasse)}`
    + ` <span class="kasse-open">· Offen: ${formatMoney(offen)}</span>`;
}

function nextInventoryState(current) {
  const idx = INVENTORY_STATES.indexOf(current);
  return INVENTORY_STATES[(idx + 1) % INVENTORY_STATES.length];
}

function renderInventory() {
  el.inventoryList.innerHTML = '';
  for (const item of INVENTORY_ITEMS) {
    const status = state.settings.inventory[item.key] || 'ok';
    const row = document.createElement('div');
    row.className = 'inventory-row';
    row.innerHTML = `
      <span class="inventory-name">${item.label}</span>
      <span class="status-chip status-${status}">${INVENTORY_STATE_LABELS[status]}</span>
    `;
    row.addEventListener('click', async () => {
      state.settings.inventory[item.key] = nextInventoryState(status);
      await Store.saveSettings(state.settings);
      renderInventory();
      renderAdminInventory();
    });
    el.inventoryList.appendChild(row);
  }
}

function renderQrInto(target) {
  const url = state.settings.poolUrl || DEFAULT_POOL_URL;
  target.innerHTML = '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    target.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  } catch (err) {
    console.error('QR-Code konnte nicht erzeugt werden', err);
    target.textContent = 'QR-Code nicht verfügbar';
  }
}

function renderRace() {
  const entries = aggregateNames(getPeriodBookings('month'), 1).slice(0, 5);
  el.raceMonth.textContent = new Date().toLocaleDateString('de-DE', { month: 'long' });
  if (!entries.length) {
    el.raceTrack.innerHTML = `<p class="race-empty"><span class="race-emoji">${ICON_TURTLE}</span> Noch keine Läufer – beim Buchen einen Namen angeben und mitrennen!</p>`;
    return;
  }
  const max = entries[0].cups;
  el.raceTrack.innerHTML = entries.map((e) => {
    // Führende Schildkröte steht kurz vor der Ziellinie, die übrigen
    // proportional zu ihrer Becherzahl dahinter.
    const right = 4 + (1 - e.cups / max) * 68;
    return `
      <div class="race-lane">
        <div class="race-turtle" style="right:${right.toFixed(1)}%">
          <span class="race-tag">${escapeHtml(e.name)} · ${e.cups}</span>
          <span class="race-emoji">${ICON_TURTLE}</span>
        </div>
      </div>`;
  }).join('');
}

// Jeder Name erscheint ab dem ersten Becher als Chip, sortiert nach
// Häufigkeit (Vieltrinker zuerst). Guthaben-Inhaber erscheinen auch ohne
// Becher, mit Restbetrag am Chip. Wird im Buchungsdialog und in den
// Admin-Blöcken (Guthaben, Einkauf) identisch verwendet.
function buildNameChipHtml() {
  const creditMap = getCreditMap();
  const entries = aggregateNames(state.bookings, 1);
  for (const key in creditMap) {
    const c = creditMap[key];
    if (c.credit > 0.004 && !entries.some((e) => e.name.toLowerCase() === key)) {
      entries.push({ name: c.name, cups: 0 });
    }
  }
  entries.sort((a, b) => b.cups - a.cups);
  return entries.slice(0, 12).map((e) => {
    const c = creditMap[e.name.toLowerCase()];
    const credit = c && c.credit > 0.004 ? ` · ${formatMoney(c.credit)}` : '';
    return `<button type="button" class="name-chip" data-name="${escapeHtml(e.name)}">${escapeHtml(e.name)}${credit}</button>`;
  }).join('');
}

function renderNameSuggestions() {
  const html = buildNameChipHtml();
  el.nameSuggest.hidden = !html;
  el.nameSuggest.innerHTML = html;
}

function renderAdminNameChips() {
  const html = buildNameChipHtml();
  el.creditNameSuggest.innerHTML = html;
  el.purchaseNameSuggest.innerHTML = html;
}

// Verdrahtet eine Chip-Reihe mit ihrem Eingabefeld (Antippen = übernehmen).
function wireChipRow(container, input) {
  container.addEventListener('click', (ev) => {
    const chip = ev.target.closest('.name-chip');
    if (!chip) return;
    input.value = chip.dataset.name;
    const chips = container.querySelectorAll('.name-chip');
    for (let i = 0; i < chips.length; i++) chips[i].classList.remove('selected');
    chip.classList.add('selected');
  });
}

// Produkt-Chips im Einkaufs-Block: Mehrfachauswahl aus dem Lagerbestand.
function renderPurchaseProducts() {
  el.purchaseProducts.innerHTML = INVENTORY_ITEMS.map((it) =>
    `<button type="button" class="name-chip${state.purchaseSelection[it.key] ? ' selected' : ''}" data-key="${it.key}">${it.label}</button>`
  ).join('');
}

// Je gewähltem Produkt eine Positionszeile: Anzahl × Stückpreis.
// Der zuletzt gezahlte Stückpreis wird vorbefüllt (Preisgedächtnis).
function renderPurchaseLines() {
  const keys = INVENTORY_ITEMS.filter((it) => state.purchaseSelection[it.key]);
  if (!keys.length) {
    el.purchaseLines.innerHTML = '';
    recalcPurchaseTotal();
    return;
  }
  const last = state.settings.lastUnitPrice || {};
  el.purchaseLines.innerHTML = keys.map((it) => {
    const sel = state.purchaseSelection[it.key];
    const qty = (sel && sel.qty != null) ? sel.qty : 1;
    const price = (sel && sel.unitPrice != null) ? sel.unitPrice
      : (last[it.key] != null ? last[it.key] : '');
    return `<div class="purchase-line" data-key="${it.key}">
      <span class="pl-label">${it.label}</span>
      <input type="number" class="note-input pl-qty" min="0" step="1" value="${qty}" data-key="${it.key}">
      <span class="pl-x">×</span>
      <input type="number" class="note-input pl-price" min="0" step="0.05" placeholder="€/Stk" value="${price}" data-key="${it.key}">
      <span class="pl-sum" data-key="${it.key}">0,00 €</span>
    </div>`;
  }).join('');
  // aktuelle Werte in state spiegeln, damit sie erhalten bleiben
  for (const it of keys) {
    if (!state.purchaseSelection[it.key] || state.purchaseSelection[it.key] === true) {
      state.purchaseSelection[it.key] = { qty: 1, unitPrice: (last[it.key] != null ? last[it.key] : null) };
    }
  }
  recalcPurchaseTotal();
}

function recalcPurchaseTotal() {
  let sum = 0;
  const rows = el.purchaseLines.querySelectorAll('.purchase-line');
  rows.forEach((row) => {
    const key = row.dataset.key;
    const qty = parseFloat((row.querySelector('.pl-qty').value || '').replace(',', '.')) || 0;
    const price = parseFloat((row.querySelector('.pl-price').value || '').replace(',', '.')) || 0;
    const lineSum = Math.round(qty * price * 100) / 100;
    row.querySelector('.pl-sum').textContent = formatMoney(lineSum);
    sum += lineSum;
    if (state.purchaseSelection[key] && state.purchaseSelection[key] !== true) {
      state.purchaseSelection[key].qty = qty;
      state.purchaseSelection[key].unitPrice = price;
    }
  });
  if (rows.length) {
    el.purchaseAmount.value = sum ? sum.toFixed(2) : '';
    el.purchaseAmount.disabled = true;
  } else {
    el.purchaseAmount.disabled = false;
  }
  if (el.purchaseTotal) el.purchaseTotal.textContent = formatMoney(sum);
}

// Steuert die Buchungs-Buttons: "Auf Abrechnung" braucht zwingend einen
// Namen (sonst anonyme Schulden); der Guthaben-Button erscheint, sobald
// der Name ein Guthaben hat, und deaktiviert sich bei zu wenig Deckung.
function updateBookingButtons() {
  if (!state.pendingBooking) return;
  const name = el.bookingNote.value.trim();
  el.btnMarkAbrechnung.classList.toggle('btn--locked', name === '');
  const credit = name ? getCreditFor(name) : 0;
  if (credit > 0.004) {
    const { article, qty } = state.pendingBooking;
    const total = (state.settings.prices[article] || 0) * qty;
    el.btnMarkGuthaben.hidden = false;
    el.btnMarkGuthaben.textContent = `Guthaben (${formatMoney(credit)})`;
    el.btnMarkGuthaben.disabled = credit + 0.004 < total;
  } else {
    el.btnMarkGuthaben.hidden = true;
  }
}

function renderStorageBadge() {
  el.storageBadge.textContent = Store.isFallback()
    ? 'Speicherung: localStorage-Fallback'
    : '';
}

function renderAdminStats() {
  const day = getPeriodStats('day');
  const month = getPeriodStats('month');
  const bal = getBalance();
  const rows = [
    ['Bilanz: Eingegangen (Kasse)', formatMoney(bal.paid)],
    ['Gesamtwert aller Entnahmen', formatMoney(bal.drinksTotal)],
    ['Offene Anschreiben', formatMoney(-bal.open)],
    ['Offenes Guthaben', formatMoney(bal.creditRest)],
    ['Einkäufe gesamt', formatMoney(-bal.purchasesTotal)],
    ['Offene Erstattungen', formatMoney(-bal.refundsOpen)],
    ['Tagesumsatz', formatMoney(day.sumTotal)],
    ['Davon bar (heute)', formatMoney(day.sumBar)],
    ['Davon PayPal (heute)', formatMoney(day.sumPaypal)],
    ['Davon Guthaben (heute)', formatMoney(day.sumGuthaben)],
    ['Davon auf Abrechnung (heute)', formatMoney(day.sumAbrechnung)],
    ['Monatsumsatz', formatMoney(month.sumTotal)],
    ['Davon bar (Monat)', formatMoney(month.sumBar)],
    ['Davon PayPal (Monat)', formatMoney(month.sumPaypal)],
    ['Davon Guthaben (Monat)', formatMoney(month.sumGuthaben)],
    ['Davon auf Abrechnung (Monat)', formatMoney(month.sumAbrechnung)],
    ['Buchungen gesamt (alle Zeit)', String(state.bookings.length)],
  ];
  for (const a of ARTICLES) {
    rows.push([`Menge ${a.label} (Monat)`, String(month.countByArticle[a.key] || 0)]);
  }
  el.adminStats.innerHTML = rows.map(([label, value]) => `
    <div class="kv-row"><span class="kv-label">${label}</span><span class="kv-value">${value}</span></div>
  `).join('');
}

function renderAdminPrices() {
  el.adminPrices.innerHTML = '';
  for (const article of ARTICLES) {
    const wrap = document.createElement('div');
    wrap.className = 'admin-price-field';
    wrap.innerHTML = `
      <label for="price-${article.key}">${article.emoji} ${article.label} (€)</label>
      <input type="number" step="0.05" min="0" id="price-${article.key}"
             class="note-input" value="${state.settings.prices[article.key].toFixed(2)}">
    `;
    el.adminPrices.appendChild(wrap);
  }
}

function renderAdminInventory() {
  el.adminInventory.innerHTML = '';
  for (const item of INVENTORY_ITEMS) {
    const status = state.settings.inventory[item.key] || 'ok';
    const row = document.createElement('div');
    row.className = 'admin-inventory-row';
    const options = INVENTORY_STATES.map((s) =>
      `<option value="${s}" ${s === status ? 'selected' : ''}>${INVENTORY_STATE_LABELS[s]}</option>`
    ).join('');
    row.innerHTML = `<span>${item.label}</span><select data-item="${item.key}">${options}</select>`;
    row.querySelector('select').addEventListener('change', async (e) => {
      state.settings.inventory[item.key] = e.target.value;
      await Store.saveSettings(state.settings);
      renderInventory();
    });
    el.adminInventory.appendChild(row);
  }
}

function renderAll() {
  renderProductGrid();
  renderKasseStand();
  renderInventory();
  renderRace();
  renderStorageBadge();
}

// Ausgaben je Produkt aus den Einkauf-items (Basis fürs spätere
// Kaffeepreis-Rechnen). Alte Einkäufe ohne items werden übersprungen.
function getProductSpend() {
  const map = {};
  for (const b of state.bookings) {
    if (b.article !== 'einkauf' || !Array.isArray(b.items)) continue;
    for (const it of b.items) {
      if (!it.product) continue;
      if (!map[it.product]) map[it.product] = { label: it.label, spend: 0, qty: 0, lastTs: 0 };
      map[it.product].spend += Math.round((it.qty || 0) * (it.unitPrice || 0) * 100) / 100;
      map[it.product].qty += (it.qty || 0);
      if (b.ts > map[it.product].lastTs) map[it.product].lastTs = b.ts;
    }
  }
  return INVENTORY_ITEMS
    .filter((it) => map[it.key])
    .map((it) => Object.assign({ key: it.key }, map[it.key]));
}

function renderAdminSpend() {
  const spend = getProductSpend();
  if (!spend.length) {
    el.adminSpendList.innerHTML = '<p class="hint">Sobald Einkäufe mit Menge und Stückpreis erfasst sind, entsteht hier die Kostenbasis für einen fairen Kaffeepreis.</p>';
    return;
  }
  const now = Date.now();
  el.adminSpendList.innerHTML = spend.map((s) => {
    const days = Math.floor((now - s.lastTs) / 86400000);
    const ago = days <= 0 ? 'heute' : `vor ${days} Tag${days === 1 ? '' : 'en'}`;
    return `<div class="kv-row"><span class="kv-label">${escapeHtml(s.label)} · ${s.qty} Stk · zuletzt ${ago}</span><span class="kv-value">${formatMoney(s.spend)}</span></div>`;
  }).join('');
}

// Aktualisiert alle Admin-Listen nach einer Aktion (Buchung/Storno/…),
// solange der Admin-Bereich offen ist.
function refreshAdmin() {
  if (el.overlayAdmin.hidden) return;
  renderAdminRecent();
  renderAdminStats();
  renderAdminCredits();
  renderAdminNameChips();
  renderAdminPurchases();
  renderAdminSpend();
  renderAdminAccounts();
  renderCashCount();
}

function renderAdminPanel() {
  renderAdminRecent();
  renderAdminStats();
  renderAdminCredits();
  renderAdminNameChips();
  renderAdminPurchases();
  renderPurchaseProducts();
  renderPurchaseLines();
  renderAdminSpend();
  renderAdminAccounts();
  renderCashCount();
  renderAdminPrices();
  el.adminPoolUrl.value = state.settings.poolUrl || '';
  renderAdminInventory();
  el.adminPin.value = state.settings.pin || '';
  el.standbyEnabled.checked = !!state.settings.standby.enabled;
  el.standbyStart.value = state.settings.standby.start || '19:00';
  el.standbyEnd.value = state.settings.standby.end || '06:30';
  el.standbyWeekend.checked = !!state.settings.standby.weekend;
}

/* -------------------------------------------------------------------------
   Buchungs-Sheet
   ------------------------------------------------------------------------- */

function openBookingSheet(articleKey) {
  const article = ARTICLES.find((a) => a.key === articleKey);
  state.pendingBooking = { article: article.key, qty: 1 };
  el.bookingEmoji.innerHTML = article.icon;
  el.bookingLabel.textContent = article.label;
  el.bookingNote.value = '';
  renderNameSuggestions();
  showBookingStep('choose');
  updateBookingSheetPrices();
  updateBookingButtons();
  el.overlayBooking.hidden = false;
}

function showBookingStep(step) {
  el.bookingStepChoose.hidden = step !== 'choose';
  el.bookingStepPaypal.hidden = step !== 'paypal';
}

function openPaypalStep() {
  if (!state.pendingBooking) return;
  const { article, qty } = state.pendingBooking;
  const unitPrice = state.settings.prices[article] || 0;
  el.paypalTotal.textContent = formatMoney(unitPrice * qty);
  renderQrInto(el.qrBoxSheet);
  showBookingStep('paypal');
}

function updateBookingSheetPrices() {
  const { article, qty } = state.pendingBooking;
  const unitPrice = state.settings.prices[article] || 0;
  el.qtyValue.textContent = String(qty);
  el.unitPrice.textContent = formatMoney(unitPrice);
  el.totalPrice.textContent = formatMoney(unitPrice * qty);
  updateBookingButtons();
}

function closeBookingSheet() {
  el.overlayBooking.hidden = true;
  state.pendingBooking = null;
}

async function commitBooking(status) {
  if (!state.pendingBooking) return;
  const { article, qty } = state.pendingBooking;
  const unitPrice = state.settings.prices[article] || 0;
  if (status === 'abrechnung' && !el.bookingNote.value.trim()) {
    showToast('Für Anschreiben bitte einen Namen angeben.');
    el.bookingNote.classList.add('note-input--error');
    el.bookingNote.focus();
    setTimeout(() => el.bookingNote.classList.remove('note-input--error'), 1500);
    return;
  }
  let creditBefore = 0;
  if (status === 'guthaben') {
    const name = el.bookingNote.value.trim();
    if (!name) { showToast('Für Guthaben bitte einen Namen angeben.'); return; }
    creditBefore = getCreditFor(name);
    if (creditBefore + 0.004 < unitPrice * qty) {
      showToast('Guthaben reicht dafür nicht aus.');
      return;
    }
  }
  const booking = {
    id: uid(),
    ts: Date.now(),
    article,
    qty,
    unitPrice,
    total: Math.round(unitPrice * qty * 100) / 100,
    status,
    note: el.bookingNote.value.trim(),
    dayClosureId: null,
    monthClosureId: null,
  };
  await Store.addBooking(booking);
  state.bookings.push(booking);
  closeBookingSheet();
  renderKasseStand();
  renderRace();
  const label = ARTICLES.find((a) => a.key === article).label;
  if (status === 'guthaben') {
    showToast(`${label} × ${qty} vom Guthaben (Rest: ${formatMoney(creditBefore - booking.total)}).`);
  } else {
    const statusLabel = status === 'paypal' ? 'PayPal'
      : status === 'abrechnung' ? 'auf Abrechnung' : 'bar';
    showToast(`${label} × ${qty} gebucht (${statusLabel}).`);
  }
}

/* -------------------------------------------------------------------------
   Admin: PIN-Schutz
   ------------------------------------------------------------------------- */

function requireAdminAccess(action) {
  if (!state.settings.pin) {
    action();
    return;
  }
  state.pinUnlockAction = action;
  el.pinInput.value = '';
  el.pinError.hidden = true;
  el.overlayPin.hidden = false;
  el.pinInput.focus();
}

function closePinOverlay() {
  el.overlayPin.hidden = true;
  state.pinUnlockAction = null;
}

function confirmPin() {
  if (el.pinInput.value === state.settings.pin) {
    const action = state.pinUnlockAction;
    closePinOverlay();
    if (action) action();
  } else {
    el.pinError.hidden = false;
  }
}

function openAdminPanel() {
  renderAdminPanel();
  el.overlayAdmin.hidden = false;
}

function closeAdminPanel() {
  el.overlayAdmin.hidden = true;
}

/* -------------------------------------------------------------------------
   Admin: Aktionen
   ------------------------------------------------------------------------- */

async function saveAdminPrices() {
  for (const article of ARTICLES) {
    const input = document.getElementById(`price-${article.key}`);
    const value = parseFloat(input.value.replace(',', '.'));
    state.settings.prices[article.key] = Number.isFinite(value) && value >= 0 ? value : 0;
  }
  await Store.saveSettings(state.settings);
  renderProductGrid();
  showToast('Preise gespeichert.');
}

async function saveAdminPool() {
  const url = el.adminPoolUrl.value.trim() || DEFAULT_POOL_URL;
  state.settings.poolUrl = url;
  await Store.saveSettings(state.settings);
  showToast('Pool-Link gespeichert.');
}

async function saveAdminPin() {
  state.settings.pin = el.adminPin.value.trim();
  await Store.saveSettings(state.settings);
  showToast(state.settings.pin ? 'PIN gespeichert.' : 'PIN-Schutz deaktiviert.');
}

// Markiert alle offenen Anschreiben als beglichen – z. B. nach der
// Sammelrunde, wenn das Geld in Kasse oder Pool gelandet ist. Der Status
// 'beglichen' bleibt im Export als Nachweis erhalten.
const PURCHASE_STATUS_LABELS = {
  erstattet: 'bar erstattet', guthaben: 'als Guthaben', offen: 'offen',
};

function renderAdminPurchases() {
  const purchases = state.bookings.filter((b) => b.article === 'einkauf')
    .slice().sort((a, b) => b.ts - a.ts).slice(0, 10);
  if (!purchases.length) {
    el.adminPurchaseList.innerHTML = '<p class="hint">Noch keine Einkäufe erfasst.</p>';
    return;
  }
  const cash = getCashBreakdown().cashSoll;
  const offenSum = state.bookings
    .filter((b) => b.article === 'einkauf' && b.status === 'offen')
    .reduce((s, b) => s + b.total, 0);
  const head = offenSum > 0.004
    ? `<p class="hint">Bar verfügbar: <strong>${formatMoney(Math.max(0, cash))}</strong> · offene Auslagen: <strong>${formatMoney(offenSum)}</strong></p>`
    : '';
  const rows = purchases.map((p) => {
    const d = new Date(p.ts);
    const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
    const info = p.info ? ` – ${escapeHtml(p.info)}` : '';
    let action = '';
    if (p.status === 'offen') {
      if (cash > 0.004) {
        const z = Math.min(p.total, cash);
        action = ` <button type="button" class="purchase-refund-btn" data-id="${p.id}">Erstatten (max ${formatMoney(z)})</button>`;
      } else {
        action = ' <span class="pl-x">— kein Bargeld</span>';
      }
    }
    return `<div class="kv-row"><span class="kv-label">${date} ${escapeHtml(p.note || '')}${info} (${PURCHASE_STATUS_LABELS[p.status] || p.status})${action}</span><span class="kv-value">${formatMoney(-p.total)}</span></div>`;
  }).join('');
  el.adminPurchaseList.innerHTML = head + rows;
}

// Kassensturz: gezähltes Bargeld/PayPal gegen das Soll aus den Buchungen.
function renderCashCount() {
  const { cashSoll, paypalSoll } = getCashBreakdown();
  const line = (label, soll, istRaw) => {
    const ist = parseFloat((istRaw || '').replace(',', '.'));
    let diffHtml = '';
    if (Number.isFinite(ist)) {
      const diff = Math.round((ist - soll) * 100) / 100;
      const cls = Math.abs(diff) < 0.005 ? 'cashcount-ok' : 'cashcount-bad';
      const sign = diff > 0 ? '+' : '';
      diffHtml = ` · Ist ${formatMoney(ist)} · <span class="${cls}">Diff ${sign}${formatMoney(diff)}</span>`;
    }
    return `<div class="kv-row"><span class="kv-label">${label}: Soll ${formatMoney(soll)}${diffHtml}</span></div>`;
  };
  el.cashcountResult.innerHTML =
    line('Bargeld', cashSoll, el.cashcountCash.value) +
    line('PayPal-Pool', paypalSoll, el.cashcountPaypal.value);
}

// Bucht die Differenz zwischen gezähltem Ist und Soll als Korrektur,
// sodass die App-Kasse dem tatsächlichen Bestand entspricht. Zum Nullen
// einfach 0 eintragen.
async function applyCashCorrection() {
  const { cashSoll, paypalSoll } = getCashBreakdown();
  const istBar = parseFloat((el.cashcountCash.value || '').replace(',', '.'));
  const istPP = parseFloat((el.cashcountPaypal.value || '').replace(',', '.'));
  const round = (x) => Math.round(x * 100) / 100;
  const todo = [];
  if (Number.isFinite(istBar)) {
    const d = round(istBar - cashSoll);
    if (Math.abs(d) > 0.004) todo.push(['bar', d, `Bargeld auf ${formatMoney(istBar)} korrigiert`]);
  }
  if (Number.isFinite(istPP)) {
    const d = round(istPP - paypalSoll);
    if (Math.abs(d) > 0.004) todo.push(['paypal', d, `PayPal-Pool auf ${formatMoney(istPP)} korrigiert`]);
  }
  if (!todo.length) { showToast('Kein Ist-Wert eingegeben oder bereits korrekt.'); return; }
  const lines = todo.map((t) => `${t[0] === 'bar' ? 'Bargeld' : 'PayPal'}: ${t[1] > 0 ? '+' : ''}${formatMoney(t[1])}`).join('\n');
  if (!confirm(`Kasse an gezählten Bestand angleichen? Als Korrektur wird gebucht:\n\n${lines}`)) return;
  const now = Date.now();
  for (const [status, delta, label] of todo) {
    const b = {
      id: uid(), ts: now, article: 'korrektur', qty: 1,
      unitPrice: delta, total: delta, status, note: 'Kassenkorrektur',
      info: label, dayClosureId: null, monthClosureId: null,
    };
    await Store.addBooking(b);
    state.bookings.push(b);
  }
  el.cashcountCash.value = '';
  el.cashcountPaypal.value = '';
  refreshAdmin();
  renderKasseStand();
  showToast(`Kasse korrigiert (${todo.length} Buchung${todo.length > 1 ? 'en' : ''}).`);
}

// Einkauf erfassen: 'erstattet' senkt die Kasse sofort, 'guthaben' schreibt
// dem Einkäufer Trinkguthaben gut (ohne Kasseneffekt – es kam Ware statt
// Geld), 'offen' bleibt als Erstattungsschuld sichtbar.
async function addPurchase(mode) {
  const name = el.purchaseName.value.trim();
  if (!name) { showToast('Bitte einen Namen angeben.'); return; }
  const products = INVENTORY_ITEMS.filter((it) => state.purchaseSelection[it.key]);
  // Positionen mit Menge > 0 zu items zusammenbauen
  const items = [];
  let itemsSum = 0;
  for (const it of products) {
    const sel = state.purchaseSelection[it.key];
    const qty = sel && sel.qty ? sel.qty : 0;
    const unitPrice = sel && sel.unitPrice ? sel.unitPrice : 0;
    if (qty > 0) {
      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      items.push({ product: it.key, label: it.label, qty, unitPrice });
      itemsSum += lineTotal;
    }
  }
  const freitext = el.purchaseInfo.value.trim();
  const manual = parseFloat((el.purchaseAmount.value || '').replace(',', '.'));
  // Gesamtbetrag: Positionssumme, sonst manueller Betrag (nur Freitext-Einkauf)
  const total = items.length ? Math.round(itemsSum * 100) / 100
    : (Number.isFinite(manual) ? Math.round(manual * 100) / 100 : 0);
  if (total <= 0) { showToast('Bitte Menge und Preis oder einen Betrag angeben.'); return; }
  const infoParts = items.map((i) => `${i.qty}× ${i.label}`);
  if (freitext) infoParts.push(freitext);
  const booking = {
    id: uid(),
    ts: Date.now(),
    article: 'einkauf',
    qty: 1,
    unitPrice: total,
    total,
    status: mode,
    note: name,
    info: infoParts.join(', '),
    items,
    dayClosureId: null,
    monthClosureId: null,
  };
  await Store.addBooking(booking);
  state.bookings.push(booking);
  // Eingekaufte Artikel sind wieder da -> Ampel zurück auf OK,
  // zuletzt gezahlten Stückpreis je Produkt merken
  if (items.length || products.length) {
    if (!state.settings.lastUnitPrice) state.settings.lastUnitPrice = {};
    for (const it of products) state.settings.inventory[it.key] = 'ok';
    for (const i of items) if (i.unitPrice > 0) state.settings.lastUnitPrice[i.product] = i.unitPrice;
    await Store.saveSettings(state.settings);
    renderInventory();
    renderAdminInventory();
  }
  state.purchaseSelection = {};
  renderPurchaseProducts();
  renderPurchaseLines();
  el.purchaseAmount.value = '';
  el.purchaseAmount.disabled = false;
  el.purchaseInfo.value = '';
  if (mode === 'guthaben') await settleDebtsFromCredit(name.toLowerCase());
  refreshAdmin();
  renderKasseStand();
  const label = mode === 'erstattet' ? 'bar erstattet'
    : mode === 'guthaben' ? 'als Guthaben gutgeschrieben' : 'als offen vermerkt';
  showToast(`Einkauf über ${formatMoney(booking.total)} erfasst (${label}).`);
}

async function refundPurchase(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b || b.article !== 'einkauf' || b.status !== 'offen') return;
  const cash = getCashBreakdown().cashSoll;
  if (cash <= 0.004) { showToast('Nicht genug Bargeld in der Kasse.'); return; }
  const maxPay = Math.min(b.total, cash);
  const input = prompt(`Wie viel an ${b.note} erstatten? (offen ${formatMoney(b.total)}, bar verfügbar ${formatMoney(cash)})`, maxPay.toFixed(2));
  if (input === null) return;
  let amount = parseFloat((input || '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) { showToast('Bitte einen gültigen Betrag angeben.'); return; }
  amount = Math.round(amount * 100) / 100;
  if (amount >= b.total - 0.004) {
    // vollständig
    b.status = 'erstattet';
    b.erstattetTs = Date.now();
    await Store.updateBooking(id, { status: 'erstattet', erstattetTs: b.erstattetTs });
  } else {
    // Teilerstattung: Rest bleibt offen, ausgezahlter Teil als neue Buchung
    b.total = Math.round((b.total - amount) * 100) / 100;
    await Store.updateBooking(id, { total: b.total });
    const part = {
      id: uid(), ts: Date.now(), article: 'einkauf', qty: 1,
      unitPrice: amount, total: amount, status: 'erstattet',
      note: b.note, info: 'Teilerstattung', items: [],
      erstattetTs: Date.now(), dayClosureId: null, monthClosureId: null,
    };
    await Store.addBooking(part);
    state.bookings.push(part);
  }
  refreshAdmin();
  renderKasseStand();
  showToast(`${formatMoney(amount)} an ${b.note} erstattet – bitte aus der Kasse entnehmen.`);
}

function renderAdminCredits() {
  const map = getCreditMap();
  const entries = Object.keys(map).map((k) => map[k])
    .filter((e) => Math.abs(e.credit) > 0.004)
    .sort((a, b) => b.credit - a.credit);
  el.adminCreditList.innerHTML = entries.length
    ? entries.map((e) => `<div class="kv-row"><span class="kv-label">${escapeHtml(e.name)}</span><span class="kv-value">${formatMoney(e.credit)}</span></div>`).join('')
    : '<p class="hint">Noch kein Guthaben angelegt.</p>';
  const names = aggregateNames(state.bookings, 1);
  el.creditNames.innerHTML = names.map((e) => `<option value="${escapeHtml(e.name)}"></option>`).join('');
}

async function addCredit(method) {
  const name = el.creditName.value.trim();
  const amount = parseFloat((el.creditAmount.value || '').replace(',', '.'));
  if (!name) { showToast('Bitte einen Namen angeben.'); return; }
  if (!Number.isFinite(amount) || amount <= 0) { showToast('Bitte einen gültigen Betrag angeben.'); return; }
  const booking = {
    id: uid(),
    ts: Date.now(),
    article: 'guthaben',
    qty: 1,
    unitPrice: Math.round(amount * 100) / 100,
    total: Math.round(amount * 100) / 100,
    status: method,
    note: name,
    dayClosureId: null,
    monthClosureId: null,
  };
  await Store.addBooking(booking);
  state.bookings.push(booking);
  el.creditAmount.value = '';
  const res = await settleDebtsFromCredit(name.toLowerCase());
  refreshAdmin();
  renderKasseStand();
  const kanal = method === 'paypal' ? 'PayPal' : 'bar';
  if (res.settled > 0.004) {
    showToast(`${formatMoney(booking.total)} für ${name} aufgeladen (${kanal}) · davon ${formatMoney(res.settled)} mit Schulden verrechnet · Restguthaben ${formatMoney(res.rest)}.`);
  } else {
    showToast(`Guthaben für ${name} um ${formatMoney(booking.total)} aufgeladen (${kanal}).`);
  }
}

// --- Storno: letzte Buchungen rückgängig machen ------------------------

function bookingDescription(b) {
  const name = (b.note || '').trim();
  if (b.article === 'korrektur') return b.info || 'Kassenkorrektur';
  if (b.article === 'guthaben') {
    if (b.payout) return `Auszahlung${name ? ' ' + name : ''}`;
    return `Guthaben${name ? ' ' + name : ''}`;
  }
  if (b.article === 'einkauf') {
    const info = b.info ? ` – ${b.info}` : '';
    return `Einkauf${name ? ' ' + name : ''}${info}`;
  }
  const art = ARTICLES.find((a) => a.key === b.article);
  const label = art ? art.label : b.article;
  const statusMap = { bar: 'bar', paypal: 'PayPal', guthaben: 'Guthaben',
    abrechnung: 'Anschreiben', offen: 'Anschreiben', beglichen: 'beglichen' };
  return `${label} ×${b.qty}${name ? ' · ' + name : ''} · ${statusMap[b.status] || b.status}`;
}

function renderAdminRecent() {
  const recent = state.bookings.slice().sort((a, b) => b.ts - a.ts).slice(0, 15);
  if (!recent.length) {
    el.adminRecentList.innerHTML = '<p class="hint">Noch keine Buchungen.</p>';
    return;
  }
  el.adminRecentList.innerHTML = recent.map((b) => {
    const d = new Date(b.ts);
    const t = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}. ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    return `<div class="kv-row"><span class="kv-label">${t} · ${escapeHtml(bookingDescription(b))} <button type="button" class="purchase-refund-btn" data-undo="${b.id}">Storno</button></span><span class="kv-value">${formatMoney(b.total)}</span></div>`;
  }).join('');
}

async function undoBooking(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return;
  if (!confirm(`Buchung stornieren?\n\n${bookingDescription(b)} (${formatMoney(b.total)})`)) return;
  state.bookings = state.bookings.filter((x) => x.id !== id);
  await Store.replaceAllBookings(state.bookings);
  renderAll();
  refreshAdmin();
  showToast('Buchung storniert.');
}

// --- Konten: Schulden (Anschreiben) und Guthaben pro Person ------------

// Verrechnet offene Anschreiben einer Person mit ihrem Guthaben:
// die ältesten Anschreiben-Getränke werden auf 'guthaben' umgebucht
// (vom Guthaben bezahlt), soweit das Guthaben reicht. Bilanzneutral.
async function settleDebtsFromCredit(nameKey) {
  const map = getCreditMap();
  let avail = (map[nameKey] && map[nameKey].credit) || 0;
  if (avail <= 0.004) return { settled: 0, rest: avail };
  const debts = state.bookings
    .filter((b) => b.article !== 'guthaben' && b.article !== 'einkauf'
      && (b.status === 'abrechnung' || b.status === 'offen')
      && (b.note || '').trim().toLowerCase() === nameKey)
    .sort((a, b) => a.ts - b.ts);
  let settled = 0;
  const now = Date.now();
  for (const b of debts) {
    if (b.total <= avail + 0.004) {
      b.status = 'guthaben';
      b.beglichenTs = now;
      b.settledFromCredit = true;
      await Store.updateBooking(b.id, { status: 'guthaben', beglichenTs: now, settledFromCredit: true });
      avail = Math.round((avail - b.total) * 100) / 100;
      settled = Math.round((settled + b.total) * 100) / 100;
    }
  }
  return { settled, rest: avail };
}

// Zahlt einer Person (einen Teil) ihres Guthabens bar aus der Kasse aus:
// negative Guthaben-Buchung -> Guthaben sinkt und Kasse sinkt.
async function payoutCredit(nameKey) {
  const acct = getAccounts().find((a) => a.key === nameKey);
  const map = getCreditMap();
  const credit = (map[nameKey] && map[nameKey].credit) || 0;
  const name = (map[nameKey] && map[nameKey].name) || (acct && acct.name) || nameKey;
  if (credit <= 0.004) { showToast('Kein Guthaben vorhanden.'); return; }
  const input = prompt(`Wie viel von ${name}s Guthaben (${formatMoney(credit)}) bar auszahlen?`, credit.toFixed(2));
  if (input === null) return;
  let a = parseFloat((input || '').replace(',', '.'));
  if (!Number.isFinite(a) || a <= 0) { showToast('Bitte einen gültigen Betrag angeben.'); return; }
  a = Math.round(a * 100) / 100;
  if (a > credit + 0.004) { showToast(`Höchstens ${formatMoney(credit)} auszahlbar.`); return; }
  const cash = getCashBreakdown().cashSoll;
  const booking = {
    id: uid(), ts: Date.now(), article: 'guthaben', qty: 1,
    unitPrice: -a, total: -a, status: 'bar', note: name,
    info: 'Auszahlung', payout: true, dayClosureId: null, monthClosureId: null,
  };
  await Store.addBooking(booking);
  state.bookings.push(booking);
  refreshAdmin();
  renderKasseStand();
  const warn = a > cash + 0.004 ? ' (mehr als bar vorhanden – ggf. aus PayPal-Pool entnehmen)' : '';
  showToast(`${formatMoney(a)} an ${name} ausgezahlt · Restguthaben ${formatMoney(credit - a)}${warn}.`);
}

function getAccounts() {
  const creditMap = getCreditMap();
  const map = {};
  for (const b of state.bookings) {
    if (b.article === 'guthaben' || b.article === 'einkauf') continue;
    if (b.status !== 'abrechnung' && b.status !== 'offen') continue;
    const name = (b.note || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map[key]) map[key] = { name, debt: 0, credit: 0 };
    map[key].debt += b.total;
  }
  for (const key in creditMap) {
    const c = creditMap[key];
    if (c.credit <= 0.004) continue;
    if (!map[key]) map[key] = { name: c.name, debt: 0, credit: 0 };
    map[key].credit = c.credit;
  }
  return Object.keys(map).map((k) => Object.assign({ key: k }, map[k]))
    .filter((e) => e.debt > 0.004 || e.credit > 0.004)
    .sort((a, b) => b.debt - a.debt);
}

function renderAdminAccounts() {
  const accounts = getAccounts();
  if (!accounts.length) {
    el.adminAccountList.innerHTML = '<p class="hint">Keine offenen Konten.</p>';
    return;
  }
  el.adminAccountList.innerHTML = accounts.map((a) => {
    const parts = [];
    if (a.debt > 0.004) parts.push(`<span class="acct-debt">schuldet ${formatMoney(a.debt)}</span>`);
    if (a.credit > 0.004) parts.push(`<span class="acct-credit">Guthaben ${formatMoney(a.credit)}</span>`);
    let btns = '';
    if (a.debt > 0.004 && a.credit > 0.004) {
      btns += ` <button type="button" class="purchase-refund-btn" data-net="${escapeHtml(a.key)}">Verrechnen</button>`;
    }
    if (a.debt > 0.004) {
      btns += ` <button type="button" class="purchase-refund-btn" data-settle="${escapeHtml(a.key)}">Beglichen</button>`;
    }
    if (a.credit > 0.004) {
      btns += ` <button type="button" class="purchase-refund-btn" data-payout="${escapeHtml(a.key)}">Auszahlen</button>`;
    }
    return `<div class="kv-row"><span class="kv-label">${escapeHtml(a.name)} · ${parts.join(' · ')}${btns}</span></div>`;
  }).join('');
}

async function verrechnenPerson(nameKey) {
  const res = await settleDebtsFromCredit(nameKey);
  refreshAdmin();
  renderKasseStand();
  if (res.settled > 0.004) showToast(`${formatMoney(res.settled)} Schulden mit Guthaben verrechnet · Restguthaben ${formatMoney(res.rest)}.`);
  else showToast('Nichts zu verrechnen (kein Guthaben).');
}

async function settlePerson(nameKey) {
  const acct = getAccounts().find((a) => a.key === nameKey);
  if (!acct || acct.debt <= 0.004) return;
  if (!confirm(`Anschreiben von ${acct.name} (${formatMoney(acct.debt)}) als beglichen markieren?\n\nDas Geld sollte jetzt bar in der Kasse oder im PayPal-Pool liegen.`)) return;
  const now = Date.now();
  state.bookings = state.bookings.map((b) => (
    (b.status === 'abrechnung' || b.status === 'offen')
      && b.article !== 'einkauf' && b.article !== 'guthaben'
      && (b.note || '').trim().toLowerCase() === nameKey
      ? Object.assign({}, b, { status: 'beglichen', beglichenTs: now })
      : b
  ));
  await Store.replaceAllBookings(state.bookings);
  refreshAdmin();
  renderKasseStand();
  showToast(`Anschreiben von ${acct.name} über ${formatMoney(acct.debt)} beglichen.`);
}

async function performSettleOpen() {
  const bal = getBalance();
  if (bal.open <= 0) {
    showToast('Keine offenen Anschreiben.');
    return;
  }
  if (!confirm(`Alle offenen Anschreiben (${formatMoney(bal.open)}) als beglichen markieren?\n\nDas Geld sollte jetzt bar in der Kasse oder im PayPal-Pool liegen.`)) {
    return;
  }
  const now = Date.now();
  state.bookings = state.bookings.map((b) => (
    (b.status === 'abrechnung' || b.status === 'offen')
      && b.article !== 'einkauf' && b.article !== 'guthaben'
      ? Object.assign({}, b, { status: 'beglichen', beglichenTs: now })
      : b
  ));
  await Store.replaceAllBookings(state.bookings);
  renderKasseStand();
  refreshAdmin();
  showToast(`Anschreiben über ${formatMoney(bal.open)} ausgeglichen.`);
}

async function performDayClose() {
  const stats = getPeriodStats('day');
  if (!confirm(`Tagesdaten zurücksetzen?\n\nHeutige Summe: ${formatMoney(stats.sumTotal)}\nBuchungen bleiben in der Historie und in Exporten erhalten, die "Heute"-Anzeige startet neu.`)) {
    return;
  }
  const closure = {
    id: uid(), type: 'day', periodKey: todayKey(), ts: Date.now(),
    totals: { sumTotal: stats.sumTotal, sumBar: stats.sumBar, sumPaypal: stats.sumPaypal, sumAbrechnung: stats.sumAbrechnung, count: stats.count },
  };
  state.closures.push(closure);
  await Store.saveClosures(state.closures);
  renderKasseStand();
  renderAdminStats();
  showToast('Tagesdaten zurückgesetzt.');
}

async function performMonthClose() {
  const stats = getPeriodStats('month');
  if (!confirm(`Monat abschließen?\n\nMonatsumsatz: ${formatMoney(stats.sumTotal)}\nBuchungen bleiben in der Historie und in Exporten erhalten.`)) {
    return;
  }
  const closure = {
    id: uid(), type: 'month', periodKey: thisMonthKey(), ts: Date.now(),
    totals: { sumTotal: stats.sumTotal, sumBar: stats.sumBar, sumPaypal: stats.sumPaypal, sumAbrechnung: stats.sumAbrechnung, count: stats.count },
  };
  state.closures.push(closure);
  await Store.saveClosures(state.closures);
  renderAdminStats();
  showToast('Monat abgeschlossen.');
}

async function performWipeAll() {
  const confirmation = prompt('Achtung: Dies löscht ALLE lokalen Daten unwiderruflich (Buchungen, Einstellungen, Bestand).\nBitte vorher ein JSON-Backup exportieren.\n\nZum Bestätigen "LOESCHEN" eingeben:');
  if (confirmation !== 'LOESCHEN') {
    showToast('Abgebrochen.');
    return;
  }
  await Store.wipeAll();
  state.bookings = [];
  state.settings = defaultSettings();
  state.closures = [];
  renderAll();
  renderAdminPanel();
  showToast('Alle lokalen Daten wurden gelöscht.');
}

/* -------------------------------------------------------------------------
   Export / Import
   ------------------------------------------------------------------------- */

function downloadBlob(filename, content, mime) {
  // In der APK gibt es keine Browser-Downloads: dort schreibt die native
  // Bridge die Datei in den Download-Ordner des Tablets.
  if (window.KaffeekasseNative && typeof window.KaffeekasseNative.saveFile === 'function') {
    let ok = false;
    try { ok = window.KaffeekasseNative.saveFile(filename, content); } catch (err) { ok = false; }
    showToast(ok ? `Gespeichert unter Download/${filename}`
      : 'Speichern fehlgeschlagen – ist die Speicher-Berechtigung erteilt?');
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  showToast(`Download gestartet: ${filename}`);
}

function csvEscape(value) {
  const s = String(value === undefined || value === null ? '' : value);
  if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportCsv() {
  const header = ['ID', 'Datum', 'Uhrzeit', 'Artikel', 'Menge', 'Einzelpreis', 'Gesamtpreis', 'Status', 'Notiz', 'Info'];
  const rows = state.bookings
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((b) => {
      const d = new Date(b.ts);
      return [
        b.id,
        dateKey(b.ts),
        `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        b.article,
        b.qty,
        b.unitPrice.toFixed(2).replace('.', ','),
        b.total.toFixed(2).replace('.', ','),
        b.status,
        b.note || '',
        b.info || '',
      ];
    });
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(';')).join('\r\n');
  downloadBlob(`kaffeekasse-${todayKey()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    closures: state.closures,
    bookings: state.bookings,
  };
  downloadBlob(`kaffeekasse-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      showToast('Datei ist kein gültiges JSON.');
      return;
    }
    if (!data || !Array.isArray(data.bookings) || typeof data.settings !== 'object') {
      showToast('Backup-Format nicht erkannt.');
      return;
    }
    if (!confirm('Import überschreibt alle aktuellen lokalen Daten. Fortfahren?')) return;

    const settings = Object.assign(defaultSettings(), data.settings);
    settings.prices = Object.assign(defaultSettings().prices, data.settings.prices);
    settings.inventory = Object.assign(defaultSettings().inventory, data.settings.inventory);
    const closures = Array.isArray(data.closures) ? data.closures : [];

    await Store.replaceAllBookings(data.bookings);
    await Store.saveSettings(settings);
    await Store.saveClosures(closures);

    state.bookings = data.bookings;
    state.settings = settings;
    state.closures = closures;

    renderAll();
    renderAdminPanel();
    showToast('Backup importiert.');
  };
  reader.readAsText(file);
}

/* -------------------------------------------------------------------------
   Ereignisse
   ------------------------------------------------------------------------- */

function wireEvents() {
  el.btnQtyMinus.addEventListener('click', () => {
    if (!state.pendingBooking) return;
    state.pendingBooking.qty = Math.max(1, state.pendingBooking.qty - 1);
    updateBookingSheetPrices();
  });
  el.btnQtyPlus.addEventListener('click', () => {
    if (!state.pendingBooking) return;
    state.pendingBooking.qty = Math.min(50, state.pendingBooking.qty + 1);
    updateBookingSheetPrices();
  });
  el.nameSuggest.addEventListener('click', (ev) => {
    const chip = ev.target.closest('.name-chip');
    if (!chip) return;
    el.bookingNote.value = chip.dataset.name;
    const chips = el.nameSuggest.querySelectorAll('.name-chip');
    for (let i = 0; i < chips.length; i++) chips[i].classList.remove('selected');
    chip.classList.add('selected');
    updateBookingButtons();
  });

  el.btnCancelBooking.addEventListener('click', closeBookingSheet);
  el.btnMarkBar.addEventListener('click', () => commitBooking('bar'));
  el.btnMarkAbrechnung.addEventListener('click', () => commitBooking('abrechnung'));
  el.btnMarkGuthaben.addEventListener('click', () => commitBooking('guthaben'));
  el.bookingNote.addEventListener('input', updateBookingButtons);
  el.btnMarkPaypal.addEventListener('click', openPaypalStep);
  el.btnPaypalBack.addEventListener('click', () => showBookingStep('choose'));
  el.btnPaypalConfirm.addEventListener('click', () => commitBooking('paypal'));

  el.standbyOverlay.addEventListener('click', wakeFromStandby);
  el.btnSaveStandby.addEventListener('click', saveStandbySettings);

  el.btnOpenAdmin.addEventListener('click', () => requireAdminAccess(openAdminPanel));
  el.btnPinCancel.addEventListener('click', closePinOverlay);
  el.btnPinConfirm.addEventListener('click', confirmPin);
  el.pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmPin(); });

  el.btnCloseAdmin.addEventListener('click', closeAdminPanel);
  el.btnSavePrices.addEventListener('click', saveAdminPrices);
  el.btnSavePool.addEventListener('click', saveAdminPool);
  el.btnSavePin.addEventListener('click', saveAdminPin);
  el.btnCreditBar.addEventListener('click', () => addCredit('bar'));
  el.btnCreditPaypal.addEventListener('click', () => addCredit('paypal'));
  wireChipRow(el.creditNameSuggest, el.creditName);
  wireChipRow(el.purchaseNameSuggest, el.purchaseName);
  el.purchaseProducts.addEventListener('click', (ev) => {
    const chip = ev.target.closest('.name-chip');
    if (!chip) return;
    const key = chip.dataset.key;
    if (state.purchaseSelection[key]) delete state.purchaseSelection[key];
    else state.purchaseSelection[key] = { qty: 1, unitPrice: null };
    renderPurchaseProducts();
    renderPurchaseLines();
  });
  el.purchaseLines.addEventListener('input', recalcPurchaseTotal);
  el.btnPurchaseRefunded.addEventListener('click', () => addPurchase('erstattet'));
  el.btnPurchaseCredit.addEventListener('click', () => addPurchase('guthaben'));
  el.btnPurchaseOpen.addEventListener('click', () => addPurchase('offen'));
  el.adminPurchaseList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.purchase-refund-btn');
    if (btn) refundPurchase(btn.dataset.id);
  });
  el.adminRecentList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-undo]');
    if (btn) undoBooking(btn.dataset.undo);
  });
  el.adminAccountList.addEventListener('click', (ev) => {
    const settleBtn = ev.target.closest('[data-settle]');
    if (settleBtn) { settlePerson(settleBtn.dataset.settle); return; }
    const netBtn = ev.target.closest('[data-net]');
    if (netBtn) { verrechnenPerson(netBtn.dataset.net); return; }
    const payBtn = ev.target.closest('[data-payout]');
    if (payBtn) { payoutCredit(payBtn.dataset.payout); return; }
  });
  el.cashcountCash.addEventListener('input', renderCashCount);
  el.cashcountPaypal.addEventListener('input', renderCashCount);
  el.btnCashcountApply.addEventListener('click', applyCashCorrection);
  el.btnSettleOpen.addEventListener('click', performSettleOpen);
  el.btnDayClose.addEventListener('click', performDayClose);
  el.btnMonthClose.addEventListener('click', performMonthClose);
  el.btnExportCsv.addEventListener('click', exportCsv);
  el.btnExportJson.addEventListener('click', exportJson);
  el.btnWipeAll.addEventListener('click', performWipeAll);
  el.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJsonFile(file);
    e.target.value = '';
  });
}

/* -------------------------------------------------------------------------
   Bootstrapping
   ------------------------------------------------------------------------- */

async function boot() {
  wireEvents();
  tickClock();
  setInterval(tickClock, 30000);

  try {
    const { settings, closures } = await Store.init();
    state.settings = settings;
    state.closures = closures;
    state.bookings = await Store.getAllBookings();
  } catch (err) {
    console.error('Datenspeicher konnte nicht initialisiert werden.', err);
    showToast('Fehler beim Laden der Daten. App läuft im eingeschränkten Modus.');
  }

  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('Service Worker konnte nicht registriert werden.', err);
    });
  }
}

boot();
