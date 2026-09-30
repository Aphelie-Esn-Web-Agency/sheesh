# Exemples Jev AI chez Sheesh

> Sheesh est une entreprise fictive créée pour illustrer ces exemples. Les volumes et situations décrits sont illustratifs. Ils ne constituent pas une réalisation client d'Aphélie.

Ce dépôt compagnon implémente uniquement les cas **04, 14 et 15** du [brief](docs/brief-cocon-jev-ai.md). Il illustre une architecture proposée, pas des résultats mesurés. Les fonctions de décision sont testées sans réseau avec des réponses synthétiques clairement identifiées dans les tests.

## Installation

Utilisez Node.js 22 LTS (ou une version compatible indiquée dans `package.json`) et npm. Depuis la racine du dépôt :

```sh
npm ci
cp .env.example .env
```

Renseignez `OPENROUTER_API_KEY` dans votre fichier local `.env`. Ne publiez jamais ce fichier ni votre clé. Les fichiers `.env` et `results/` sont ignorés par Git.

```dotenv
OPENROUTER_API_KEY=
JEV_MODEL=jev-1.13
LLM_MODEL_SMALL=
LLM_MODEL_LARGE=
DRY_RUN=true
```

Les scripts chargent `.env` automatiquement ; les variables déjà définies dans votre environnement restent prioritaires. `JEV_MODEL` est figé à `jev-1.13`. Les trois cas actuels n'appellent aucun LLM génératif : vous pouvez laisser les deux variables `LLM_MODEL_*` vides. Si vous utilisez `askLlm`, renseignez la variable correspondant à la taille demandée avec un identifiant choisi dans le catalogue OpenRouter. Aucun modèle génératif n'est codé en dur.

## Exécution

```sh
npm run case:04 -- fixtures/04/bug-bloquant.json
npm run case:14 -- fixtures/14/paiement-semantique.json
npm run case:15 -- fixtures/15/coordonnees-structurees.json
npm run run-all
```

`run-all` exécute séquentiellement les 18 fixtures, uniquement pour ces trois cas. **Même en dry-run, les appels Jev sont réels et peuvent être facturés.** Les actions Asana, Slack, GitHub et l'envoi vers un tiers sont uniquement simulés, affichés en console et enregistrés dans le journal. Aucun compte tiers n'est nécessaire.

`DRY_RUN` vaut `true` par défaut. Toute autre valeur est refusée avant l'appel Jev : les adaptateurs de production ne sont pas implémentés dans ce livrable. Une entrée locale de revue humaine est alors journalisée. Le dry-run ne prétend pas créer une vraie tâche humaine.

Les résultats sont écrits dans `results/<cas>/<id-fixture>.json`. Les identifiants des fixtures fournies correspondent à leurs noms de fichiers. Une nouvelle exécution remplace le résultat de la même fixture. Le journal contient :

- les attentes humaines `attendu` et la décision métier, à comparer manuellement ;
- les réponses réellement reçues, le modèle retourné, l'usage et le coût fournis par Jev ;
- la latence mesurée côté client, la présence d'une troncature et les actions simulées ;
- une erreur explicite en cas d'échec, avec `response: null` si aucune réponse valide n'a été reçue.

Aucune réponse Jev n'est déduite du champ `attendu`. Les cas capturent les erreurs pour demander une revue humaine. Un échec d'exécution donne un code de sortie non nul ; `run-all` poursuit les fixtures suivantes. Une revue humaine motivée par l'incertitude est une décision métier normale. Une erreur de lecture ou d'écriture locale est signalée en console.

## Rapport local

```sh
npm run report
```

Cette commande lit les journaux `results/<cas>/*.json` et crée ou remplace `results/rapport.md`, sans clé ni appel réseau. Elle ne modifie pas les journaux et ne relance aucun cas. Le rapport contient un tableau par cas : fixture, décision attendue, décision obtenue, valeurs Jev, coût `usage.cost` en USD, latence en millisecondes et conformité. Il se termine par le coût total et les taux de conformité par cas.

La comparaison vérifie les champs présents dans `attendu`, en ignorant `note`. Les listes, notamment `labels` et `motifs`, doivent contenir exactement les mêmes éléments, sans tenir compte de leur ordre. Les champs supplémentaires de la décision ne pénalisent pas la comparaison. Une erreur d'exécution, une réponse absente, une troncature ou un journal invalide compte comme non conforme. Le dénominateur comprend tous les fichiers JSON présents pour le cas ; une fixture sans journal n'est pas évaluée. Un coût absent est signalé comme inconnu et le total est alors explicitement partiel. Avant toute exécution, la commande produit un rapport vide. Le rapport reste local et ignoré par Git comme le reste de `results/`.

## Les trois cas

| Cas | Questions | Règles et actions proposées |
| --- | --- | --- |
| 04 | `equipe`, `type_demande`, `bloquant` | Affectation interne Asana corrigeable, Slack si blocage net, revue humaine si doute. Il ne s'agit pas du support client. |
| 14 | Authentification, paiement, données personnelles, migration, infrastructure | Règles déterministes prioritaires, complétées par les signaux Jev. Labels et demande de revue senior simulés. Jamais d'approbation automatique. |
| 15 | Santé, mineur, identité, finances personnelles, localisation précise | Masquage des données structurées avant Jev, puis proposition d'envoi normal, d'anonymisation ou de blocage. Doute et échec vers un humain. |

Chaque cas exporte `QUESTIONS`, `THRESHOLDS`, `decide` et `run`. Les seuils de confiance et de noul sont des **valeurs de départ à calibrer sur vos données**. Les probabilités noul sont indépendantes. La confiance de `choice` ne représente pas un taux de bonnes réponses.

Pour le cas 04, les actions conservent l'équipe initiale et des champs `equipe_finale` et `reaffectee` initialement nuls. Une intégration réelle devra les renseigner après correction humaine. Le taux de réaffectation se calcule alors sur les affectations effectivement relues ; aucune mesure n'est inventée ici.

Pour le cas 14, `fichiers` alimente les règles de chemins. `codeowners` est la liste des propriétaires **déjà résolus pour ces fichiers par votre intégration**. Ce dépôt ne réimplémente pas le moteur de correspondance CODEOWNERS. Les labels déterministes ne peuvent pas être supprimés par Jev ; ils restent dans les métadonnées du journal même en cas d'échec. Une PR non sensible suit une revue standard, jamais une validation automatique. Le diff est inclus dans le contexte et soumis au garde-fou de taille du client.

L'exemple [GitHub Action](github/jev-pr-review.yml), désactivé tant qu'il reste dans `github/`, lance manuellement une fixture du cas 14. Pour l'essayer, copiez-le dans `.github/workflows/`, configurez le secret `OPENROUTER_API_KEY` puis lancez le workflow. Il utilise uniquement les permissions de lecture et ne commente, ne labellise et n'approuve aucune PR réelle. Le traitement d'événements de PR et la résolution CODEOWNERS restent à raccorder à votre intégration.

Pour le cas 15, les expressions régulières ciblent emails, téléphones, IBAN et numéros de carte présumés. Les valeurs des fixtures sont des données de démonstration. Le texte masqué est envoyé à Jev, qui reste un service externe et peut recevoir des informations sémantiques sensibles non couvertes par les regex. Les textes original et masqué ne sont pas journalisés ni imprimés. L'action de sortie simule une intention d'envoi sans transmettre ni conserver le message. Le terme `anonymisation` désigne ici le masquage des motifs reconnus, sans garantie d'anonymat. **Ce filtre ne garantit pas la conformité RGPD et ne remplace pas une analyse juridique.** Les regex peuvent manquer des formats inhabituels ou masquer trop de texte.

## Client HTTP et limites

`src/lib/jev.ts` utilise `fetch` natif vers `POST https://openrouter.ai/api/v1/systemone`, sans SDK Jev. Il expose `askJev(state, questions, { timeoutMs, retryDelayMs })` :

- timeout de 10 secondes par essai, lecture du corps comprise, avec `AbortController` ;
- un seul nouvel essai sur HTTP 429 ou 5xx, après une seconde par défaut ;
- aucune nouvelle tentative sur les autres erreurs HTTP, les erreurs réseau ou les timeouts ;
- validation de `choice`, `probabilities`, `confidence`, `noul`, `usage` et `model` ;
- estimation grossière à quatre caractères par token et troncature à 119 996 caractères, sous 30 000 tokens estimés ;
- avertissement et revue humaine obligatoire si le contexte a été tronqué.

L'estimation n'est pas une tokenisation exacte et ne garantit pas le respect des 32 000 tokens de contexte OpenRouter, notamment avec les questions et certains alphabets. Les questions de ces exemples sont courtes. La latence comprend les éventuels essais et délais. Les corps d'erreur du fournisseur ne sont pas recopiés dans les journaux.

`src/lib/llm.ts` utilise le même transport vers `chat/completions` et les variables de modèle. La primitive `score` n'est ni implémentée ni utilisée : son schéma doit d'abord être vérifié dans la documentation TypeSafe.

Les faits et formats employés proviennent de la section 3 du brief, vérifiés par le commanditaire le **25 septembre 2026**, avec un listing OpenRouter indiqué en **bêta**. Ce livrable ne constitue pas une nouvelle vérification des services : [documentation OpenRouter](https://openrouter.ai/docs/guides/community/typesafe-sdk), [modèle Jev](https://openrouter.ai/typesafe/jev-1.13), [documentation TypeSafe](https://docs.typesafe.ai/introduction).

## Tests sans réseau

```sh
npm run typecheck
npm test
```

Aucune clé n'est nécessaire. Les tests couvrent les fonctions pures `decide`, les bornes des seuils, les réponses invalides, la priorité des règles déterministes, le masquage, les routes d'échec et le transport HTTP simulé. Ils ne créent aucun résultat prétendument observé et ne déclenchent aucune action externe. Les fixtures sont les entrées de futures évaluations réelles, pas des réponses préenregistrées.

## Résultats réels à venir

Les résultats seront produits lorsque vous exécuterez les scripts avec votre clé. Comparez les décisions avec `attendu`, relevez les désaccords et calibrez les questions et seuils avant toute intégration. Les emplacements rédactionnels de la section 9 seront complétés avec vos réponses réelles lors des livrables concernés.

<!-- RESULTAT_REEL cas=04 fixture=bug-bloquant -->
> **Résultat réel à venir.** Cet emplacement accueillera la réponse JSON retournée par Jev pour ce message, ainsi que son interprétation.
<!-- /RESULTAT_REEL -->

<!-- RESULTAT_REEL cas=14 fixture=paiement-semantique -->
> **Résultat réel à venir.** Cet emplacement accueillera la réponse JSON retournée par Jev pour ce message, ainsi que son interprétation.
<!-- /RESULTAT_REEL -->

<!-- RESULTAT_REEL cas=15 fixture=coordonnees-structurees -->
> **Résultat réel à venir.** Cet emplacement accueillera la réponse JSON retournée par Jev pour ce message, ainsi que son interprétation.
<!-- /RESULTAT_REEL -->
