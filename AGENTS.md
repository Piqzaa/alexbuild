# AlexBuild — Page vitrine services (artisans / commerçants)

## Contexte projet
- Marque unique : **AlexBuild** (pas de fausse "agence" — un dev indépendant, ça inspire plus confiance qu'une structure fictive)
- alexbuild.fr = cette page vitrine (accueil), avec un lien vers `/portfolio` (portfolio dev existant, esthétique pixel/JRPG séparée — ne pas mélanger les deux identités)
- Basé à Strasbourg, missions possibles dans toute la France (à distance)
- Contact : dev@alexbuild.fr

## Audience
Artisans et commerçants non-tech (boulangers, restaurateurs, coiffeurs, artisans du bâtiment...). Ils ne comprennent pas le jargon dev. Ils veulent savoir : c'est quoi le problème, combien ça coûte, à quoi ça ressemble pour quelqu'un comme eux.

## Positionnement
Angle audit-first : on ne vend pas "un site", on identifie d'abord ce qui fait perdre des clients au site actuel (ou son absence), et on propose la suite en conséquence.

## Services (verrouillés, ne pas modifier sans demander)
1. **Appel diagnostic** — gratuit, 15-20 min, en visio/téléphone. Point d'entrée de l'entonnoir.
2. **Audit détaillé** — 100-150€. Rapport PDF priorisé (vitesse, mobile, SEO local, tunnel de contact).
3. **Refonte ciblée** — 300-800€. Corrige précisément ce que l'audit a identifié.
4. **Création de site** — **sur devis uniquement, pas de prix affiché** (pour ne pas effrayer avec un montant élevé en premier contact).

## Preuves / réalisations à présenter
- **Vite & Gourmand** — traiteur/restauration rapide, site vitrine + commande
- **MyPetPuzzle** — e-commerce, puzzles personnalisés
- **Jobflow** — outil de gestion sur-mesure (CRM interne)
Présenter comme des résultats concrets pour un client type, pas comme des démos techniques.

## Direction design
"Atelier de précision" — évoque la rigueur et le savoir-faire, pas le SaaS générique. Fond encre profonde + section alternée sur fond clair, un accent cuivre/laiton, serif de caractère pour les titres + sans-serif sobre pour le corps, layout asymétrique (pas de grid de 3 cards identiques).

À éviter : palette IA générique (crème+terracotta ou noir+néon), eyebrows CAPS, flèches "→", listes 01/02/03 gratuites, canvas de particules flottantes, stock photos.

---

## Règles techniques non-négociables (bugs déjà rencontrés sur ce projet — ne pas répéter)

1. **Aucun texte ne doit dépendre d'une animation pour être visible.** Toute règle du type `opacity:0` + `animation: ... forwards` doit être scopée dans `@media (prefers-reduced-motion: no-preference)`, avec l'état par défaut (hors media query) à `opacity:1`. Si l'animation ne se déclenche pas pour une raison quelconque, le contenu doit rester lisible.

2. **Couleur de texte explicite partout**, jamais seulement héritée — surtout en changeant de section (fond sombre → fond clair type "paper"). Un `h2`/`h3`/`p` sans `color` explicite qui se retrouve dans une section à fond clair alors que le body est en texte clair par défaut = titre invisible. C'est arrivé, ça ne doit pas se reproduire.

3. **Contraste texte/fond ≥ 4.5:1 (AA), calculé, pas estimé à l'œil.** Éviter les gris moyens trop proches du fond (ex. un gris à ~A6A9B1 sur fond quasi-noir passait les calculs mais restait perçu comme "peu visible" — préférer des tons plus clairs avec de la marge).

4. **Placeholders de formulaire stylés explicitement** (`::placeholder { color: ...; opacity:1; }`) — le style par défaut du navigateur est souvent trop pâle sur fond sombre.

5. **Pas de visuel décoratif qui peut recouvrir le texte.** Si un fond animé/illustré est utilisé (grille, motif...), forcer l'empilement avec `isolation: isolate` sur le conteneur + `z-index` explicite sur le contenu texte, et ne jamais utiliser `preserveAspectRatio="... slice"` sur un SVG plein-cadre (peut scaler de façon disproportionnée et recouvrir le contenu selon le ratio d'écran).

6. **Boutons "ghost" (bordure seule, pas de fond) : la bordure doit être suffisamment claire pour être visible sur fond sombre**, pas juste une couleur de séparation de section (trop discrète = bouton invisible en tant que forme).

7. **Responsive mobile obligatoire sur toute section à plusieurs colonnes** (nav, grid de services, grid contact) — tester explicitement le comportement sous ~600-760px, ne pas supposer qu'un grid desktop se replie tout seul.
