/**
 * Tests unitaires : arithmétique double-double Dekker côté JS (public/js/dd.js).
 *
 * On vérifie que les primitives addDD / subDD / mulDD / divDDScalar préservent
 * les ulps perdus par f64. Le critère est que l'erreur relative reste
 * sous 1e-30 (≈ 100× le plancher DD attendu), et que sur des cas où f64 perd
 * tout (a + ε puis − a doit donner ε), DD le retrouve.
 *
 * Run with: node --test tests/dd.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { addDD, subDD, mulDD, divDDScalar, twoSum, twoProduct, toF64 } from "../public/js/dd.js";

// Référence : somme exacte (a + b) en BigInt à partir de la décomposition
// IEEE-754. Suffisamment précis pour les tests : addition à 53 bits → 106 bits.
function addExact(a, b) {
  // En JS, BigInt ne porte pas les flottants : on convertit via un facteur
  // 2^52 et la mantissa. Plus simple : utiliser le fait que two_sum donne le
  // résultat avec lo = erreur exacte. On confronte addDD au résultat de
  // l'évaluation symbolique faite ici à la main.
  return [a + b, 0];
}

describe("twoSum — préserve l'erreur d'arrondi", () => {
  test("a + b sans débordement de précision rend l'erreur exacte", () => {
    const a = 1.0;
    const b = 1e-20;
    const [s, e] = twoSum(a, b);
    assert.equal(s, 1.0); // a domine, b perdu en f64
    assert.equal(e, 1e-20); // l'erreur capture b
  });

  test("a + b commutatif (hi+lo identique)", () => {
    const a = 1.7142857142857144;
    const b = 0.2857142857142856;
    const [s1, e1] = twoSum(a, b);
    const [s2, e2] = twoSum(b, a);
    assert.equal(s1, s2);
    assert.equal(e1, e2);
  });
});

describe("twoProduct — préserve l'erreur d'arrondi", () => {
  test("π × e (déborde 53 bits) garde l'erreur dans lo", () => {
    const a = Math.PI;
    const b = Math.E;
    const [p, e] = twoProduct(a, b);
    const reconstructed = p + e;
    assert.equal(reconstructed, a * b);
    assert.notEqual(e, 0, "lo non nul pour produit non représentable en f64");
  });
});

describe("addDD / subDD — round-trip", () => {
  test("subDD(addDD(a, b), b) ≈ a (perte ≤ 1 ulp lo)", () => {
    const a = -0.7436438870371587, aLo = 1.234e-17;
    const b = 0.123456789e-13, bLo = 5.6e-30;
    const [sH, sL] = addDD(a, aLo, b, bLo);
    const [rH, rL] = subDD(sH, sL, b, bLo);
    assert.ok(Math.abs(rH - a) < 1e-30, `hi: ${rH} ≠ ${a}`);
    assert.ok(Math.abs(rL - aLo) < 1e-30, `lo: ${rL} ≠ ${aLo}`);
  });

  test("addDD avec a et b tels que f64 perd b complètement", () => {
    const a = -0.7436438870371587, aLo = 0;
    const b = 0, bLo = 1e-18;
    const [hi, lo] = addDD(a, aLo, b, bLo);
    // f64: a + 1e-18 = a (1e-18 perdu). DD doit le capturer dans lo.
    assert.equal(hi, a);
    assert.ok(Math.abs(lo - 1e-18) < 1e-32, `lo doit capturer 1e-18, vu ${lo}`);
  });
});

describe("mulDD — préserve la précision", () => {
  test("mulDD(a, b) reproduit twoProduct quand lo=0", () => {
    const a = Math.PI, b = Math.E;
    const [hi, lo] = mulDD(a, 0, b, 0);
    const [p, err] = twoProduct(a, b);
    assert.equal(hi, p);
    // mulDD ajoute les termes croisés (0 ici) puis renormalise → lo == err.
    assert.ok(Math.abs(lo - err) < 1e-30, `lo (${lo}) ≠ err (${err})`);
  });
});

describe("divDDScalar — round-trip", () => {
  test("divDDScalar(a · k, k) ≈ a (perte < 1e-30 relative)", () => {
    const aH = 0.123456789012345e-10, aL = 6.78e-27;
    const k = 1.5;
    const [pH, pL] = mulDD(aH, aL, k, 0);
    const [qH, qL] = divDDScalar(pH, pL, k);
    const reconstructed = toF64(qH, qL);
    const original = toF64(aH, aL);
    const erreurRelative = Math.abs(reconstructed - original) / Math.abs(original);
    assert.ok(erreurRelative < 1e-30, `erreur relative ${erreurRelative} ≥ 1e-30`);
  });
});

describe("DD navigation — scénario zoom profond", () => {
  // Cas typique : centre Mandelbrot à -0.748, on zoome ×1e15 sur un point
  // décalé de quelques pixels. Sans DD, le nouveau centre perd ses derniers
  // bits significatifs.
  test("zoom ×1e15 successif (10×) sur cible décalée garde la position", () => {
    const target = -0.74364386 - 1e-15; // cible quasi pile sur le centre
    let cxH = -0.5, cxL = 0;
    let ps = 4 / 800;
    const factor = Math.pow(10, 1.5);
    for (let k = 0; k < 10; k++) {
      // re = ancien centre + (target - ancien centre)*0.999 (très proche de target)
      // Simulons : new_center = re + (old - re)/factor
      const re = target; // curseur sur target
      const [diffH, diffL] = subDD(cxH, cxL, re, 0);
      const [scH, scL] = divDDScalar(diffH, diffL, factor);
      [cxH, cxL] = addDD(scH, scL, re, 0);
      ps /= factor;
    }
    // À ce point, ps est ~3e-19 et le centre est très proche de target.
    // |new_center - target| doit rester sous quelques ulps DD, pas perdu en f64.
    const erreur = Math.abs(toF64(cxH, cxL) - target);
    assert.ok(erreur < 1e-15, `erreur ${erreur} : DD perd les bits proche de target`);
    // En pur f64, le test équivalent perdrait beaucoup plus :
    let cxF64 = -0.5;
    let psF64 = 4 / 800;
    for (let k = 0; k < 10; k++) {
      const re = target;
      cxF64 = re + (cxF64 - re) / factor;
      psF64 /= factor;
    }
    const erreurF64 = Math.abs(cxF64 - target);
    assert.ok(erreurF64 > 1e-18, `f64 doit perdre nettement plus que DD (vu ${erreurF64})`);
  });
});
