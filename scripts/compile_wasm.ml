importer io
importer json
importer shutil
importer sys
importer importlib
depuis pathlib importer Path

soit RACINE = Path(__file__).parent.parent
soit SOURCE_ML = RACINE / "src" / "main.ml"
soit DOSSIER_PUBLIC = RACINE / "public"
DOSSIER_PUBLIC.mkdir(parents=Vrai, exist_ok=Vrai)

soit SORTIE_ML = DOSSIER_PUBLIC / "main.ml"
soit SORTIE_ML_BUNDLE = DOSSIER_PUBLIC / "main_wasm_bundle.ml"
soit SORTIE_PY = DOSSIER_PUBLIC / "mandelbrot_transpiled.py"
soit SORTIE_BENCH = DOSSIER_PUBLIC / "benchmark.json"
soit SORTIE_WASM_RS = DOSSIER_PUBLIC / "wasm_intermediate.rs"
soit SORTIE_WAT = DOSSIER_PUBLIC / "main.wat"
soit SORTIE_WASM = DOSSIER_PUBLIC / "mandelbrot.wasm"

soit TAILLE_BENCH_GRILLE = 200
soit ITER_BENCH_MAX = 100
soit SEPARATEUR = "=" * 62
soit MODULES_WASM = ["fractales_escape", "fractales_dynamique", "fractales_variantes", "fractales_ifs", "fractales_lsystem", "fractales_magnetiques"]

déf ajouter_depot_multilingual_au_chemin():
    soit candidats = [RACINE.parent / "multilingual", Path.home() / "Documents" / "Research" / "Workspace" / "multilingual"]
    pour candidat dans candidats:
        si (candidat / "multilingualprogramming" / "__init__.py").exists():
            si non (str(candidat) dans sys.path):
                sys.path.insert(0, str(candidat))
            retour

déf transpiler_strict(source):
    ajouter_depot_multilingual_au_chemin()
    soit ProgramExecutor = importlib.import_module("multilingualprogramming").ProgramExecutor
    soit executeur = ProgramExecutor(language="fr")
    soit code_python = executeur.transpile(source)
    si non code_python ou non code_python.strip():
        lever RuntimeError("Transpilation multilingual vide.")
    retour code_python

déf analyser_programme(source):
    ajouter_depot_multilingual_au_chemin()
    soit lexer_module = importlib.import_module("multilingualprogramming.lexer.lexer")
    soit parser_module = importlib.import_module("multilingualprogramming.parser.parser")
    soit Lexer = lexer_module.Lexer
    soit Parser = parser_module.Parser
    soit lexeur = Lexer(source, language="fr")
    soit jetons = lexeur.tokenize()
    soit analyseur = Parser(jetons, source_language=(lexeur.language ou "fr"))
    retour analyseur.parse()

déf emettre_intermediaire_wasm_si_disponible(source):
    soit ok = Faux
    soit detail_erreur = None
    essayer:
        soit wasm_generator_module = importlib.import_module("multilingualprogramming.codegen.wasm_generator")
        soit WasmCodeGenerator = wasm_generator_module.WasmCodeGenerator
        soit programme = analyser_programme(source)
        soit code_rust = WasmCodeGenerator().generate(programme)
        SORTIE_WASM_RS.write_text(code_rust, encoding="utf-8")
        ok = Vrai
    sauf Exception comme erreur:
        detail_erreur = str(erreur)
    retour (ok, detail_erreur)

déf generer_wat_et_wasm_strict(source):
    ajouter_depot_multilingual_au_chemin()
    soit wat_generator_module = importlib.import_module("multilingualprogramming.codegen.wat_generator")
    soit WATCodeGenerator = wat_generator_module.WATCodeGenerator
    soit wasmtime = importlib.import_module("wasmtime")

    soit programme = analyser_programme(source)
    soit texte_wat = WATCodeGenerator().generate(programme)
    soit octets_wasm = wasmtime.wat2wasm(texte_wat)
    retour (texte_wat, octets_wasm)

déf verifier_wat_strict(texte_wat):
    si ("unsupported call" dans texte_wat):
        lever RuntimeError("WAT non strict: 'unsupported call' detecte.")
    si ("unresolved:" dans texte_wat):
        lever RuntimeError("WAT non strict: 'unresolved' detecte.")

déf valider_exports_wasm(octets_wasm, exports_requises):
    soit wasmtime = importlib.import_module("wasmtime")
    soit moteur = wasmtime.Engine()
    soit magasin = wasmtime.Store(moteur)
    soit module = wasmtime.Module(moteur, octets_wasm)
    soit imports = []
    pour imp dans module.imports:
        si isinstance(imp.type, wasmtime.FuncType):
            soit nb_resultats = longueur(imp.type.results)
            si nb_resultats == 0:
                déf _stub_no_result(*_args):
                    retour None
                imports.append(wasmtime.Func(magasin, imp.type, _stub_no_result))
            sinonsi nb_resultats == 1:
                déf _stub_one_result(*_args):
                    retour 0
                imports.append(wasmtime.Func(magasin, imp.type, _stub_one_result))
            sinon:
                déf _stub_multi_result(*_args):
                    retour tuple(0 pour _ dans intervalle(nb_resultats))
                imports.append(wasmtime.Func(magasin, imp.type, _stub_multi_result))
        sinon:
            lever RuntimeError(f"Type d'import non supporte pour validation: {imp.type}")

    soit instance = wasmtime.Instance(magasin, module, imports)
    soit exports = instance.exports(magasin)
    soit exports_manquantes = [nom pour nom dans exports_requises si non (nom dans exports)]
    si exports_manquantes:
        lever RuntimeError(f"Exports WASM manquants: {exports_manquantes}")

déf construire_source_wasm_modulaire():
    soit morceaux = ["# Bundle WASM genere automatiquement depuis src/*.ml", "importer math", ""]
    pour nom_module dans MODULES_WASM:
        soit chemin = RACINE / "src" / f"{nom_module}.ml"
        si non chemin.exists():
            lever RuntimeError(f"Module introuvable pour bundle WASM: {chemin}")
        soit texte = chemin.read_text(encoding="utf-8")
        soit lignes_filtrees = []
        pour ligne dans texte.splitlines():
            soit brut = ligne.strip()
            si brut.startswith("importer fractales_"):
                continuer
            si brut.startswith("depuis fractales_"):
                continuer
            si brut == "importer math":
                continuer
            lignes_filtrees.append(ligne)
        morceaux.append(f"# --- module: {nom_module} ---")
        morceaux.append(chr(10).join(lignes_filtrees).strip())
        morceaux.append("")
    retour chr(10).join(morceaux).strip() + chr(10)

déf main():
    si sys.stdout.encoding et non (sys.stdout.encoding.lower() dans ("utf-8", "utf8")):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    si sys.stderr.encoding et non (sys.stderr.encoding.lower() dans ("utf-8", "utf8")):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    afficher(SEPARATEUR)
    afficher("  Explorateur de Fractales -- Build strict multilingual")
    afficher(SEPARATEUR)

    afficher("")
    afficher(f"[1] Lecture de {SOURCE_ML.relative_to(RACINE)}")
    si non SOURCE_ML.exists():
        lever RuntimeError(f"Fichier source introuvable: {SOURCE_ML}")
    soit source_humaine = SOURCE_ML.read_text(encoding="utf-8")
    afficher(f"    {longueur(source_humaine)} caracteres, {source_humaine.count(chr(10))} lignes")

    afficher("")
    afficher(f"[2] Copie vers {SORTIE_ML.relative_to(RACINE)}")
    shutil.copy(SOURCE_ML, SORTIE_ML)
    afficher("    Copie.")
    soit source_wasm = construire_source_wasm_modulaire()
    SORTIE_ML_BUNDLE.write_text(source_wasm, encoding="utf-8")
    afficher(f"    Bundle WASM ecrit: {SORTIE_ML_BUNDLE.relative_to(RACINE)}")

    si SORTIE_WASM.exists():
        SORTIE_WASM.unlink()
        afficher(f"    Ancien artefact supprime: {SORTIE_WASM.relative_to(RACINE)}")

    afficher("")
    afficher("[3] Transpilation multilingual -> Python (strict)")
    soit code_python = transpiler_strict(source_wasm)
    SORTIE_PY.write_text(code_python, encoding="utf-8")
    afficher(f"    Ecrit dans {SORTIE_PY.relative_to(RACINE)}")
    afficher("    Apercu :")
    pour ligne dans code_python.splitlines()[:12]:
        afficher(f"      {ligne}")

    afficher("")
    afficher("[4] Generation WASM (backends officiels multilingual)")
    soit intermediaire_wasm_disponible, erreur_wasm = emettre_intermediaire_wasm_si_disponible(source_wasm)
    si intermediaire_wasm_disponible:
        afficher(f"    Rust intermediaire ecrit: {SORTIE_WASM_RS.relative_to(RACINE)}")
    sinon:
        afficher("    Rust intermediaire indisponible.")
        si erreur_wasm:
            afficher(f"    Detail: {erreur_wasm}")

    soit texte_wat, octets_wasm = generer_wat_et_wasm_strict(source_wasm)
    verifier_wat_strict(texte_wat)
    SORTIE_WAT.write_text(texte_wat, encoding="utf-8")
    SORTIE_WASM.write_bytes(octets_wasm)
    afficher(f"    WAT ecrit : {SORTIE_WAT.relative_to(RACINE)}")
    afficher(f"    WASM ecrit: {SORTIE_WASM.relative_to(RACINE)} ({longueur(octets_wasm):,} octets)")

    soit exports_requises = ["mandelbrot", "julia", "burning_ship", "tricorn", "multibrot", "celtic", "buffalo", "perpendicular_burning_ship", "newton", "phoenix", "barnsley", "sierpinski", "koch", "magnet1", "magnet2", "lambda_fractale"]
    valider_exports_wasm(octets_wasm, exports_requises)
    afficher(f"    Exports valides: {', '.join(exports_requises)}")

    afficher("")
    afficher("[5] Benchmark")
    afficher("    Ignore dans ce pipeline strict (pas d'execution runtime hors compilation).")

    afficher("")
    afficher(f"[6] Ecriture de {SORTIE_BENCH.relative_to(RACINE)}")
    soit donnees_benchmark = {"python_ms": None, "wasm_ms": None, "speedup": None, "multibrot_python_ms": None, "multibrot_wasm_ms": None, "multibrot_speedup": None, "grid_size": TAILLE_BENCH_GRILLE, "max_iter": ITER_BENCH_MAX, "wasm_available": Vrai, "wasm_estimated": Faux, "wasm_pipeline": "multilingual_official_wat2wasm"}
    SORTIE_BENCH.write_text(json.dumps(donnees_benchmark, indent=2, ensure_ascii=Faux), encoding="utf-8")
    afficher(json.dumps(donnees_benchmark, indent=4, ensure_ascii=Faux))

    afficher("")
    afficher(SEPARATEUR)
    afficher("  OK Build strict multilingual termine.")
    afficher(f"    ML   : {SORTIE_ML.relative_to(RACINE)}")
    afficher(f"    ML+  : {SORTIE_ML_BUNDLE.relative_to(RACINE)}")
    afficher(f"    PY   : {SORTIE_PY.relative_to(RACINE)}")
    si intermediaire_wasm_disponible:
        afficher(f"    RS   : {SORTIE_WASM_RS.relative_to(RACINE)}")
    afficher(f"    WAT  : {SORTIE_WAT.relative_to(RACINE)}")
    afficher(f"    WASM : {SORTIE_WASM.relative_to(RACINE)}")
    afficher(f"    JSON : {SORTIE_BENCH.relative_to(RACINE)}")
    afficher(SEPARATEUR)

