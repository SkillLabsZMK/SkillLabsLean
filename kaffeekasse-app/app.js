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

const ARTICLES = [
  { key: 'kaffee', label: 'Kaffee', emoji: '☕' },
  { key: 'tee', label: 'Tee', emoji: '🍵' },
];

const INVENTORY_ITEMS = [
  { key: 'kaffee', label: 'Kaffee' },
  { key: 'tee', label: 'Tee' },
  { key: 'milch', label: 'Milch' },
  { key: 'tabs', label: 'Spülmaschinentabs' },
];

const INVENTORY_STATES = ['ok', 'wenig', 'bestellen'];
const INVENTORY_STATE_LABELS = { ok: 'OK', wenig: 'Wenig', bestellen: 'Bestellen' };

function defaultSettings() {
  return {
    prices: { kaffee: 0.5, tee: 0.5 },
    poolUrl: DEFAULT_POOL_URL,
    pin: '',
    inventory: { kaffee: 'ok', tee: 'ok', milch: 'ok', tabs: 'ok' },
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
};

/* -------------------------------------------------------------------------
   DOM-Referenzen
   ------------------------------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);

const el = {
  clock: $('#clock'),
  productGrid: $('#product-grid'),
  todayStats: $('#today-stats'),
  inventoryList: $('#inventory-list'),
  qrBox: $('#qr-box'),
  btnOpenPool: $('#btn-open-pool'),
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

  btnOpenAdmin: $('#btn-open-admin'),
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
}

/* -------------------------------------------------------------------------
   Zeitraum-Statistik (für "Heute" und Monatsauswertung in Admin)
   Ein Abschluss (Tages-/Monatsabschluss) verschiebt die Grundlinie für den
   jeweiligen Zeitraum, ohne historische Buchungen zu löschen.
   ------------------------------------------------------------------------- */

function getPeriodStats(periodType) {
  const key = periodType === 'day' ? todayKey() : thisMonthKey();
  const keyFn = periodType === 'day' ? dateKey : monthKey;
  const lastClosureTs = state.closures
    .filter((c) => c.type === periodType && c.periodKey === key)
    .reduce((max, c) => Math.max(max, c.ts), 0);

  const bookings = state.bookings.filter(
    (b) => keyFn(b.ts) === key && b.ts > lastClosureTs
  );

  const stats = {
    key,
    count: bookings.length,
    countByArticle: {},
    sumTotal: 0,
    sumBar: 0,
    sumPaypal: 0,
  };
  for (const a of ARTICLES) stats.countByArticle[a.key] = 0;

  for (const b of bookings) {
    stats.sumTotal += b.total;
    // Ältere Buchungen können noch die Status 'bezahlt'/'offen' tragen;
    // alles außer 'paypal' zählt als Barzahlung in die Kasse.
    if (b.status === 'paypal') stats.sumPaypal += b.total;
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
      <span class="product-emoji">${article.emoji}</span>
      <span class="product-label">${article.label}</span>
      <span class="product-price">${formatMoney(price)}</span>`;
    btn.addEventListener('click', () => openBookingSheet(article.key));
    el.productGrid.appendChild(btn);
  }
}

function renderTodayStats() {
  const stats = getPeriodStats('day');
  const tiles = [
    { label: 'Kaffee heute', value: String(stats.countByArticle.kaffee || 0) },
    { label: 'Tee heute', value: String(stats.countByArticle.tee || 0) },
    { label: 'Vorgänge heute', value: String(stats.count) },
    { label: 'Summe gesamt', value: formatMoney(stats.sumTotal) },
    { label: 'Bar', value: formatMoney(stats.sumBar) },
    { label: 'PayPal', value: formatMoney(stats.sumPaypal) },
  ];
  el.todayStats.innerHTML = tiles.map((t) => `
    <div class="stat-tile">
      <div class="stat-value">${t.value}</div>
      <div class="stat-label">${t.label}</div>
    </div>
  `).join('');
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

function renderQr() {
  const url = state.settings.poolUrl || DEFAULT_POOL_URL;
  el.btnOpenPool.href = url;
  el.qrBox.innerHTML = '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    el.qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  } catch (err) {
    console.error('QR-Code konnte nicht erzeugt werden', err);
    el.qrBox.textContent = 'QR-Code nicht verfügbar';
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
  const rows = [
    ['Tagesumsatz', formatMoney(day.sumTotal)],
    ['Davon bar (heute)', formatMoney(day.sumBar)],
    ['Davon PayPal (heute)', formatMoney(day.sumPaypal)],
    ['Monatsumsatz', formatMoney(month.sumTotal)],
    ['Davon bar (Monat)', formatMoney(month.sumBar)],
    ['Davon PayPal (Monat)', formatMoney(month.sumPaypal)],
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
  renderTodayStats();
  renderInventory();
  renderQr();
  renderStorageBadge();
}

function renderAdminPanel() {
  renderAdminStats();
  renderAdminPrices();
  el.adminPoolUrl.value = state.settings.poolUrl || '';
  renderAdminInventory();
  el.adminPin.value = state.settings.pin || '';
}

/* -------------------------------------------------------------------------
   Buchungs-Sheet
   ------------------------------------------------------------------------- */

function openBookingSheet(articleKey) {
  const article = ARTICLES.find((a) => a.key === articleKey);
  state.pendingBooking = { article: article.key, qty: 1 };
  el.bookingEmoji.textContent = article.emoji;
  el.bookingLabel.textContent = article.label;
  el.bookingNote.value = '';
  updateBookingSheetPrices();
  el.overlayBooking.hidden = false;
}

function updateBookingSheetPrices() {
  const { article, qty } = state.pendingBooking;
  const unitPrice = state.settings.prices[article] || 0;
  el.qtyValue.textContent = String(qty);
  el.unitPrice.textContent = formatMoney(unitPrice);
  el.totalPrice.textContent = formatMoney(unitPrice * qty);
}

function closeBookingSheet() {
  el.overlayBooking.hidden = true;
  state.pendingBooking = null;
}

async function commitBooking(status) {
  if (!state.pendingBooking) return;
  const { article, qty } = state.pendingBooking;
  const unitPrice = state.settings.prices[article] || 0;
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
  renderTodayStats();
  const label = ARTICLES.find((a) => a.key === article).label;
  showToast(`${label} × ${qty} gebucht (${status === 'paypal' ? 'PayPal' : 'bar'}).`);
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
  renderQr();
  showToast('Pool-Link gespeichert.');
}

async function saveAdminPin() {
  state.settings.pin = el.adminPin.value.trim();
  await Store.saveSettings(state.settings);
  showToast(state.settings.pin ? 'PIN gespeichert.' : 'PIN-Schutz deaktiviert.');
}

async function performDayClose() {
  const stats = getPeriodStats('day');
  if (!confirm(`Tagesdaten zurücksetzen?\n\nHeutige Summe: ${formatMoney(stats.sumTotal)}\nBuchungen bleiben in der Historie und in Exporten erhalten, die "Heute"-Anzeige startet neu.`)) {
    return;
  }
  const closure = {
    id: uid(), type: 'day', periodKey: todayKey(), ts: Date.now(),
    totals: { sumTotal: stats.sumTotal, sumBar: stats.sumBar, sumPaypal: stats.sumPaypal, count: stats.count },
  };
  state.closures.push(closure);
  await Store.saveClosures(state.closures);
  renderTodayStats();
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
    totals: { sumTotal: stats.sumTotal, sumBar: stats.sumBar, sumPaypal: stats.sumPaypal, count: stats.count },
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
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function csvEscape(value) {
  const s = String(value === undefined || value === null ? '' : value);
  if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportCsv() {
  const header = ['ID', 'Datum', 'Uhrzeit', 'Artikel', 'Menge', 'Einzelpreis', 'Gesamtpreis', 'Status', 'Notiz'];
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
      ];
    });
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(';')).join('\r\n');
  downloadBlob(`kaffeekasse-${todayKey()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  showToast('CSV-Export gestartet.');
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
  showToast('JSON-Backup exportiert.');
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
  el.btnCancelBooking.addEventListener('click', closeBookingSheet);
  el.btnMarkBar.addEventListener('click', () => commitBooking('bar'));
  el.btnMarkPaypal.addEventListener('click', () => commitBooking('paypal'));

  el.btnOpenAdmin.addEventListener('click', () => requireAdminAccess(openAdminPanel));
  el.btnPinCancel.addEventListener('click', closePinOverlay);
  el.btnPinConfirm.addEventListener('click', confirmPin);
  el.pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmPin(); });

  el.btnCloseAdmin.addEventListener('click', closeAdminPanel);
  el.btnSavePrices.addEventListener('click', saveAdminPrices);
  el.btnSavePool.addEventListener('click', saveAdminPool);
  el.btnSavePin.addEventListener('click', saveAdminPin);
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
