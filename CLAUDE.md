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
- Contenu des chapitres en anglais
- Chaque chapitre a : définitions, formules (KaTeX), et un placeholder pour une visualisation interactive
- Classes CSS : `.katex-inline` pour les maths inline, `.katex-display` pour les blocs, `.viz-container` pour les visualisations

## Dev
```bash
python3 -m http.server 8080
```

## GitHub
- Repo perso : `Paul-antoineLeTolguenec/manifold-exploration`
- MCP : `github-personal`
