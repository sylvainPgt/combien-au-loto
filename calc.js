// Moteur de calcul — aucun accès au DOM, testable avec Node.
// Tous les montants sont en euros d'aujourd'hui (ordres de grandeur, pas des devis).

export const CATALOG = {
  rp: [
    { id: 'aucune', label: 'Je garde mon logement', price: 0 },
    { id: 'famille', label: 'Maison familiale avec jardin', price: 700_000 },
    { id: 'archi', label: "Maison d'architecte avec piscine", price: 1_800_000 },
    { id: 'hotel', label: 'Hôtel particulier en centre-ville', price: 6_000_000 },
    { id: 'chateau', label: 'Château avec domaine', price: 12_000_000 },
  ],
  secondaires: [
    { id: 'campagne', label: 'Longère à la campagne', price: 450_000 },
    { id: 'paris', label: 'Pied-à-terre à Paris', price: 1_600_000 },
    { id: 'chalet', label: 'Chalet à Megève', price: 3_500_000 },
    { id: 'villa', label: "Villa sur la Côte d'Azur", price: 7_000_000 },
    { id: 'ile', label: 'Île privée aux Caraïbes', price: 15_000_000 },
  ],
  yacht: [
    { id: 'aucun', label: 'Pas de bateau', price: 0 },
    { id: 'voilier', label: 'Voilier de 12 m', price: 350_000 },
    { id: 'yacht24', label: 'Yacht à moteur de 24 m', price: 5_000_000 },
    { id: 'super50', label: 'Superyacht de 50 m', price: 40_000_000 },
    { id: 'giga90', label: 'Gigayacht de 90 m', price: 250_000_000 },
  ],
  voitures: [
    { id: 'citadine', label: 'Citadine électrique', price: 35_000 },
    { id: 'suv', label: 'SUV premium', price: 90_000 },
    { id: 'sportive', label: 'Sportive italienne', price: 280_000 },
    { id: 'hyper', label: 'Hypercar', price: 3_000_000 },
  ],
  voyages: [
    { id: 'classique', label: 'Classique', hint: 'vols éco, hôtels 3★', perPerson: 1_500, flat: 0 },
    { id: 'premium', label: 'Premium', hint: 'classe affaires, 4★', perPerson: 4_500, flat: 0 },
    { id: 'palace', label: 'Palace', hint: 'first class, suites 5★', perPerson: 14_000, flat: 0 },
    { id: 'jet', label: 'Jet privé', hint: 'jet + palaces', perPerson: 14_000, flat: 70_000 },
  ],
  personnel: [
    { id: 'menage', label: 'Aide ménagère', salary: 35_000 },
    { id: 'nounou', label: 'Nounou', salary: 45_000 },
    { id: 'jardinier', label: 'Jardinier', salary: 40_000 },
    { id: 'chauffeur', label: 'Chauffeur', salary: 55_000 },
    { id: 'chef', label: 'Chef à domicile', salary: 75_000 },
    { id: 'majordome', label: 'Majordome', salary: 85_000 },
    { id: 'securite', label: 'Garde du corps', salary: 95_000 },
  ],
  ecole: [
    { id: 'publique', label: 'École publique', perYear: 0 },
    { id: 'privee', label: 'Privé sous contrat', perYear: 3_000 },
    { id: 'internationale', label: 'École internationale', perYear: 25_000 },
    { id: 'suisse', label: 'Pensionnat suisse', perYear: 130_000 },
  ],
};

export const RATES = {
  notaire: 0.08,            // frais d'acquisition dans l'ancien
  upkeepRp: 0.025,          // taxe foncière, entretien, assurance, énergie
  upkeepSecondaire: 0.03,
  yachtRunning: 0.10,       // équipage, place de port, assurance, entretien
  carAnnual: 0.20,          // renouvellement, assurance, entretien
  childTravelFactor: 0.75,  // un enfant coûte ~75 % d'un adulte en voyage
  schoolYears: 15,
};

export const LOTTERIES = {
  loto: { name: 'Loto', odds: 19_068_840, price: 2.2, drawsPerWeek: 3, minJackpot: 2_000_000, step: 1_000_000, record: 30_000_000 },
  euro: { name: 'EuroMillions', odds: 139_838_160, price: 2.5, drawsPerWeek: 2, minJackpot: 17_000_000, cap: 250_000_000 },
};

export const DEFAULT_STATE = {
  mode: 'vie',
  revenuMensuel: 8_000,
  achatsImmediats: 0,
  adultes: 2,
  enfants: 2,
  rp: 'archi',
  secondaires: { chalet: 1 },
  yacht: 'aucun',
  voitures: { suv: 1, citadine: 1 },
  voyagesNb: 4,
  voyagesGamme: 'premium',
  personnel: { menage: 1 },
  ecole: 'privee',
  vieMensuelle: 6_000,
  donEnfant: 0,
  donsAnnuels: 0,
  hyp: { rendement: 5, inflation: 2, fiscalite: 31.4, age: 40, horizon: 'age', ageFin: 95, marge: 10 },
};

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
const qtyEntries = (list, qty = {}) =>
  list.filter((x) => (qty[x.id] || 0) > 0).map((x) => ({ ...x, qty: qty[x.id] }));

// Barème des droits de donation en ligne directe (après abattement de 100 000 €).
const DONATION_BRACKETS = [
  [8_072, 0.05], [12_109, 0.10], [15_932, 0.15], [552_324, 0.20],
  [902_838, 0.30], [1_805_677, 0.40], [Infinity, 0.45],
];
export function donationTax(taxable) {
  let tax = 0, prev = 0;
  for (const [cap, rate] of DONATION_BRACKETS) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, cap) - prev) * rate;
    prev = cap;
  }
  return tax;
}

// Barème de l'IFI (patrimoine immobilier net taxable > 1,3 M€).
const IFI_BRACKETS = [
  [800_000, 0], [1_300_000, 0.005], [2_570_000, 0.007], [5_000_000, 0.01],
  [10_000_000, 0.0125], [Infinity, 0.015],
];
export function ifi(base) {
  if (base <= 1_300_000) return 0;
  let tax = 0, prev = 0;
  for (const [cap, rate] of IFI_BRACKETS) {
    if (base <= prev) break;
    tax += (Math.min(base, cap) - prev) * rate;
    prev = cap;
  }
  return tax;
}

// Taux réel net : rendement après impôt sur les gains, corrigé de l'inflation.
export function realNetRate({ rendement, inflation, fiscalite }) {
  const nominalNet = (rendement / 100) * (1 - fiscalite / 100);
  return (1 + nominalNet) / (1 + inflation / 100) - 1;
}

// Capital nécessaire pour verser `annual` € (euros constants) chaque année.
export function capitalFor(annual, hyp) {
  if (annual <= 0) return 0;
  const g = realNetRate(hyp);
  if (hyp.horizon === 'perpetuel') return g > 0 ? annual / g : Infinity;
  const n = Math.max(1, hyp.ageFin - hyp.age);
  if (Math.abs(g) < 1e-9) return annual * n;
  return (annual * (1 - Math.pow(1 + g, -n))) / g;
}

export function compute(state) {
  const s = { ...DEFAULT_STATE, ...state, hyp: { ...DEFAULT_STATE.hyp, ...(state.hyp || {}) } };
  const oneOff = [];   // { label, amount, group }
  const annual = [];

  if (s.mode === 'revenu') {
    annual.push({ label: 'Revenu net versé chaque mois', amount: s.revenuMensuel * 12, group: 'Revenu' });
    if (s.achatsImmediats > 0) oneOff.push({ label: 'Achats et cadeaux immédiats', amount: s.achatsImmediats, group: 'Achats' });
  } else {
    const people = s.adultes + s.enfants * RATES.childTravelFactor;

    const rp = byId(CATALOG.rp, s.rp);
    let realEstateBase = 0;
    if (rp.price > 0) {
      oneOff.push({ label: rp.label, amount: rp.price * (1 + RATES.notaire), group: 'Immobilier' });
      annual.push({ label: `Entretien et taxes — ${rp.label.toLowerCase()}`, amount: rp.price * RATES.upkeepRp, group: 'Immobilier' });
      realEstateBase += rp.price * 0.7; // abattement de 30 % sur la résidence principale
    }
    for (const r of qtyEntries(CATALOG.secondaires, s.secondaires)) {
      const label = r.qty > 1 ? `${r.label} ×${r.qty}` : r.label;
      oneOff.push({ label, amount: r.price * r.qty * (1 + RATES.notaire), group: 'Immobilier' });
      annual.push({ label: `Entretien et taxes — ${r.label.toLowerCase()}`, amount: r.price * r.qty * RATES.upkeepSecondaire, group: 'Immobilier' });
      realEstateBase += r.price * r.qty;
    }
    const ifiAmount = ifi(realEstateBase);
    if (ifiAmount > 0) annual.push({ label: 'Impôt sur la fortune immobilière (IFI)', amount: ifiAmount, group: 'Impôts' });

    const y = byId(CATALOG.yacht, s.yacht);
    if (y.price > 0) {
      oneOff.push({ label: y.label, amount: y.price, group: 'Plaisirs' });
      annual.push({ label: `Équipage, port et entretien — ${y.label.toLowerCase()}`, amount: y.price * RATES.yachtRunning, group: 'Plaisirs' });
    }
    for (const c of qtyEntries(CATALOG.voitures, s.voitures)) {
      const label = c.qty > 1 ? `${c.label} ×${c.qty}` : c.label;
      oneOff.push({ label, amount: c.price * c.qty, group: 'Plaisirs' });
      annual.push({ label: `Renouvellement et assurance — ${label.toLowerCase()}`, amount: c.price * c.qty * RATES.carAnnual, group: 'Plaisirs' });
    }

    const v = byId(CATALOG.voyages, s.voyagesGamme);
    if (s.voyagesNb > 0) {
      const perTrip = v.perPerson * people + v.flat;
      annual.push({ label: `${s.voyagesNb} voyage${s.voyagesNb > 1 ? 's' : ''} ${v.label.toLowerCase()} par an`, amount: perTrip * s.voyagesNb, group: 'Voyages' });
    }

    for (const p of qtyEntries(CATALOG.personnel, s.personnel)) {
      const label = p.qty > 1 ? `${p.label} ×${p.qty}` : p.label;
      annual.push({ label, amount: p.salary * p.qty, group: 'Personnel' });
    }

    const e = byId(CATALOG.ecole, s.ecole);
    if (s.enfants > 0 && e.perYear > 0) {
      oneOff.push({ label: `Scolarité (${e.label.toLowerCase()}), ${RATES.schoolYears} ans par enfant`, amount: e.perYear * RATES.schoolYears * s.enfants, group: 'Enfants' });
    }

    if (s.vieMensuelle > 0) annual.push({ label: 'Vie courante du foyer', amount: s.vieMensuelle * 12, group: 'Quotidien' });
    if (s.donsAnnuels > 0) annual.push({ label: 'Dons à des associations', amount: s.donsAnnuels, group: 'Transmettre' });

    if (s.enfants > 0 && s.donEnfant > 0) {
      const parents = Math.max(1, Math.min(2, s.adultes));
      const perParent = s.donEnfant / parents;
      const tax = donationTax(Math.max(0, perParent - 100_000)) * parents * s.enfants;
      oneOff.push({ label: `Donation de ${fmtShort(s.donEnfant)} à chaque enfant`, amount: s.donEnfant * s.enfants, group: 'Transmettre' });
      if (tax > 0) oneOff.push({ label: 'Droits de donation', amount: tax, group: 'Impôts' });
    }
  }

  const oneOffTotal = sum(oneOff);
  const annualTotal = sum(annual);
  const capitalRente = capitalFor(annualTotal, s.hyp);
  const base = oneOffTotal + capitalRente;
  const marge = base * (s.hyp.marge / 100);
  const total = base + marge;

  return {
    state: s,
    oneOff: oneOff.sort((a, b) => b.amount - a.amount),
    annual: annual.sort((a, b) => b.amount - a.amount),
    oneOffTotal, annualTotal, capitalRente, marge, total,
    monthly: annualTotal / 12,
    realRate: realNetRate(s.hyp),
    years: s.hyp.horizon === 'perpetuel' ? Infinity : Math.max(1, s.hyp.ageFin - s.hyp.age),
    lottery: lotteryVerdict(total),
  };
}

export function lotteryVerdict(total) {
  const L = LOTTERIES.loto, E = LOTTERIES.euro;
  const drawsPerYearLoto = L.drawsPerWeek * 52;
  const out = {
    total,
    loto: {
      yearsToWin: L.odds / drawsPerYearLoto,
      costAllCombos: L.odds * L.price,
      rollovers: Math.max(0, Math.ceil((total - L.minJackpot) / L.step)),
      lifetimeChance: 1 - Math.pow(1 - 1 / L.odds, drawsPerYearLoto * 50),
    },
    euro: {
      yearsToWin: E.odds / (E.drawsPerWeek * 52),
      costAllCombos: E.odds * E.price,
    },
  };
  if (!Number.isFinite(total)) out.tier = 'infini';
  else if (total <= L.minJackpot) out.tier = 'loto-min';
  else if (total <= L.record) out.tier = 'loto';
  else if (total <= E.cap) out.tier = 'euro';
  else out.tier = 'au-dela';
  out.euroJackpots = total / E.cap;
  out.lotoRecords = total / L.record;
  return out;
}

const sum = (list) => list.reduce((acc, x) => acc + x.amount, 0);

export function fmtShort(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n >= 1e9) return `${trim(n / 1e9)} Md€`;
  if (n >= 1e6) return `${trim(n / 1e6)} M€`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k€`;
  return `${Math.round(n)} €`;
}
const trim = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).toString().replace('.', ',').replace(/,0+$/, '').replace(/(,\d*?)0+$/, '$1');
