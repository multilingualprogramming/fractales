"use strict";

const FONCTIONS_FORMULE = new Set(["sin", "cos", "tan", "abs", "conj", "exp", "log", "re", "im", "norm", "arg"]);
const VARIABLES_FORMULE = new Set(["z", "c", "i", "e", "pi", "a", "b"]);
const OPERATEURS_FORMULE = new Set(["+", "-", "*", "/", "^"]);

function estValeurImpliciteDroite(token) {
  return token === "(" || /^[a-z]+$/i.test(token) || /^\d/.test(token);
}

function estValeurImpliciteGauche(token) {
  return token === ")" || /^[a-z]+$/i.test(token) || /^\d/.test(token);
}

export function tokeniserFormule(source) {
  const tokens = String(source || "").match(/\d+(?:\.\d+)?|\.\d+|[a-z]+|[+\-*/^()]/gi) ?? [];
  const resultat = [];
  tokens.forEach((token, index) => {
    const valeur = token.toLowerCase();
    const suivant = tokens[index + 1]?.toLowerCase();
    resultat.push(valeur);
    if (suivant && estValeurImpliciteGauche(valeur) && estValeurImpliciteDroite(suivant)) {
      if (!(FONCTIONS_FORMULE.has(valeur) && suivant === "(")) resultat.push("*");
    }
  });
  return resultat;
}

export function compilerFormule(source) {
  const tokens = tokeniserFormule(source);
  let index = 0;
  const peek = () => tokens[index];
  const next = () => tokens[index++];
  const erreur = (message) => {
    throw new Error(message);
  };

  function expression() {
    let gauche = terme();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const droite = terme();
      gauche = op === "+" ? `A(${gauche},${droite})` : `S(${gauche},${droite})`;
    }
    return gauche;
  }

  function terme() {
    let gauche = puissance();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const droite = puissance();
      gauche = op === "*" ? `M(${gauche},${droite})` : `D(${gauche},${droite})`;
    }
    return gauche;
  }

  function puissance() {
    const base = unaire();
    if (peek() === "^") {
      next();
      return `P(${base},${puissance()})`;
    }
    return base;
  }

  function unaire() {
    if (peek() === "-") {
      next();
      return `N(${unaire()})`;
    }
    return primaire();
  }

  function primaire() {
    const token = peek();
    if (!token) erreur("Expression incomplète");

    if (token === "(") {
      next();
      const valeur = expression();
      if (peek() !== ")") erreur("Parenthèse fermante manquante");
      next();
      return valeur;
    }

    if (/^\d/.test(token)) {
      next();
      return `[${Number(token)},0]`;
    }

    if (/^[a-z]+$/i.test(token)) {
      const nom = next();
      if (peek() === "(") {
        if (!FONCTIONS_FORMULE.has(nom)) erreur(`Fonction inconnue : ${nom}`);
        next();
        const argument = expression();
        if (peek() !== ")") erreur(`Parenthèse manquante après ${nom}`);
        next();
        return `${nom}(${argument})`;
      }
      if (!VARIABLES_FORMULE.has(nom)) erreur(`Symbole inconnu : ${nom}`);
      if (nom === "z") return "[zr,zi]";
      if (nom === "c") return "[cr,ci]";
      if (nom === "i") return "[0,1]";
      if (nom === "e") return `[${Math.E},0]`;
      if (nom === "pi") return `[${Math.PI},0]`;
      if (nom === "a") return "[pa,0]";
      if (nom === "b") return "[pb,0]";
    }

    erreur(`Jeton inattendu : ${token}`);
  }

  let expr;
  try {
    expr = expression();
    if (index < tokens.length) erreur(`Jeton inattendu : ${tokens[index]}`);
  } catch (err) {
    return { fn: null, error: err.message, tokens };
  }

  const helpers = `
    function A(a,b){return[a[0]+b[0],a[1]+b[1]];}
    function S(a,b){return[a[0]-b[0],a[1]-b[1]];}
    function M(a,b){return[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}
    function D(a,b){const d=b[0]*b[0]+b[1]*b[1];return d<1e-30?[0,0]:[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];}
    function N(a){return[-a[0],-a[1]];}
    function exp(a){const e=Math.exp(a[0]);return[e*Math.cos(a[1]),e*Math.sin(a[1])];}
    function log(a){return[Math.log(Math.hypot(a[0],a[1])||1e-30),Math.atan2(a[1],a[0])];}
    function P(a,b){if(!b[1]&&Number.isInteger(b[0])&&b[0]>=0&&b[0]<=32){let r=1,m=0,x=a[0],y=a[1],n=b[0];while(n>0){if(n&1){const t=r*x-m*y;m=r*y+m*x;r=t;}const t=x*x-y*y;y=2*x*y;x=t;n>>=1;}return[r,m];}return exp(M(b,log(a)));}
    function sin(a){return[Math.sin(a[0])*Math.cosh(a[1]),Math.cos(a[0])*Math.sinh(a[1])];}
    function cos(a){return[Math.cos(a[0])*Math.cosh(a[1]),-Math.sin(a[0])*Math.sinh(a[1])];}
    function tan(a){return D(sin(a),cos(a));}
    function abs(a){return[Math.hypot(a[0],a[1]),0];}
    function norm(a){return[a[0]*a[0]+a[1]*a[1],0];}
    function arg(a){return[Math.atan2(a[1],a[0]),0];}
    function re(a){return[a[0],0];}
    function im(a){return[a[1],0];}
    function conj(a){return[a[0],-a[1]];}
  `;

  try {
    const fn = new Function("zr", "zi", "cr", "ci", "pa", "pb", `${helpers}return ${expr};`);
    const probe = fn(0, 0, 0, 0, 0, 0);
    if (!Array.isArray(probe) || probe.length !== 2) throw new Error("La formule ne renvoie pas un complexe");
    return { fn, tokens };
  } catch (err) {
    return { fn: null, error: err.message, tokens };
  }
}

export function analyserFormule(source) {
  const tokens = tokeniserFormule(source);
  const fonctions = new Set();
  const variables = new Set();
  let operateurs = 0;
  let profondeur = 0;
  let profondeurMax = 0;

  tokens.forEach((token, index) => {
    if (FONCTIONS_FORMULE.has(token) && tokens[index + 1] === "(") fonctions.add(token);
    if (VARIABLES_FORMULE.has(token)) variables.add(token);
    if (OPERATEURS_FORMULE.has(token)) operateurs += 1;
    if (token === "(") {
      profondeur += 1;
      profondeurMax = Math.max(profondeurMax, profondeur);
    } else if (token === ")") {
      profondeur = Math.max(0, profondeur - 1);
    }
  });

  const avertissements = [];
  if (!variables.has("z")) avertissements.push("z absent : itération probablement constante");
  if (!variables.has("c")) avertissements.push("c absent : le plan peut perdre sa structure");
  if (fonctions.has("tan") || fonctions.has("exp") || fonctions.has("log")) {
    avertissements.push("croissance sensible : augmentez le rayon si l'image sature");
  }

  const complexite = tokens.length + operateurs * 2 + fonctions.size * 3 + profondeurMax;
  let niveau = "simple";
  if (complexite >= 42) niveau = "dense";
  else if (complexite >= 22) niveau = "moyenne";

  return {
    tokens,
    fonctions: [...fonctions],
    variables: [...variables],
    operateurs,
    profondeurMax,
    complexite,
    niveau,
    avertissements,
  };
}
