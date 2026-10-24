# Dynamic Island PC

Une Dynamic Island pour Windows, construite avec Electron.

Elle ne reste pas affichée en permanence :

1. Quand une tâche arrive, une **petite bulle noire descend** du haut de l’écran.
2. Elle devient une **petite pilule** et le reste **tant que la tâche dure** (icône à gauche, indicateur à droite).
3. Quand il n’y a plus de tâche, la pilule **se retransforme en boule**.
4. La boule **remonte** et disparaît en haut de l’écran.

Un clic sur la pilule la déplie pour afficher les détails. Un nouveau clic la replie.
Les clics passent à travers la fenêtre partout ailleurs, donc elle ne gêne pas les autres applications.

## Installation

Il faut [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
git clone https://github.com/VOTRE-NOM/dynamic-island-pc.git
cd dynamic-island-pc
npm install
npm start
```

Une icône apparaît près de l’horloge. Clic droit dessus :

- **Tester une tâche** : musique, minuteur, notification, copie de fichier ;
- **Terminer la tâche en cours** ;
- **Lancer au démarrage de Windows** ;
- **Quitter**.

## Fonctionnalités

| Tâche | Comportement |
| --- | --- |
| Batterie faible | Automatique : s’affiche à 20 % ou moins sur batterie, disparaît au branchement du chargeur |
| Musique | Reste affichée jusqu’à `POST /end` |
| Minuteur | Se termine à 0 |
| Notification | Dure quelques secondes (4 par défaut) |
| Progression (copie, téléchargement…) | Se termine à 100 % |

## Piloter l’île depuis un autre programme

L’application écoute sur `127.0.0.1:41234` (uniquement cette machine). Exemples PowerShell :

```powershell
# Notification
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:41234/task -ContentType 'application/json' `
  -Body '{"type":"notif","title":"Koffi","text":"On se voit à 18 h ?"}'

# Musique (reste jusqu’à /end)
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:41234/task -ContentType 'application/json' `
  -Body '{"type":"music","title":"Nuit blanche","artist":"Aya"}'

# Minuteur de 90 secondes
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:41234/task -ContentType 'application/json' `
  -Body '{"type":"timer","seconds":90}'

# Progression : renvoyer la requête avec une nouvelle valeur pour la mettre à jour
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:41234/task -ContentType 'application/json' `
  -Body '{"type":"progress","label":"Copie en cours","value":40}'

# Terminer la tâche en cours
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:41234/end
```

Types acceptés : `music`, `timer`, `notif`, `progress`.

## Créer l’installeur Windows

```bash
npm run dist
```

L’installeur `.exe` est créé dans le dossier `dist/`.

## Publier sur GitHub

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM/dynamic-island-pc.git
git push -u origin main
```

Pour obtenir l’installeur automatiquement, créez un tag. GitHub Actions construit alors l’`.exe` et l’ajoute à une release :

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Structure

```
src/main.js       fenêtre transparente, icône de zone de notification, API locale
src/preload.js    pont sécurisé entre main et renderer
src/renderer.js   animations (bulle → pilule → boule) et tâches
src/index.html    page de la fenêtre
src/style.css     style
assets/icon-pc.png, icon-pc.ico   icône de la version PC
assets/mobile/    icônes de la version mobile (512 et 1024 px)
assets/source-image.jpg   image d’origine
.github/workflows/build.yml   build Windows automatique
```

## Licence

MIT
