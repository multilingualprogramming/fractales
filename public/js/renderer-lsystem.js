"use strict";

const LIMITE_SEQUENCE_APERCU = 14000;
const LIMITE_SEQUENCE_RENDU = 28000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hacherGraineLSysteme(seed) {
  const text = String(seed ?? "1").trim() || "1";
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function creerHasardLSysteme(seed) {
  let state = hacherGraineLSysteme(seed);
  return function hasard() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parserAlternativeLSysteme(fragment, diagnostics, lineNumber, stochasticLine) {
  const trimmed = fragment.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*:\s*(.*)$/);
  if (!match) return { poids: stochasticLine ? 1 : null, valeur: trimmed };
  const poids = Number(match[1]);
  if (!Number.isFinite(poids) || poids <= 0) {
    diagnostics.push(`Ligne ${lineNumber} : poids invalide`);
    return null;
  }
  return { poids, valeur: match[2] ?? "" };
}

export function parserReglesLSysteme(rulesText) {
  const rules = new Map();
  const diagnostics = [];
  String(rulesText || "").split(/\n|;/).forEach((line, index) => {
    const [key, ...valueParts] = line.split("=");
    const symbole = key?.trim()?.[0];
    const value = valueParts.join("=");
    if (!symbole && line.trim()) diagnostics.push(`Ligne ${index + 1} : symbole manquant`);
    if (!symbole || valueParts.length === 0) return;

    const parts = value.split("|");
    const stochasticLine = parts.length > 1 || parts.some((part) => /^\s*[0-9]*\.?[0-9]+\s*:/.test(part));
    const alternatives = parts
      .map((part) => parserAlternativeLSysteme(part, diagnostics, index + 1, stochasticLine))
      .filter(Boolean);
    if (alternatives.length === 0) return;

    const poidsTotal = alternatives.reduce((sum, alt) => sum + (alt.poids ?? 1), 0);
    if (!Number.isFinite(poidsTotal) || poidsTotal <= 0) {
      diagnostics.push(`Ligne ${index + 1} : somme des poids invalide`);
      return;
    }
    rules.set(symbole, {
      alternatives: alternatives.map((alt) => ({
        poids: stochasticLine ? (alt.poids ?? 1) / poidsTotal : 1,
        valeur: alt.valeur,
      })),
      stochastique: stochasticLine,
    });
  });
  return { rules, diagnostics };
}

function choisirAlternativeLSysteme(rule, hasard) {
  if (!rule.stochastique || rule.alternatives.length === 1) return rule.alternatives[0].valeur;
  const tirage = hasard();
  let cumul = 0;
  for (const alternative of rule.alternatives) {
    cumul += alternative.poids;
    if (tirage <= cumul) return alternative.valeur;
  }
  return rule.alternatives[rule.alternatives.length - 1].valeur;
}

export function genererPropositionLSysteme(config, options = {}) {
  const { rules, diagnostics } = parserReglesLSysteme(config.rules);
  const hasard = creerHasardLSysteme(config.seed ?? 1);
  let sequence = String(config.axiom || "F").slice(0, 96);
  const generations = clamp(Number(config.generations) | 0, 0, 8);
  const limit = options.limit ?? LIMITE_SEQUENCE_RENDU;
  for (let i = 0; i < generations; i++) {
    let next = "";
    for (const ch of sequence) {
      const rule = rules.get(ch);
      next += rule ? choisirAlternativeLSysteme(rule, hasard) : ch;
      if (next.length > limit) break;
    }
    sequence = next.slice(0, limit);
  }
  return { sequence, diagnostics };
}

export function pointsPropositionLSysteme(config, options = {}) {
  const { sequence, diagnostics } = genererPropositionLSysteme(config, options);
  const angleStep = (Number(config.angle) || 60) * Math.PI / 180;
  let x = 0.0;
  let y = 0.0;
  let angle = 0.0;
  let angleSign = 1;
  const stack = [];
  let profondeur = 0;
  const points = [{ x, y, move: true, profondeur, angle }];
  for (const ch of sequence) {
    if (ch === "F" || ch === "G") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push({ x, y, profondeur, angle });
    } else if (ch === "f") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push({ x, y, move: true, profondeur, angle });
    } else if (ch === "+") {
      angle += angleStep * angleSign;
    } else if (ch === "-") {
      angle -= angleStep * angleSign;
    } else if (ch === "[") {
      stack.push([x, y, angle, angleSign, profondeur]);
      profondeur += 1;
    } else if (ch === "]" && stack.length > 0) {
      [x, y, angle, angleSign, profondeur] = stack.pop();
      points.push({ x, y, move: true, profondeur, angle });
    } else if (ch === "|") {
      angle += Math.PI;
    } else if (ch === "!") {
      angleSign = -angleSign;
    }
  }
  return { points, sequence, diagnostics };
}

export function dessinerPropositionLSysteme(canvas, axiom, rulesText, angleDeg, generations, seed = 1) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
  ctx.fillRect(0, 0, w, h);

  const { points, diagnostics } = pointsPropositionLSysteme({
    axiom,
    rules: rulesText,
    angle: angleDeg,
    generations,
    seed,
  }, { limit: LIMITE_SEQUENCE_APERCU });
  if (points.length < 2) return { diagnostics, sequence: "" };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((w - 28) / Math.max(1, maxX - minX), (h - 28) / Math.max(1, maxY - minY));
  ctx.strokeStyle = "#00d4ff";
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  points.forEach((p, index) => {
    const px = 14 + (p.x - minX) * scale;
    const py = h - 14 - (p.y - minY) * scale;
    if (index === 0 || p.move) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  return { diagnostics };
}

export function decrireReglesLSysteme(rulesText) {
  const { rules, diagnostics } = parserReglesLSysteme(rulesText);
  let stochasticCount = 0;
  for (const rule of rules.values()) {
    if (rule.stochastique) stochasticCount++;
  }
  return { diagnostics, stochasticCount };
}
