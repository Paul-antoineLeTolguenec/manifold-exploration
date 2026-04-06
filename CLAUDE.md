# Manifold Exploration

## Project
Blog interactif single-page sur la géométrie différentielle. Déployé via GitHub Pages sur `main`.

## Structure
- `index.html` — page unique avec hero (tore 3D) + 9 chapitres scrollables
- `assets/css/style.css` — styles partagés (dark theme, cyan accent)
- `assets/js/torus.js` — animation tore interactif (canvas 2D)

## Stack
- HTML/CSS/JS vanilla — pas de framework, pas de build
- KaTeX via CDN pour le rendu math
- GitHub Pages pour le déploiement

## Conventions
- Commentaires de code en anglais
- **Tout le contenu du blog est en anglais** (texte, titres, légendes, labels)
- Chaque chapitre a : définitions, formules (KaTeX), et un placeholder pour une visualisation interactive
- Classes CSS : `.katex-inline` pour les maths inline, `.katex-display` pour les blocs, `.viz-container` pour les visualisations

## Mathematical Writing Rules
- **Notation consistency is critical.** Every symbol must be introduced before use and must keep the same meaning across all chapters.
- Before writing a new chapter, review all previously introduced notation to avoid conflicts or redefinitions.
- Use standard differential geometry notation (e.g. `M` for manifold, `T_pM` for tangent space, `g` for metric, `\nabla` for connection, `\Gamma^k_{ij}` for Christoffel symbols, `R` for Riemann tensor).
- Each new symbol must appear in a **Definition** block the first time it is used.
- If a symbol from a previous chapter is reused, do not redefine it — reference the original chapter.
- The goal is a rigorous, clean mathematical introduction to differential geometry and its applications. Precision over brevity.
- **Never use em dashes (`--` or `—`) in the middle of sentences.** Use commas, periods, or parentheses instead.
- **Every new concept must be illustrated** with an interactive figure (3D or animated 2D), consistent with the blog's dark/cyan theme. No concept introduced without a visual.

## Dev
```bash
python3 -m http.server 8080
```

## GitHub
- Repo perso : `Paul-antoineLeTolguenec/manifold-exploration`
- MCP : `github-personal`
