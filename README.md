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

## Trouver des commerces

Page **Trouver des commerces** : recherche dans l'annuaire officiel (API Recherche d'entreprises, gratuite, sans clé) par ville, code postal ou département, et par type de commerce. Jusqu'à 20 commerces indépendants et ouverts, avec nom, activité, adresse et SIRET. Les fiches ajoutées arrivent à l'étape « Repéré » avec le rappel « À analyser », la source « data.gouv.fr » et la date du jour. Aucun doublon par SIRET. Après une mise à jour, lance `npm run installer` (ajoute les colonnes SIRET et adresse sans toucher à tes données).

## Contacter les prospects (email)

1. **Entreprises** : coche les prospects qui ont une adresse email enregistrée (20 au plus), puis **Préparer les brouillons**. Les cases sont grisées pour les prospects sans email, opposés, qui ont déjà répondu, clients, disqualifiés ou en pause : survole la case pour voir le motif.
2. **Contacter les prospects** : relis chaque brouillon, remplace chaque texte « [À compléter… » (une phrase personnelle, et l'origine de l'adresse quand elle est inconnue), puis **Enregistrer**.
3. Coche « J'ai relu… et je valide ce lot », puis **Valider et envoyer**. Juste avant chaque envoi, le CRM revérifie l'opposition, les réponses et l'adresse.

Règles : un premier email, puis une seule relance 7 jours après au plus tôt (section « Relances possibles »). Une réponse ou une opposition notée sur la fiche arrête tout. Jamais deux fois le même email au même prospect, et 20 emails par jour au plus. Chaque envoi est noté au **Journal des envois** (date, destinataire, succès ou échec) et dans le journal des interactions. Une réponse « STOP » : bouton **A répondu STOP**.

Configuration (une seule fois) : ajoute dans `.env.local`, puis redémarre le CRM :

```
SMTP_HOTE=smtp.gmail.com
SMTP_PORT=465
SMTP_UTILISATEUR=ton-adresse@ton-domaine.fr
SMTP_MOT_DE_PASSE=mot-de-passe-d-application
EMAIL_NOM=Ambika
EMAIL_IDENTITE=Ambika Seenaram — BE SEEN, Social Media Manager freelance (restaurants et commerces de bouche), Seine-et-Marne — SIRET …
```

Les emails partent de ta propre boîte mail professionnelle, un par un, en texte simple. Le mot de passe reste dans `.env.local` (jamais dans Git ni dans le navigateur). Après une mise à jour, lance `npm run installer` (ajoute la table des envois).
