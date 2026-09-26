// ============================================================================
// app.js — logica dell'interfaccia: card, form, dettaglio, stelle, filtri.
// ============================================================================

let restaurants = [];
let currentSort = 'data_desc';
let currentSearch = '';
let editingId = null;
let pendingPhotos = [];
let keptExistingUrls = [];
let removedExistingUrls = [];
let detailGallery = [];
let lbIndex = 0;
const ratingInputs = {};

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function formatDate(isoDate) {
  if (!isoDate) return 'Data non indicata';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Data non indicata';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}
function clampPct(v) {
  return Math.max(0, Math.min(100, v));
}
function starFgHTML(value) {
  return `<span class="star-fg" style="width:${clampPct((value / 5) * 100)}%">★★★★★</span>`;
}

let toastTimer = null;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------------- Star rating component (display + input) ---------------- */
function starRowMarkup() {
  return `<span class="star-row"><span class="star-bg">★★★★★</span>${starFgHTML(0)}</span>`;
}

function createStarInput(mountEl, initialValue, onChange) {
  mountEl.innerHTML = starRowMarkup();
  const row = mountEl.querySelector('.star-row');
  const fg = mountEl.querySelector('.star-fg');
  row.tabIndex = 0;
  row.setAttribute('role', 'slider');
  row.setAttribute('aria-valuemin', '0');
  row.setAttribute('aria-valuemax', '5');

  let value = initialValue || 0;

  function render() {
    fg.style.width = clampPct((value / 5) * 100) + '%';
    row.setAttribute('aria-valuenow', String(value));
  }
  function setFromClientX(clientX) {
    const rect = row.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    const raw = ratio * 5;
    value = Math.round(raw * 2) / 2;
    render();
    onChange(value);
  }
  row.addEventListener('click', (e) => setFromClientX(e.clientX));
  row.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      value = Math.min(5, value + 0.5);
      render();
      onChange(value);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      value = Math.max(0, value - 0.5);
      render();
      onChange(value);
    }
  });
  render();
  return {
    get: () => value,
    set: (v) => { value = v || 0; render(); },
  };
}

function initRatingInputs() {
  document.querySelectorAll('.rating-row').forEach((row) => {
    const cat = row.dataset.cat;
    const mount = row.querySelector('.star-input-mount');
    const valueEl = row.querySelector('.rating-value');
    ratingInputs[cat] = createStarInput(mount, 0, (v) => {
      valueEl.textContent = v.toFixed(1);
      updateMediaPreview();
    });
  });
}
function updateMediaPreview() {
  const vals = Object.values(ratingInputs).map((i) => i.get());
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  document.getElementById('form-media-value').textContent = avg.toFixed(1);
}

/* ---------------- Cards ---------------- */
function cardTemplate(r) {
  const cover = (r.foto_urls && r.foto_urls[0])
    ? `<img class="r-card-cover" src="${r.foto_urls[0]}" alt="${escapeHtml(r.nome)}" loading="lazy">`
    : `<div class="r-card-cover">🍽️</div>`;
  const voto = Number(r.voto_medio || 0);
  return `
    <article class="r-card" data-id="${r.id}">
      ${cover}
      <div class="r-card-body">
        <div class="r-card-name">${escapeHtml(r.nome)}</div>
        <div class="r-card-date">📅 ${formatDate(r.data_visita)}</div>
        <div class="r-card-footer">
          <div class="r-card-score">
            <span class="star-row small"><span class="star-bg">★★★★★</span>${starFgHTML(voto)}</span>
            <span class="r-card-score-num">${voto.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </article>`;
}

function getFilteredSorted() {
  let list = restaurants.slice();
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    list = list.filter((r) => r.nome.toLowerCase().includes(q));
  }
  switch (currentSort) {
    case 'data_desc': list.sort((a, b) => (b.data_visita || '').localeCompare(a.data_visita || '')); break;
    case 'data_asc': list.sort((a, b) => (a.data_visita || '').localeCompare(b.data_visita || '')); break;
    case 'voto_desc': list.sort((a, b) => Number(b.voto_medio || 0) - Number(a.voto_medio || 0)); break;
    case 'voto_asc': list.sort((a, b) => Number(a.voto_medio || 0) - Number(b.voto_medio || 0)); break;
    case 'nome_asc': list.sort((a, b) => a.nome.localeCompare(b.nome, 'it')); break;
  }
  return list;
}

function renderAll() {
  const list = getFilteredSorted();
  const grid = document.getElementById('grid');
  const emptyEl = document.getElementById('empty-state');

  grid.innerHTML = list.map(cardTemplate).join('');
  grid.hidden = list.length === 0;

  if (list.length === 0) {
    emptyEl.hidden = false;
    if (restaurants.length === 0) {
      emptyEl.querySelector('.empty-title').textContent = 'Ancora nessun ristorante';
      emptyEl.querySelector('.empty-sub').textContent = 'Premi il pulsante "+" per aggiungere la vostra prima cena da valutare.';
    } else {
      emptyEl.querySelector('.empty-title').textContent = 'Nessun risultato';
      emptyEl.querySelector('.empty-sub').textContent = 'Prova a modificare la ricerca.';
    }
  } else {
    emptyEl.hidden = true;
  }
  updateStats();
}

function updateStats() {
  document.getElementById('stat-count').textContent = restaurants.length;
  if (restaurants.length) {
    const avg = restaurants.reduce((s, r) => s + Number(r.voto_medio || 0), 0) / restaurants.length;
    document.getElementById('stat-avg').textContent = avg.toFixed(1);
    const best = restaurants.reduce((m, r) => (Number(r.voto_medio || 0) > Number(m.voto_medio || 0) ? r : m), restaurants[0]);
    document.getElementById('stat-best').textContent = Number(best.voto_medio || 0).toFixed(1);
  } else {
    document.getElementById('stat-avg').textContent = '–';
    document.getElementById('stat-best').textContent = '–';
  }
}

/* ---------------- Form (crea / modifica) ---------------- */
function showFormError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.hidden = false;
}
function hideFormError() {
  document.getElementById('form-error').hidden = true;
}

function renderPhotoPreview() {
  const grid = document.getElementById('photo-preview-grid');
  grid.innerHTML = '';
  keptExistingUrls.forEach((url, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${url}" alt=""><button type="button" class="photo-thumb-remove" data-kind="existing" data-idx="${idx}">✕</button>`;
    grid.appendChild(div);
  });
  pendingPhotos.forEach((file, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    const url = URL.createObjectURL(file);
    div.innerHTML = `<img src="${url}" alt=""><button type="button" class="photo-thumb-remove" data-kind="pending" data-idx="${idx}">✕</button>`;
    grid.appendChild(div);
  });
}

function openForm(restaurant) {
  editingId = restaurant ? restaurant.id : null;
  document.getElementById('form-title').textContent = restaurant ? 'Modifica ristorante' : 'Nuovo ristorante';
  document.getElementById('f-id').value = restaurant ? restaurant.id : '';
  document.getElementById('f-nome').value = restaurant ? restaurant.nome : '';
  document.getElementById('f-data').value = restaurant ? (restaurant.data_visita || '') : '';
  document.getElementById('f-descrizione').value = restaurant ? (restaurant.descrizione || '') : '';
  document.getElementById('f-note').value = restaurant ? (restaurant.note || '') : '';
  document.getElementById('f-autore').value = restaurant ? (restaurant.autore || '') : '';

  ratingInputs.location.set(restaurant ? Number(restaurant.voto_location) : 0);
  ratingInputs.menu.set(restaurant ? Number(restaurant.voto_menu) : 0);
  ratingInputs.servizio.set(restaurant ? Number(restaurant.voto_servizio) : 0);
  ratingInputs.prezzo.set(restaurant ? Number(restaurant.voto_prezzo) : 0);
  document.querySelectorAll('.rating-row').forEach((row) => {
    row.querySelector('.rating-value').textContent = ratingInputs[row.dataset.cat].get().toFixed(1);
  });
  updateMediaPreview();

  pendingPhotos = [];
  removedExistingUrls = [];
  keptExistingUrls = restaurant ? [...(restaurant.foto_urls || [])] : [];
  renderPhotoPreview();
  hideFormError();

  const modal = document.getElementById('form-modal');
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeForm() {
  const modal = document.getElementById('form-modal');
  modal.classList.remove('open');
  setTimeout(() => { modal.hidden = true; }, 250);
}

async function handleFormSubmit(e) {
  e.preventDefault();
  hideFormError();

  const nome = document.getElementById('f-nome').value.trim();
  if (!nome) {
    showFormError('Il nome del ristorante è obbligatorio.');
    return;
  }

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvataggio...';

  try {
    let uploadedUrls = [];
    if (pendingPhotos.length) {
      submitBtn.textContent = `Carico le foto (0/${pendingPhotos.length})...`;
      let done = 0;
      uploadedUrls = await DB.uploadFotos(pendingPhotos, () => {
        done += 1;
        submitBtn.textContent = `Carico le foto (${done}/${pendingPhotos.length})...`;
      });
    }
    submitBtn.textContent = 'Salvataggio...';

    const payload = {
      nome,
      data_visita: document.getElementById('f-data').value || null,
      descrizione: document.getElementById('f-descrizione').value.trim(),
      voto_location: ratingInputs.location.get(),
      voto_menu: ratingInputs.menu.get(),
      voto_servizio: ratingInputs.servizio.get(),
      voto_prezzo: ratingInputs.prezzo.get(),
      note: document.getElementById('f-note').value.trim(),
      foto_urls: [...keptExistingUrls, ...uploadedUrls],
      autore: document.getElementById('f-autore').value.trim(),
    };

    let saved;
    if (editingId) {
      saved = await DB.update(editingId, payload);
      restaurants = restaurants.map((r) => (r.id === editingId ? saved : r));
    } else {
      saved = await DB.create(payload);
      restaurants.push(saved);
    }

    if (removedExistingUrls.length) DB.deleteFotos(removedExistingUrls);
    removedExistingUrls = [];

    closeForm();
    renderAll();
    showToast(editingId ? '✅ Ristorante aggiornato' : '✅ Ristorante aggiunto');
  } catch (err) {
    console.error(err);
    showFormError(err.message || 'Errore durante il salvataggio. Riprova.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salva';
  }
}

/* ---------------- Dettaglio ---------------- */
function detailRatingRow(label, value) {
  const v = Number(value || 0);
  return `<div class="detail-rating-row">
    <span class="rating-label">${label}</span>
    <span class="star-row"><span class="star-bg">★★★★★</span>${starFgHTML(v)}</span>
    <span class="rating-value">${v.toFixed(1)}</span>
  </div>`;
}

function openDetail(r) {
  detailGallery = r.foto_urls || [];
  const gallery = detailGallery.length
    ? `<div class="detail-gallery">${detailGallery.map((u, i) => `<img src="${u}" data-idx="${i}" alt="foto ${i + 1}">`).join('')}</div>`
    : `<div class="detail-gallery-empty">🍽️</div>`;

  const content = document.getElementById('detail-content');
  content.innerHTML = `
    ${gallery}
    <div class="detail-hero">
      <h2 class="detail-name">${escapeHtml(r.nome)}</h2>
      <div class="detail-score-badge">
        <span class="detail-score-num">${Number(r.voto_medio || 0).toFixed(1)}</span>
        <span class="detail-score-label">Voto finale</span>
      </div>
    </div>
    <div class="detail-meta">
      <span>📅 ${formatDate(r.data_visita)}</span>
      ${r.autore ? `<span>👤 ${escapeHtml(r.autore)}</span>` : ''}
    </div>
    ${r.descrizione ? `<p class="detail-desc">${escapeHtml(r.descrizione)}</p>` : ''}
    <div class="detail-ratings">
      ${detailRatingRow('🏰 Location', r.voto_location)}
      ${detailRatingRow('📜 Menu', r.voto_menu)}
      ${detailRatingRow('🤵 Servizio', r.voto_servizio)}
      ${detailRatingRow('💶 Prezzo', r.voto_prezzo)}
    </div>
    ${r.note ? `<div>
      <div class="field-label" style="margin-bottom:.4rem;">Note personali</div>
      <div class="detail-note-box">${escapeHtml(r.note)}</div>
    </div>` : ''}
    <div class="detail-actions">
      <button type="button" class="btn-secondary" id="detail-edit-btn">✏️ Modifica</button>
      <button type="button" class="btn-danger" id="detail-delete-btn">🗑️ Elimina</button>
    </div>
  `;

  content.querySelector('#detail-edit-btn').addEventListener('click', () => {
    closeDetail();
    setTimeout(() => openForm(r), 200);
  });
  content.querySelector('#detail-delete-btn').addEventListener('click', () => handleDelete(r));
  content.querySelectorAll('.detail-gallery img').forEach((img) => {
    img.addEventListener('click', () => openLightbox(parseInt(img.dataset.idx, 10)));
  });

  const modal = document.getElementById('detail-modal');
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeDetail() {
  const modal = document.getElementById('detail-modal');
  modal.classList.remove('open');
  setTimeout(() => { modal.hidden = true; }, 250);
}

async function handleDelete(r) {
  if (!confirm(`Eliminare "${r.nome}" dalla lista? L'operazione non è reversibile.`)) return;
  try {
    await DB.remove(r.id);
    restaurants = restaurants.filter((x) => x.id !== r.id);
    closeDetail();
    renderAll();
    showToast('🗑️ Ristorante eliminato');
    if (r.foto_urls && r.foto_urls.length) DB.deleteFotos(r.foto_urls);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Errore durante l'eliminazione", true);
  }
}

/* ---------------- Lightbox ---------------- */
function openLightbox(idx) {
  lbIndex = idx;
  renderLightbox();
  document.getElementById('lightbox').classList.add('open');
}
function renderLightbox() {
  document.getElementById('lightbox-img').src = detailGallery[lbIndex];
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

/* ---------------- Dati ---------------- */
async function loadData() {
  document.getElementById('loading-state').hidden = false;
  document.getElementById('grid').hidden = true;
  document.getElementById('empty-state').hidden = true;
  try {
    restaurants = await DB.list();
    renderAll();
  } catch (err) {
    console.error(err);
    showToast('Errore nel caricamento dei dati: ' + (err.message || ''), true);
  } finally {
    document.getElementById('loading-state').hidden = true;
  }
}

/* ---------------- Auth screens ---------------- */
function showApp() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app').hidden = false;
  loadData();
}
function showLogin() {
  document.getElementById('app').hidden = true;
  document.getElementById('login-screen').hidden = false;
}

/* ---------------- Wiring ---------------- */
function wireEvents() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit');
    const errEl = document.getElementById('login-error');
    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Accesso...';
    try {
      await Auth.login(
        document.getElementById('login-email').value.trim(),
        document.getElementById('login-password').value
      );
    } catch (err) {
      errEl.textContent = 'Email o password non corrette.';
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Accedi';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await Auth.logout();
  });

  document.getElementById('fab-add').addEventListener('click', () => openForm(null));
  document.getElementById('form-close').addEventListener('click', closeForm);
  document.getElementById('form-cancel').addEventListener('click', closeForm);
  document.getElementById('form-modal').addEventListener('click', (e) => {
    if (e.target.id === 'form-modal') closeForm();
  });
  document.getElementById('restaurant-form').addEventListener('submit', handleFormSubmit);

  document.getElementById('photo-drop').addEventListener('click', () => document.getElementById('f-foto').click());
  document.getElementById('f-foto').addEventListener('change', (e) => {
    pendingPhotos.push(...Array.from(e.target.files));
    renderPhotoPreview();
    e.target.value = '';
  });
  document.getElementById('photo-preview-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.photo-thumb-remove');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if (btn.dataset.kind === 'existing') {
      removedExistingUrls.push(keptExistingUrls[idx]);
      keptExistingUrls.splice(idx, 1);
    } else {
      pendingPhotos.splice(idx, 1);
    }
    renderPhotoPreview();
  });

  document.getElementById('grid').addEventListener('click', (e) => {
    const card = e.target.closest('.r-card');
    if (!card) return;
    const r = restaurants.find((x) => x.id === card.dataset.id);
    if (r) openDetail(r);
  });
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeDetail();
  });

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.getElementById('lb-prev').addEventListener('click', () => {
    lbIndex = (lbIndex - 1 + detailGallery.length) % detailGallery.length;
    renderLightbox();
  });
  document.getElementById('lb-next').addEventListener('click', () => {
    lbIndex = (lbIndex + 1) % detailGallery.length;
    renderLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') document.getElementById('lb-prev').click();
    if (e.key === 'ArrowRight') document.getElementById('lb-next').click();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderAll();
  });
  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAll();
  });
}

/* ---------------- Init ---------------- */
(async function init() {
  initRatingInputs();
  wireEvents();

  Auth.onChange((user) => {
    document.getElementById('splash').hidden = true;
    if (user) showApp();
    else showLogin();
  });
  await Auth.init();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
})();
