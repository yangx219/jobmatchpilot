# Origine open source et contributions

JobMatchPilot est construit à partir de [JobSync v1.2.0](https://github.com/gsync/jobsync), récupéré le 30 octobre 2026. JobSync est distribué sous licence MIT ; son copyright et sa licence sont conservés dans le fichier `LICENSE`.

## Fonctionnalités héritées de JobSync

- comptes locaux et authentification ;
- gestion des CV, offres, entreprises et contacts ;
- tableau de bord et suivi des candidatures ;
- tâches, activités et préparation aux entretiens ;
- configuration de fournisseurs IA ;
- une partie importante des composants, actions et tests existants.

Ces éléments ne sont pas présentés comme des créations originales de JobMatchPilot.

## Contributions JobMatchPilot

- nouvelle identité produit et parcours utilisateur restructuré ;
- regroupement des tâches et activités ;
- regroupement de la préparation aux entretiens et de la banque de questions ;
- refonte de la découverte d’offres en parcours guidé ;
- recherche multi-source Greenhouse, Lever et Ashby ;
- intégration optionnelle de JobSpy pour LinkedIn, Indeed, HelloWork et Glassdoor ;
- normalisation, filtrage et déduplication partagés ;
- file PostgreSQL persistante, worker séparé, reprise et historique d’exécution ;
- fonctionnement sans modèle IA pour la collecte standard ;
- isolation et traçabilité des données utilisateur ;
- internationalisation français, anglais et chinois ;
- améliorations responsive et validation desktop/mobile.

## JobSpy

Le répertoire `vendor/jobspy/` conserve le code, le README, le fichier de configuration et la licence MIT du projet [speedyapply/JobSpy](https://github.com/speedyapply/JobSpy). L’intégration JobMatchPilot se trouve principalement dans `scripts/collectors/jobspy_bridge.py` et `src/lib/scraper/jobspy/`.

JobMatchPilot ne présente pas le moteur JobSpy comme une création personnelle. Les contributions portent sur son exécution isolée, la validation de ses résultats, son raccordement aux tâches privées, la santé des sources et la déduplication commune.

## Principe de présentation

Dans le CV et en entretien, les fonctionnalités héritées, adaptées et nouvellement développées doivent rester clairement distinguées. L’utilisation d’une base open source ou d’outils d’IA n’enlève pas la valeur du travail d’intégration, mais ne doit jamais conduire à revendiquer un code ou une architecture qui n’a pas été personnellement conçu.
