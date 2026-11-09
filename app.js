import { CATALOG, LOTTERIES, DEFAULT_STATE, RATES, compute, fmtShort } from './calc.js';

const $ = (sel, root = document) => root.querySelector(sel);
const clone = (o) => JSON.parse(JSON.stringify(o));
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const pct = (x, d = 1) => `${(x * 100).toFixed(d).replace('.', ',')} %`;

// ---------- Exemples ----------
const PRESETS = [
  {
    id: 'rentier', label: 'Rentier tranquille',
    state: { mode: 'revenu', revenuMensuel: 5_000, achatsImmediats: 300_000, hyp: { horizon: 'age' } },
  },
  {
    id: 'famille', label: 'Famille au soleil',
    state: {
      mode: 'vie', adultes: 2, enfants: 3, rp: 'archi', secondaires: { villa: 1 }, yacht: 'voilier',
      voitures: { suv: 1, citadine: 1 }, voyagesNb: 5, voyagesGamme: 'premium',
      personnel: { nounou: 1, menage: 1 }, ecole: 'internationale', vieMensuelle: 8_000, donEnfant: 200_000, donsAnnuels: 5_000,
    },
  },
  {
    id: 'jetset', label: 'Jet-set',
    state: {
      mode: 'vie', adultes: 2, enfants: 2, rp: 'hotel', secondaires: { paris: 1, chalet: 1, villa: 1 }, yacht: 'yacht24',
      voitures: { sportive: 2, suv: 1 }, voyagesNb: 8, voyagesGamme: 'palace',
      personnel: { chef: 1, chauffeur: 1, majordome: 1, menage: 2, nounou: 1 }, ecole: 'suisse', vieMensuelle: 25_000,
      donEnfant: 1_000_000, donsAnnuels: 50_000,
    },
  },
  {
    id: 'oligarque', label: 'Oligarque',
    state: {
      mode: 'vie', adultes: 2, enfants: 4, rp: 'chateau', secondaires: { ile: 1, villa: 2, chalet: 1, paris: 1 }, yacht: 'giga90',
      voitures: { hyper: 2, sportive: 3, suv: 2 }, voyagesNb: 12, voyagesGamme: 'jet',
      personnel: { chef: 2, chauffeur: 2, majordome: 1, menage: 4, nounou: 2, jardinier: 3, securite: 4 },
      ecole: 'suisse', vieMensuelle: 100_000, donEnfant: 20_000_000, donsAnnuels: 1_000_000, hyp: { horizon: 'perpetuel' },
    },
  },
];

// ---------- État ----------
let state = loadState();

function loadState() {
  try {
    const h = location.hash.slice(1);
    if (h.startsWith('s=')) {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(h.slice(2)))));
      return merge(clone(DEFAULT_STATE), parsed);
    }
  } catch { /* lien invalide : on repart des valeurs par défaut */ }
  return clone(DEFAULT_STATE);
}
function merge(base, over) {
  const out = { ...base, ...over, hyp: { ...base.hyp, ...(over.hyp || {}) } };
  for (const k of ['secondaires', 'voitures', 'personnel']) if (over[k]) out[k] = { ...over[k] };
  return out;
}
function applyPreset(p) {
  const base = clone(DEFAULT_STATE);
  base.secondaires = {}; base.voitures = {}; base.personnel = {};
  state = merge(base, p.state);
  renderForm();
  update();
}

// ---------- Curseurs à paliers ----------
const LOG_REVENU = { min: 1_000, max: 500_000 };
const revenuToT = (v) => Math.round((Math.log(v / LOG_REVENU.min) / Math.log(LOG_REVENU.max / LOG_REVENU.min)) * 1000);
const tToRevenu = (t) => {
  const v = LOG_REVENU.min * Math.pow(LOG_REVENU.max / LOG_REVENU.min, t / 1000);
  const step = v < 10_000 ? 100 : v < 50_000 ? 500 : v < 200_000 ? 1_000 : 5_000;
  return Math.round(v / step) * step;
};
const STEPS = {
  achatsImmediats: [0, 20_000, 50_000, 100_000, 200_000, 300_000, 500_000, 750_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000],
  donEnfant: [0, 50_000, 100_000, 200_000, 300_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000],
  donsAnnuels: [0, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000],
};
const nearestIndex = (arr, v) => arr.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(arr[best] - v) ? i : best), 0);

// ---------- Composants de formulaire ----------
function group(title, hint, inner) {
  return `<fieldset class="group"><legend>${title}</legend>${hint ? `<p class="hint">${hint}</p>` : ''}${inner}</fieldset>`;
}
function choices(name, items, selected, priceOf) {
  return `<div class="choices">${items.map((it) => `
    <label class="choice">
      <input type="radio" name="${name}" value="${it.id}" ${it.id === selected ? 'checked' : ''} data-key="${name}">
      <span class="choice-label">${it.label}</span>
      <span class="choice-price">${priceOf(it)}</span>
    </label>`).join('')}</div>`;
}
function steppers(key, items, qty, priceOf, max = 9) {
  return `<ul class="steppers">${items.map((it) => {
    const q = qty[it.id] || 0;
    return `<li class="stepper ${q > 0 ? 'on' : ''}">
      <span class="stepper-text"><span class="stepper-label">${it.label}</span><span class="stepper-price">${priceOf(it)}</span></span>
      <span class="stepper-ctrl">
        <button type="button" aria-label="Retirer : ${it.label}" data-step="${key}:${it.id}:-1" ${q <= 0 ? 'disabled' : ''}>−</button>
        <output aria-label="Quantité : ${it.label}">${q}</output>
        <button type="button" aria-label="Ajouter : ${it.label}" data-step="${key}:${it.id}:1" ${q >= max ? 'disabled' : ''}>+</button>
      </span>
    </li>`;
  }).join('')}</ul>`;
}
function counter(key, label, value, min, max) {
  return `<div class="counter">
    <span class="counter-label">${label}</span>
    <span class="stepper-ctrl">
      <button type="button" aria-label="Moins : ${label}" data-count="${key}:-1" ${value <= min ? 'disabled' : ''}>−</button>
      <output>${value}</output>
      <button type="button" aria-label="Plus : ${label}" data-count="${key}:1" ${value >= max ? 'disabled' : ''}>+</button>
    </span>
  </div>`;
}
function slider({ key, label, min, max, step, value, display, kind = 'linear' }) {
  const id = `f-${key.replace('.', '-')}`;
  return `<div class="slider">
    <label for="${id}"><span>${label}</span><output id="${id}-out">${display}</output></label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-slider="${key}" data-kind="${kind}">
  </div>`;
}

// ---------- Rendu du formulaire ----------
function renderForm() {
  $('#presets').innerHTML = PRESETS.map((p) => `<button type="button" class="preset" data-preset="${p.id}">${p.label}</button>`).join('');

  for (const btn of document.querySelectorAll('[role=tab]')) {
    const active = btn.dataset.mode === state.mode;
    btn.setAttribute('aria-selected', active);
    btn.tabIndex = active ? 0 : -1;
  }
  $('#panel-revenu').hidden = state.mode !== 'revenu';
  $('#panel-vie').hidden = state.mode !== 'vie';

  $('#panel-revenu').innerHTML =
    group('Le revenu que vous voulez toucher', 'Net, après impôts, chaque mois, en euros d\'aujourd\'hui : il suit l\'inflation.',
      `<div class="big-slider">${slider({ key: 'revenuMensuel', label: 'Par mois', min: 0, max: 1000, step: 1, value: revenuToT(state.revenuMensuel), display: eur.format(state.revenuMensuel), kind: 'revenu' })}</div>
       <p class="hint compare" id="revenu-compare"></p>`) +
    group('Vos achats du premier jour', 'Rembourser le crédit, une maison, des cadeaux aux proches : tout ce que vous dépensez d\'un coup.',
      slider({ key: 'achatsImmediats', label: 'Montant', min: 0, max: STEPS.achatsImmediats.length - 1, step: 1, value: nearestIndex(STEPS.achatsImmediats, state.achatsImmediats), display: eur.format(state.achatsImmediats), kind: 'steps' }));

  const people = (s) => s.adultes + s.enfants * RATES.childTravelFactor;
  const v = CATALOG.voyages;
  $('#panel-vie').innerHTML =
    group('Le foyer', null,
      `<div class="counters">${counter('adultes', 'Adultes', state.adultes, 1, 2)}${counter('enfants', 'Enfants', state.enfants, 0, 8)}</div>`) +
    group('Où vivre', 'Prix d\'achat, frais de notaire en plus. L\'entretien et la taxe foncière sont comptés chaque année.',
      `<h3 class="sub">Résidence principale</h3>` +
      choices('rp', CATALOG.rp, state.rp, (it) => it.price ? fmtShort(it.price) : 'déjà à vous') +
      `<h3 class="sub">Résidences secondaires</h3>` +
      steppers('secondaires', CATALOG.secondaires, state.secondaires, (it) => fmtShort(it.price), 5)) +
    group('Sur l\'eau et sur la route', 'Un bateau coûte environ 10 % de son prix chaque année. Les voitures sont renouvelées tous les cinq ans.',
      `<h3 class="sub">Bateau</h3>` +
      choices('yacht', CATALOG.yacht, state.yacht, (it) => it.price ? fmtShort(it.price) : '—') +
      `<h3 class="sub">Garage</h3>` +
      steppers('voitures', CATALOG.voitures, state.voitures, (it) => fmtShort(it.price))) +
    group('Voyager', `Pour ${state.adultes} adulte${state.adultes > 1 ? 's' : ''}${state.enfants ? ` et ${state.enfants} enfant${state.enfants > 1 ? 's' : ''}` : ''}, prix par voyage d'une à deux semaines.`,
      slider({ key: 'voyagesNb', label: 'Voyages par an', min: 0, max: 24, step: 1, value: state.voyagesNb, display: state.voyagesNb }) +
      choices('voyagesGamme', v, state.voyagesGamme, (it) => `${it.hint} · ${fmtShort(it.perPerson * people(state) + it.flat)}`)) +
    group('Les gens qui vous aident', 'Salaire annuel chargé, par personne.',
      steppers('personnel', CATALOG.personnel, state.personnel, (it) => `${fmtShort(it.salary)}/an`)) +
    (state.enfants > 0 ? group('L\'école des enfants', `Provisionnée pour ${RATES.schoolYears} ans de scolarité par enfant.`,
      choices('ecole', CATALOG.ecole, state.ecole, (it) => it.perYear ? `${fmtShort(it.perYear)}/an` : 'gratuit')) : '') +
    group('Le quotidien', 'Courses, sorties, vêtements, loisirs, abonnements…',
      slider({ key: 'vieMensuelle', label: 'Budget mensuel', min: 1_000, max: 150_000, step: 500, value: state.vieMensuelle, display: eur.format(state.vieMensuelle) })) +
    group('Transmettre et partager', state.enfants > 0 ? 'Chaque parent peut donner 100 000 € par enfant sans droits ; au-delà, le barème s\'applique.' : 'Les dons annuels sont comptés sans réduction d\'impôt.',
      (state.enfants > 0 ? slider({ key: 'donEnfant', label: 'Donation à chaque enfant', min: 0, max: STEPS.donEnfant.length - 1, step: 1, value: nearestIndex(STEPS.donEnfant, state.donEnfant), display: eur.format(state.donEnfant), kind: 'steps' }) : '') +
      slider({ key: 'donsAnnuels', label: 'Dons à des associations, par an', min: 0, max: STEPS.donsAnnuels.length - 1, step: 1, value: nearestIndex(STEPS.donsAnnuels, state.donsAnnuels), display: eur.format(state.donsAnnuels), kind: 'steps' }));

  const h = state.hyp;
  $('#hyp-body').innerHTML =
    slider({ key: 'hyp.rendement', label: 'Rendement annuel des placements', min: 1, max: 10, step: 0.5, value: h.rendement, display: `${String(h.rendement).replace('.', ',')} %` }) +
    slider({ key: 'hyp.fiscalite', label: 'Impôt sur les gains (flat tax)', min: 0, max: 50, step: 0.1, value: h.fiscalite, display: `${String(h.fiscalite).replace('.', ',')} %` }) +
    slider({ key: 'hyp.inflation', label: 'Inflation', min: 0, max: 5, step: 0.5, value: h.inflation, display: `${String(h.inflation).replace('.', ',')} %` }) +
    slider({ key: 'hyp.age', label: 'Votre âge', min: 18, max: 90, step: 1, value: h.age, display: `${h.age} ans` }) +
    `<div class="horizon" role="radiogroup" aria-label="Durée de la rente">
      <label class="choice"><input type="radio" name="horizon" value="age" ${h.horizon === 'age' ? 'checked' : ''} data-key="hyp.horizon"><span class="choice-label">Consommer le capital jusqu'à un âge</span></label>
      <label class="choice"><input type="radio" name="horizon" value="perpetuel" ${h.horizon === 'perpetuel' ? 'checked' : ''} data-key="hyp.horizon"><span class="choice-label">Ne jamais entamer le capital</span></label>
    </div>` +
    (h.horizon === 'age' ? slider({ key: 'hyp.ageFin', label: 'Jusqu\'à', min: Math.max(h.age + 1, 50), max: 110, step: 1, value: Math.max(h.ageFin, h.age + 1), display: `${Math.max(h.ageFin, h.age + 1)} ans` }) : '') +
    slider({ key: 'hyp.marge', label: 'Marge de sécurité', min: 0, max: 30, step: 5, value: h.marge, display: `${h.marge} %` });
}

// ---------- Lecture des contrôles ----------
function setPath(path, value) {
  if (path.startsWith('hyp.')) state.hyp[path.slice(4)] = value;
  else state[path] = value;
}
function sliderValue(input) {
  const raw = Number(input.value);
  const key = input.dataset.slider;
  if (input.dataset.kind === 'revenu') return tToRevenu(raw);
  if (input.dataset.kind === 'steps') return STEPS[key][raw];
  return raw;
}
function displayFor(key, v) {
  if (['revenuMensuel', 'achatsImmediats', 'vieMensuelle', 'donEnfant', 'donsAnnuels'].includes(key)) return eur.format(v);
  if (key === 'hyp.age' || key === 'hyp.ageFin') return `${v} ans`;
  if (key.startsWith('hyp.')) return `${String(v).replace('.', ',')} %`;
  return String(v);
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset.slider) return;
  const key = t.dataset.slider;
  const v = sliderValue(t);
  setPath(key, v);
  $(`#${t.id}-out`).textContent = displayFor(key, v);
  if (key === 'hyp.age' && state.hyp.ageFin <= v) state.hyp.ageFin = v + 1;
  update();
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.slider) {
    // le voyage dépend du foyer ; l'âge fixe la borne de l'horizon
    if (['hyp.age'].includes(t.dataset.slider)) rerenderKeepingFocus(t.id);
    return;
  }
  if (t.dataset.key) {
    setPath(t.dataset.key, t.value);
    if (t.dataset.key === 'hyp.horizon') rerenderKeepingFocus(t.id || null, `input[name=horizon][value=${t.value}]`);
    update();
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.mode) { state.mode = b.dataset.mode; renderForm(); update(); b.focus(); return; }
  if (b.dataset.preset) { applyPreset(PRESETS.find((p) => p.id === b.dataset.preset)); return; }
  if (b.dataset.step) {
    const [key, id, d] = b.dataset.step.split(':');
    const max = key === 'secondaires' ? 5 : 9;
    const q = Math.min(max, Math.max(0, (state[key][id] || 0) + Number(d)));
    state[key] = { ...state[key], [id]: q };
    rerenderKeepingFocus(null, `[data-step="${b.dataset.step}"]`, `[data-step="${key}:${id}:${-Number(d)}"]`);
    update();
    return;
  }
  if (b.dataset.count) {
    const [key, d] = b.dataset.count.split(':');
    const lim = key === 'adultes' ? [1, 2] : [0, 8];
    state[key] = Math.min(lim[1], Math.max(lim[0], state[key] + Number(d)));
    rerenderKeepingFocus(null, `[data-count="${b.dataset.count}"]`, `[data-count="${key}:${-Number(d)}"]`);
    update();
  }
});
// navigation clavier entre les onglets
document.querySelector('.mode-switch').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  state.mode = state.mode === 'revenu' ? 'vie' : 'revenu';
  renderForm(); update();
  $(`#tab-${state.mode}`).focus();
});

function rerenderKeepingFocus(id, ...selectors) {
  renderForm();
  const el = (id && document.getElementById(id)) || selectors.map((s) => $(s)).find((x) => x && !x.disabled);
  if (el) el.focus({ preventScroll: true });
}

// ---------- Rendu du résultat ----------
let lastBalls = '';
function splitDisplay(total) {
  if (!Number.isFinite(total)) return { digits: '∞', unit: '' };
  let v, unit;
  if (total >= 1e9) { v = total / 1e9; unit = 'Md€'; }
  else if (total >= 1e6) { v = total / 1e6; unit = 'M€'; }
  else { v = total / 1e3; unit = 'k€'; }
  const d = v >= 100 ? 0 : 1;
  let s = v.toFixed(d);
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return { digits: s.replace('.', ','), unit };
}

function renderBalls(total) {
  const { digits, unit } = splitDisplay(total);
  const key = digits + unit;
  const prev = lastBalls;
  lastBalls = key;
  const parts = [...digits].map((ch, i) => {
    if (ch === ',') return '<span class="comma">,</span>';
    const changed = prev[i] !== ch ? ' roll' : '';
    return `<span class="ball${changed}">${ch}</span>`;
  });
  if (unit) parts.push(`<span class="ball chance${prev.endsWith(unit) ? '' : ' roll'}">${unit}</span>`);
  $('#balls').innerHTML = parts.join('');
}

function update() {
  const r = compute(state);
  history.replaceState(null, '', `#s=${btoa(unescape(encodeURIComponent(JSON.stringify(state))))}`);

  renderBalls(r.total);
  $('#exact').textContent = Number.isFinite(r.total) ? `soit ${eur.format(Math.round(r.total / 1000) * 1000)}` : 'aucun jackpot ne suffit avec ces hypothèses';
  $('#dock-amount').textContent = Number.isFinite(r.total) ? fmtShort(r.total) : '∞';

  // Barre de composition
  if (Number.isFinite(r.total) && r.total > 0) {
    const seg = [
      { cls: 'seg-achats', label: 'Achats du premier jour', v: r.oneOffTotal },
      { cls: 'seg-rente', label: 'Capital placé pour vos dépenses', v: r.capitalRente },
      { cls: 'seg-marge', label: 'Marge de sécurité', v: r.marge },
    ].filter((s) => s.v > 0);
    $('#split').innerHTML =
      `<div class="split-bar">${seg.map((s) => `<span class="${s.cls}" style="flex-grow:${s.v}"></span>`).join('')}</div>
       <ul class="split-legend">${seg.map((s) => `<li><span class="dot ${s.cls}"></span>${s.label}<b>${fmtShort(s.v)}</b></li>`).join('')}</ul>`;
  } else $('#split').innerHTML = '';

  const h = r.state.hyp;
  if (!Number.isFinite(r.total)) {
    $('#rente').textContent = '';
  } else if (r.annualTotal > 0) {
    const until = h.horizon === 'perpetuel' ? 'pour toujours, sans entamer le capital' : `jusqu'à vos ${h.ageFin} ans`;
    $('#rente').innerHTML = `Placé à ${String(h.rendement).replace('.', ',')} %, le capital vous verse <b>${eur.format(Math.round(r.monthly / 10) * 10)}</b> net par mois, revalorisés avec l'inflation, ${until}.`;
  } else $('#rente').textContent = '';

  // Comparaison du revenu
  const cmp = $('#revenu-compare');
  if (cmp) {
    const smic = 1_443; // SMIC net mensuel approximatif
    cmp.textContent = `Soit ${(state.revenuMensuel / smic).toFixed(1).replace('.', ',')} fois le SMIC net.`;
  }

  renderVerdict(r);
  renderOdds(r);
  renderBreakdown(r);
}

function renderVerdict(r) {
  const L = LOTTERIES.loto, E = LOTTERIES.euro, lv = r.lottery;
  let title, body, game;
  switch (lv.tier) {
    case 'loto-min':
      game = 'loto';
      title = 'Le premier jackpot du Loto suffit';
      body = `Le jackpot de départ du Loto, ${fmtShort(L.minJackpot)}, couvre votre projet${r.total > 0 ? ` et laisse ${fmtShort(L.minJackpot - r.total)} de côté` : ''}. Il ne reste qu'à cocher les bons numéros.`;
      break;
    case 'loto': {
      game = 'loto';
      const weeks = Math.ceil(lv.loto.rollovers / L.drawsPerWeek);
      title = 'Un gros Loto fera l\'affaire';
      body = `Il faut une cagnotte restée sans gagnant pendant ${lv.loto.rollovers} tirage${lv.loto.rollovers > 1 ? 's' : ''} d'affilée, soit environ ${weeks} semaine${weeks > 1 ? 's' : ''}. Le plus gros jackpot du Loto connu à ce jour est de ${fmtShort(L.record)}.`;
      break;
    }
    case 'euro':
      game = 'euro';
      title = 'Il vous faut l\'EuroMillions';
      body = `Le Loto n'a jamais versé plus de ${fmtShort(L.record)}. Votre projet demande un jackpot EuroMillions à ${pct(r.total / E.cap, 0)} de son plafond de ${fmtShort(E.cap)}.`;
      break;
    case 'au-dela':
      game = 'euro';
      title = 'Même l\'EuroMillions ne suffit pas';
      body = `Il faudrait remporter ${lv.euroJackpots.toFixed(1).replace('.', ',')} jackpots EuroMillions au plafond de ${fmtShort(E.cap)}. Revoyez la taille du bateau, ou trouvez des associés.`;
      break;
    default:
      game = 'loto';
      title = 'Aucun jackpot ne suffit';
      body = 'Avec ces hypothèses, le rendement après impôts ne couvre pas l\'inflation : un capital placé ne peut pas verser une rente éternelle. Augmentez le rendement ou choisissez de consommer le capital jusqu\'à un âge.';
  }
  r.game = game;
  $('#verdict').className = `verdict tier-${lv.tier}`;
  $('#verdict').innerHTML = `<h2>${title}</h2><p>${body}</p>`;
}

function renderOdds(r) {
  const g = r.game === 'euro' ? LOTTERIES.euro : LOTTERIES.loto;
  const data = r.game === 'euro' ? r.lottery.euro : r.lottery.loto;
  const allCost = data.costAllCombos;
  const vs = Number.isFinite(r.total)
    ? (allCost > r.total ? `, plus que les ${fmtShort(r.total)} que vous visez` : `, moins que les ${fmtShort(r.total)} que vous visez — mais il faudrait être seul gagnant`)
    : '';
  $('#odds').innerHTML = `
    <h2>Vos chances au ${g.name}</h2>
    <ul>
      <li><b>1 sur ${num.format(g.odds)}</b> de gagner le jackpot avec une grille à ${String(g.price.toFixed(2)).replace('.', ',')} €.</li>
      <li>En jouant une grille à chaque tirage (${g.drawsPerWeek} par semaine), vous gagneriez en moyenne au bout de <b>${num.format(Math.round(data.yearsToWin))} ans</b>.</li>
      <li>Jouer toutes les combinaisons d'un tirage coûterait <b>${fmtShort(allCost)}</b>${vs}.</li>
    </ul>`;
}

function renderBreakdown(r) {
  const rows = (list) => list.map((x) => `<tr><th scope="row">${x.label}</th><td>${eur.format(Math.round(x.amount))}</td></tr>`).join('');
  const h = r.state.hyp;
  const horizon = h.horizon === 'perpetuel' ? 'sans jamais entamer le capital' : `pendant ${r.years} ans`;
  $('#breakdown-body').innerHTML = `
    ${r.oneOff.length ? `<table><caption>À payer une fois</caption><tbody>${rows(r.oneOff)}</tbody>
      <tfoot><tr><th scope="row">Total</th><td>${eur.format(Math.round(r.oneOffTotal))}</td></tr></tfoot></table>` : ''}
    ${r.annual.length ? `<table><caption>Chaque année</caption><tbody>${rows(r.annual)}</tbody>
      <tfoot><tr><th scope="row">Total</th><td>${eur.format(Math.round(r.annualTotal))}</td></tr></tfoot></table>` : ''}
    <table><caption>Le jackpot</caption><tbody>
      <tr><th scope="row">Achats du premier jour</th><td>${eur.format(Math.round(r.oneOffTotal))}</td></tr>
      <tr><th scope="row">Capital placé pour verser ${fmtShort(r.annualTotal)} par an ${horizon}</th><td>${Number.isFinite(r.capitalRente) ? eur.format(Math.round(r.capitalRente)) : '∞'}</td></tr>
      <tr><th scope="row">Marge de sécurité (${h.marge} %)</th><td>${Number.isFinite(r.marge) ? eur.format(Math.round(r.marge)) : '∞'}</td></tr>
    </tbody><tfoot><tr><th scope="row">Jackpot nécessaire</th><td>${Number.isFinite(r.total) ? eur.format(Math.round(r.total)) : '∞'}</td></tr></tfoot></table>
    <p class="hint">Rendement réel après impôts et inflation : ${pct(r.realRate, 2)} par an.</p>`;
}

// ---------- Partage ----------
$('#share').addEventListener('click', async () => {
  const btn = $('#share');
  try {
    await navigator.clipboard.writeText(location.href);
    btn.textContent = 'Lien copié';
  } catch {
    btn.textContent = 'Copiez l\'adresse de la page';
  }
  setTimeout(() => { btn.textContent = 'Copier le lien de ma simulation'; }, 2200);
});

// ---------- Barre mobile ----------
const dock = $('#dock');
new IntersectionObserver(([entry]) => {
  dock.classList.toggle('visible', !entry.isIntersecting);
}).observe($('#ticket'));
dock.addEventListener('click', () => $('#ticket').scrollIntoView({ behavior: 'smooth', block: 'start' }));

renderForm();
update();
