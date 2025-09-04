# Présentation statique – Vision stratégique

Cette application web statique présente de manière interactive les principaux indicateurs et propositions du rapport **« Vision stratégique de sortie de crise pour la France »**. Elle ne nécessite aucun framework ; tout est réalisé avec du **HTML, CSS et JavaScript** et peut être déployé sur **GitHub Pages** sans configuration supplémentaire.

## Fonctionnalités

- **Graphiques interactifs** : les indicateurs économiques sont affichés sous forme de graphiques générés avec [Chart.js](https://www.chartjs.org/) et son plugin d’annotation. Les graphiques disposent de tooltips enrichis, d’annotations (zones ombrées lors du survol de liens) et s’ajustent automatiquement à la taille de l’écran.
- **Liens texte ↔ graphique** : dans la section Synthèse, chaque paragraphe comporte des liens vers les séries associées. Survoler un lien met en valeur la série correspondante et met en évidence une période donnée ; cliquer fait défiler la page jusqu’au graphique.
- **Tuiles “Conséquence → Solution”** : des cartes recto–verso présentent, pour chaque enjeu, un problème (recto) et la solution proposée (verso) avec un KPI associé, un délai et un impact estimé. Les cartes se retournent au survol grâce à un effet 3D CSS.
- **Fond parallax** : un arrière‑plan avec léger effet de parallaxe et un logo Marianne tricolore collé en haut accompagnent la navigation.
- **Mode sombre** : la palette de couleurs s’adapte automatiquement au thème sombre du navigateur (`prefers-color-scheme`), avec un contraste respectant les critères AA d’accessibilité.
- **Entièrement statique** : aucun backend n’est nécessaire. Toutes les données sont chargées depuis `public/data/report.json`.

## Structure du projet

```
simple-app/
├── index.html            # Page principale
├── styles.css            # Feuille de styles (light/dark + grille + cartes)
├── scripts.js            # Logique d’affichage et d’interaction
├── public/
│   ├── assets/
│   │   ├── marianne.png  # Logo Marianne tricolore
│   │   └── background.png# Image de fond pour la parallaxe
│   └── data/
│       └── report.json   # Fichier JSON contenant les indicateurs, paragraphes, tuiles et sources
├── LICENSE               # Licence MIT
└── .github/
    └── workflows/
        └── pages.yml     # Workflow GitHub Actions pour le déploiement
```

### Données (`report.json`)

Le fichier `public/data/report.json` suit le schéma décrit dans le cahier des charges :

- `meta` : métadonnées du rapport (titre, date de mise à jour, auteur).
- `indicateurs` : liste d’indicateurs avec un identifiant, un libellé, une unité, une série temporelle de valeurs et une source.
- `paragraphes` : synthèses avec titre, texte libre et références (`liens`) vers les indicateurs (id et plage temporelle).
- `tuiles` : cartes recto–verso indiquant un problème, une solution, un KPI (référence à un indicateur), un délai et un impact.
- `sources` : liste complémentaire de sources bibliographiques.

Vous pouvez modifier ce fichier pour adapter le contenu de l’application. Les indicateurs sont exploités dynamiquement pour construire les graphiques et les tuiles.

## Installation et test local

Cette application est entièrement statique ; aucun outil de build n’est requis. Pour la tester en local :

1. **Clonez ou décompressez le dépôt** dans un dossier de votre choix.
2. Ouvrez un terminal et servez le dossier avec un serveur HTTP local, par exemple avec Python :

   ```bash
   # depuis le dossier simple-app/
   python3 -m http.server 8000
   ```

3. Ouvrez votre navigateur à l’adresse `http://localhost:8000` pour visualiser l’application. L’utilisation d’un serveur est nécessaire afin que le navigateur autorise le chargement du fichier JSON (les navigateurs bloquent les requêtes `file://` pour des raisons de sécurité).

Vous pouvez également utiliser n’importe quelle extension de serveur local (Live Server, serve, http-server…).

## Déploiement sur GitHub Pages

Le workflow GitHub Actions fourni (`.github/workflows/pages.yml`) publie automatiquement le site sur GitHub Pages à chaque push sur la branche `main`. La configuration s’appuie sur les actions officielles `upload-pages-artifact` et `deploy-pages` et ne nécessite aucune étape de compilation.

Pour activer GitHub Pages :

1. Créez un nouveau dépôt sur GitHub et poussez-y le contenu du dossier `simple-app`.
2. Dans les paramètres du dépôt, section **Pages**, sélectionnez la branche `gh-pages` ou l’option déploiement par Actions (recommandé par le workflow). Après le premier push, le workflow se déclenchera et publiera le site.
3. Attendez quelques minutes ; votre site sera accessible via l’URL indiquée par GitHub Pages.

## Personnalisation

- **Données** : modifiez `public/data/report.json` pour ajouter de nouveaux indicateurs, ajuster les séries ou mettre à jour les paragraphes et tuiles.
- **Images** : remplacez `public/assets/background.png` et `public/assets/marianne.png` par vos propres visuels (en conservant les noms de fichier ou en ajustant les chemins dans `styles.css` et `index.html`).
- **Couleurs et typographie** : ajustez les variables CSS dans `styles.css` (`:root`) pour changer les couleurs primaires et secondaires. La police par défaut est [Inter](https://fonts.google.com/specimen/Inter), importée via Google Fonts ; vous pouvez modifier le lien dans `index.html`.

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.