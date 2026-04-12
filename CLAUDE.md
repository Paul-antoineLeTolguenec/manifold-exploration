# Manifold Exploration

## Project
Blog interactif single-page sur la géométrie différentielle. Déployé via GitHub Pages sur `main`.
Fil rouge : **"Qu'est-ce qu'une ligne droite sur une surface courbe ?"**

## Structure
- `index.html` — page unique avec hero (tore 3D) + 9 chapitres scrollables
- `assets/css/style.css` — styles partagés (dark theme, cyan accent) + composant `.proof-card`
- `assets/js/torus.js` — animation tore interactif (hero)
- `assets/js/ch1.js` — viz ch1 (parallèles, coordonnées locales, stéréographique)
- `assets/js/ch2.js` — viz ch2 (plan tangent, dérivation v(f))
- `assets/js/ch3.js` — viz ch3 (dérivée covariante vs ordinaire)
- `assets/js/ch4.js` — viz ch4 (plus court chemin, variation ε, géodésique RK4, holonomie)
- `assets/js/ch5.js` — viz ch5 (triangle contractant, heatmap courbure)
- `assets/js/ch6.js` — viz ch6 (distance géodésique, élément de volume)
- `assets/js/ch7.js` — viz ch7 (projection, exponentielle, logarithme)
- `assets/js/ch8.js` — viz ch8 (Swiss roll, ISOMAP, Laplacien spectral)
- `assets/js/ch9.js` — viz ch9 (métrique pullback + heatmap, géodésique vs interpolation linéaire)

## Stack
- HTML/CSS/JS vanilla — pas de framework, pas de build
- KaTeX via CDN pour le rendu math
- GitHub Pages pour le déploiement

## Conventions
- Commentaires de code en anglais
- **Tout le contenu du blog est en anglais** (texte, titres, légendes, labels)
- Chaque chapitre a : définitions, formules (KaTeX), et des visualisations interactives
- Classes CSS : `.katex-inline` pour les maths inline, `.katex-display` pour les blocs, `.viz-container` pour les visualisations
- Composant `.proof-card` : modal overlay pour les preuves détaillées (bouton `.proof-trigger`, overlay `.proof-overlay`, fermeture clic extérieur + Escape)

## JS Conventions
- Chaque fichier `chN.js` est une IIFE auto-contenue
- Helpers 3D partagés dans chaque fichier (rotateX, rotateY, project, sphereVertex, drawSphereWireframe, etc.)
- Convention y-up pour la sphère : `sphereVertex(θ, φ, r) = (sinθ cosφ, cosθ, sinθ sinφ)`
- `initCanvas(id)` retourne un objet avec `.isVisible()` (IntersectionObserver) pour pauser le rendu hors écran
- `requestAnimationFrame(draw)` en début de boucle, `if (!c.isVisible()) return;` juste après
- Palette : CYAN `rgba(0, 212, 255, `, ORANGE `rgba(255, 140, 50, `, RED `rgba(255, 80, 80, `, GREEN `rgba(50, 255, 140, `

## Mathematical Writing Rules
- **Notation consistency is critical.** Every symbol must be introduced before use and must keep the same meaning across all chapters.
- Before writing a new chapter, review all previously introduced notation to avoid conflicts or redefinitions.
- Each new symbol must appear in a **Definition** or **Notation** block the first time it is used.
- If a symbol from a previous chapter is reused, do not redefine it — reference the original chapter.
- The goal is a rigorous, clean mathematical introduction to differential geometry and its applications. Precision over brevity.
- **Never use em dashes (`--` or `—`) in the middle of sentences.** Use commas, periods, or parentheses instead.
- **Every new concept must be illustrated** with an interactive figure (3D or animated 2D), consistent with the blog's dark/cyan theme. No concept introduced without a visual.
- **Each chapter must end with a transition paragraph** teasing the next chapter.

## Notation Reference (canonical symbols)
These symbols are **locked** — do not redefine or reuse for other meanings:

| Symbol | Meaning | Introduced |
|--------|---------|------------|
| `M` | Generic smooth manifold | ch1 |
| `S²` | Unit 2-sphere | ch1 |
| `(θ, φ)` | Spherical coordinates (θ polar, φ azimuthal) | ch1 |
| `ψ, ψ_α` | Chart maps (NOT φ — avoid clash with coordinate) | ch1 |
| `T_pM` | Tangent space at p | ch2 |
| `e_θ, e_φ` | Coordinate basis vectors ∂/∂θ, ∂/∂φ | ch2 |
| `g, g_{ij}` | Riemannian metric | ch3 |
| `g^{ij}` | Inverse metric | ch3 |
| `∇` | Covariant derivative (Levi-Civita connection) | ch3 |
| `Γ^k_{ij}` | Christoffel symbols | ch3 |
| `γ` | Curve on manifold (NEVER for triangle angles) | ch4 |
| `E[γ]` | Energy functional | ch4 |
| `L(γ)` | Length functional | ch4 |
| `Ω` | Holonomy angle | ch4 |
| `A, B, C` | Triangle interior angles (NOT α, β, γ) | ch4 |
| `K` | Gaussian curvature | ch5 |
| `κ₁, κ₂` | Principal curvatures | ch5 |
| `Riem` | Riemann curvature tensor (NOT `R` — avoid clash) | ch5 |
| `Ric_{ij}` | Ricci tensor | ch5 |
| `S` | Scalar curvature (NOT `R` — avoid clash) | ch5 |
| `K(σ)` | Sectional curvature | ch5 |
| `[X, Y]` | Lie bracket | ch5 |
| `d(p,q)` | Geodesic distance | ch6 |
| `π` (map) | Nearest-point projection π: U → M | ch7 |
| `N_pM` | Normal space at p | ch7 |
| `NM` | Normal bundle | ch7 |
| `exp_p` | Exponential map at p | ch7 |
| `log_p` | Logarithmic map at p | ch7 |
| `inj(p)` | Injectivity radius at p | ch7 |
| `𝒳` | Ambient data space ℝ^D | ch8 |
| `𝒵` | Embedding/latent space ℝ^d | ch8 |
| `d_G(x_i,x_j)` | Graph shortest-path distance (NOT `d(p,q)`) | ch8 |
| `w_{ij}` | Reconstruction weights (LLE) or adjacency weights | ch8 |
| `L_G` | Graph Laplacian (NOT `L(γ)`) | ch8 |
| `Δ_M` | Laplace-Beltrami operator | ch8 |
| `σ_i` | Per-point kernel bandwidth (NOT sectional `σ`) | ch8 |
| `p_{j\|i}, p_{ij}` | High-dimensional similarities (t-SNE/UMAP) | ch8 |
| `q_{ij}` | Low-dimensional similarities | ch8 |
| `𝒩(i)` | k-nearest neighbor set of x_i | ch8 |
| `ρ_i` | Distance to nearest neighbor of x_i (UMAP) | ch8 |
| `H_σ` | Heat kernel (NOT `K` — avoid clash with curvature) | ch8 |
| `f` | Decoder map `f: 𝒵 → 𝒳` | ch9 |
| `J(z)` | Jacobian of decoder, `D×d` matrix `∂f/∂z` | ch9 |
| Einstein convention | Implicit summation on repeated up/down indices | ch3 (start of chapter) |

## Dev
```bash
python3 -m http.server 8080
```

## GitHub
- Repo perso : `Paul-antoineLeTolguenec/manifold-exploration`
- MCP : `github-personal`
