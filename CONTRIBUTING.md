# Contribuer à JobMatchPilot

## Installation

```bash
npm ci
npx prisma generate
docker compose up -d db
npx prisma migrate deploy
npm run dev
```

## Avant une proposition de modification

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```

Ne jamais ajouter de fichier `.env`, clé API, CV réel, export utilisateur ou base locale. Les modifications issues du projet JobSync ou du code JobSpy doivent conserver leurs licences et attributions.

Les contributions doivent rester limitées, testables et accompagnées d’une explication claire du problème résolu.
