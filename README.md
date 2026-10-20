# BE SEEN · CRM de prospection

Application locale, une seule utilisatrice. Next.js + TypeScript + Tailwind + SQLite.
Aucune intégration externe : rien ne quitte ton ordinateur.

## Installation (une seule fois)

1. Installe **Node.js 22 LTS** depuis nodejs.org (Mac ou Windows).
2. Ouvre un terminal dans le dossier du projet, puis lance :

```bash
npm install          # installe les dépendances
npm run installer    # crée le secret de session et la base de données
npm run compte:creer # crée ton compte (email + mot de passe, 10 caractères minimum)
```

L'inscription se ferme dès que le compte existe.

## Utilisation au quotidien

```bash
npm run dev
```

Puis ouvre http://localhost:3000 dans ton navigateur.

## Données de démonstration (fictives)

```bash
npm run demo:remplir   # ajoute des prospects inventés, préfixés « [DÉMO] »
npm run demo:vider     # supprime uniquement ces fiches fictives
```

Aucune donnée client réelle n'est utilisée.

## Raccourcis

- **N** : ajout rapide d'un prospect (depuis n'importe quelle page)
- **Échap** : ferme une fenêtre ou la fiche

## Mot de passe oublié

Aucun email n'est envoyé. Lance `npm run compte:mdp`.
Les sessions déjà ouvertes sont automatiquement déconnectées.

## Sauvegarde

Toutes tes données sont dans **un seul fichier** : `data/be-seen.db`.
Copie-le régulièrement (clé USB, cloud perso). Il n'est jamais envoyé sur GitHub.

## Après une mise à jour du code

```bash
npm install
npm run installer    # applique les changements de la base, sans effacer tes données
```

## Export, sauvegarde et purge

Page **Export et données** :

- **Export CSV** (prospects, affaires, historique d'échanges) : s'ouvre dans Excel, accents corrects. Depuis les pages Entreprises et Journal, le bouton « Exporter ce filtre » ne contient que la liste filtrée.
- **Sauvegarde** : télécharge une copie complète de la base. À restaurer en remplaçant `data/be-seen.db` (CRM arrêté).
- **Purge RGPD** : liste les prospects sans échange depuis plus de 3 ans. Rien n'est supprimé sans ta validation ; les clients et les entreprises en opt-out ne sont jamais proposés.
