# Cahier des charges et brief rédactionnel
# Cocon sémantique « Jev AI » pour le blog Aphélie

Version 1.0, 25 septembre 2026

---

## 0. Instructions pour le rédacteur (à lire en premier)

Tu es chargé de produire un ensemble d'articles de blog techniques en français, accompagnés d'un dépôt de code Node / TypeScript et d'un logo SVG. Ce document est ta source unique de vérité.

Règles impératives :

1. **Ne jamais inventer un résultat d'appel Jev.** Aucune valeur de sortie (probabilité, `noul`, `confidence`, `usage`) ne doit apparaître comme observée si elle n'a pas été fournie par le commanditaire. Utilise les emplacements « Résultat réel » décrits en section 9.
2. **Ne jamais inventer un fait sur Jev, TypeSafe ou un fournisseur.** Utilise uniquement les faits de la section 3. Si tu as besoin d'une information absente, écris `[À VÉRIFIER : question précise + URL de doc à consulter]`.
3. **Aucun tiret cadratin (—) ni demi-cadratin (–) utilisé comme ponctuation** dans les textes rédigés. Utilise des virgules, deux-points ou parenthèses.
4. **Vouvoiement** du lecteur dans tous les articles.
5. **Sheesh est une entreprise fictive.** Aucune mention d'une autre entreprise réelle comme client, ni d'une réalisation client d'Aphélie.
6. Livre les éléments **dans l'ordre de la section 13**, un livrable à la fois, et attends validation avant de passer au suivant.

---

## 1. Contexte et objectifs

### 1.1 L'éditeur

Aphélie est une agence française « Digital & IA » (sites web, applications, IA et automatisation, intégrations n8n et HubSpot). Blog : https://www.aphelie.com/blog

### 1.2 L'article existant (page mère du cocon)

**JEV AI : cas concrets et méthode pour vos automatisations**
https://www.aphelie.com/blog/jev-ai-cas-usage-automatisation

Il couvre déjà, et il ne faut donc PAS le répéter en détail :

1. Ce qu'est Jev et ses trois primitives (`choice`, `score`, `noul`)
2. Des cas documentés (MindStudio, DocJev, préprint JEV-as-a-Judge)
3. Quatre applications à prototyper : orienter les demandes de support client, préparer les demandes commerciales, préclasser des pièces reçues, sélectionner des retours produits à analyser
4. Les bonnes pratiques : questions atomiques, différence entre score métier et confiance, seuils à tester
5. Un exemple retail réel et testé : une cliente a reçu des chaussures trop petites et demande un remboursement (avec trois variantes et les JSON réels)
6. Où tester Jev (OpenRouter, API TypeSafe, Vercel AI Gateway, Cloudflare Workers AI)
7. Les coûts pour 1 000 appels en euros
8. Un protocole d'évaluation (jeu de référence, comparaison, observation avant action)
9. Quand garder une autre approche

Ancres utiles de la page mère (à utiliser pour les liens profonds) :

| Sujet | Ancre |
|---|---|
| Primitives | `#ce-que-jev-fait-dans-un-workflow` |
| Bonnes pratiques et confiance | `#la-meilleure-façon-de-lutiliser-des-questions-précises-des-actions-maîtrisées` |
| Exemple retail chaussures | `#exemple-retail-des-chaussures-trop-petites-et-une-demande-de-remboursement` |
| Accès fournisseurs | `#où-tester-jev-facilement` |
| Coûts | `#combien-coûtent-1-000-interrogations-en-euros` |
| Protocole d'évaluation | `#comment-savoir-si-jev-apporte-un-gain-chez-vous` |
| Limites | `#quand-garder-une-autre-approche` |

### 1.3 Objectif du projet

Construire un cocon sémantique autour de Jev :

1. Un **article hub** « 10 exemples concrets d'utilisation de Jev AI »
2. Six **articles satellites** détaillant les cas qui enchaînent plusieurs appels (Jev, LLM génératif, outils tiers)
3. Un **dépôt de code** Node / TypeScript permettant de reproduire chaque exemple en conditions réelles
4. Des **insertions de liens** dans la page mère
5. Un **logo fictif** pour l'entreprise d'exemple Sheesh

Le lecteur cible : développeurs, CTO, responsables ops et automatisation de PME et ETI, à l'aise avec une API mais pas forcément experts en IA.

---

## 2. Ligne éditoriale

Reprendre le ton de la page mère :

1. Sérieux, précis, pédagogique, sans enthousiasme marketing
2. Distinction systématique entre **architecture proposée** et **résultat mesuré**
3. Prudence sur les chiffres : les chiffres de Sheesh sont fictifs et le texte le dit
4. Rappel constant que Jev **oriente** et que le **code métier ou un humain exécute** (« détecter une demande de remboursement n'autorise pas à rembourser »)
5. Phrases courtes, paragraphes de 2 à 4 phrases, intertitres explicites
6. Chaque affirmation factuelle sur Jev ou un fournisseur renvoie à une source (lien)
7. Mentionner la date de vérification des informations (« vérifié le 25 septembre 2026 ») et le statut bêta sur OpenRouter

Interdits :

1. Tirets cadratins et demi-cadratins comme ponctuation
2. Superlatifs non étayés (« révolutionnaire », « incroyable »)
3. Promesse de gain chiffré en production
4. Présenter Jev comme capable de rédiger, résumer ou raisonner
5. Inventer des noms de modèles LLM : utiliser des variables d'environnement (voir section 8)

---

## 3. Faits vérifiés sur Jev (source unique)

### 3.1 Nature du modèle

1. Jev est un modèle de décision de TypeSafe AI, premier modèle de la famille « System One ». Il renvoie des décisions typées, pas du texte. Sources : https://typesafe.ai/ et https://docs.typesafe.ai/concepts/system-one
2. Trois primitives : `choice` (catégorie parmi une liste définie), `score` (position sur une échelle décrite), `noul` (valeur entre 0 et 1 pour une proposition). Source : https://docs.typesafe.ai/introduction
3. `choice` et `score` renvoient des probabilités et un champ `confidence`. `noul` ne renvoie pas de champ `confidence`.
4. La `confidence` résume la forme de la distribution des probabilités ; elle ne doit pas être lue comme un taux de réponses correctes. Source : https://docs.typesafe.ai/confidence
5. Plusieurs questions peuvent être posées dans un même appel, sur un contexte commun (`state`).
6. Jev ne sait pas rédiger, résumer, extraire des thèmes libres ni expliquer son raisonnement.

### 3.2 Accès via OpenRouter (accès retenu pour le code)

1. Endpoint : `POST https://openrouter.ai/api/v1/systemone` (ce n'est pas l'endpoint chat completions)
2. Authentification : `Authorization: Bearer <clé OpenRouter>`
3. Identifiants de modèle : `jev-1.13` est routé vers `typesafe/jev-1.13` ; `jev-latest` vers `~typesafe/jev-latest`. Utiliser `jev-1.13` (version figée) dans le code.
4. Tarif : 0,042 $ par million de tokens d'entrée, 0 $ en sortie
5. Contexte maximal sur OpenRouter : 32 000 tokens par requête (l'article MindStudio évoque 64 000 tokens ; retenir 32 000 pour OpenRouter)
6. Listing en bêta, lancé le 18 septembre 2026
7. Sources : https://openrouter.ai/docs/guides/community/typesafe-sdk et https://openrouter.ai/typesafe/jev-1.13

### 3.3 Format de requête

```json
{
  "model": "jev-1.13",
  "state": "Texte du contexte à évaluer",
  "questions": {
    "cle_question_choice": {
      "type": "choice",
      "instructions": "Question posée",
      "criteria": {
        "categorie_a": "Description précise de la catégorie A",
        "categorie_b": "Description précise de la catégorie B"
      }
    },
    "cle_question_noul": {
      "type": "noul",
      "instructions": "Proposition à évaluer"
    }
  }
}
```

**Primitive `score` : schéma de requête NON documenté ici.** Avant de l'utiliser, écrire `[À VÉRIFIER : schéma de la question score, voir https://docs.typesafe.ai/introduction]` dans le code et l'article. Ne pas deviner les champs.

### 3.4 Format de réponse réel observé (issu de la page mère)

```json
{
  "model": "typesafe/jev-1.13-20260917",
  "answers": {
    "sujet_principal": {
      "type": "choice",
      "choice": "retour_produit",
      "probabilities": { "retour_produit": 1, "livraison": 0, "paiement": 0 },
      "confidence": 1
    },
    "demande_remboursement": { "type": "noul", "noul": 0.99 },
    "demande_echange": { "type": "noul", "noul": 0.05 }
  },
  "usage": { "input_tokens": 450, "output_tokens": 94, "cost": 1.89e-05 },
  "provider": "TypeSafe"
}
```

Remarques à respecter :

1. Les valeurs `noul` de plusieurs questions sont indépendantes et n'ont pas à totaliser 1
2. Le champ `usage.cost` permet de mesurer le coût réel
3. La réponse ne contient pas de durée d'exécution : mesurer la latence côté client si nécessaire

### 3.5 Différences entre fournisseurs

1. Vercel AI Gateway : modèle `typesafe-ai/jev`, primitive binaire nommée `boolean` (et non `noul`)
2. Cloudflare Workers AI : `env.AI.run('typesafe/jev', { state, questions })`
3. API TypeSafe directe : `POST https://api.typesafe.ai/v1/systemone`

Le code ne cible qu'OpenRouter. Les articles peuvent signaler ces différences en renvoyant vers `#où-tester-jev-facilement` de la page mère.

### 3.6 Sources citables

1. MindStudio, 12 Jev Use Cases Tested : https://www.mindstudio.ai/blog/jev-use-cases-automation
2. Préprint JEV-as-a-Judge (22 septembre 2026) : https://arxiv.org/abs/2609.26550 (cascade qui accepte les verdicts confiants et escalade les incertains ; écarts plus importants sur les jugements demandant de vérifier un raisonnement ou de résister à une réponse fausse persuasive)
3. TypeSafe Patterns : https://docs.typesafe.ai/patterns
4. TypeSafe Models : https://docs.typesafe.ai/models

---

## 4. L'entreprise fictive : Sheesh

### 4.1 Fiche

| Élément | Valeur (fictive) |
|---|---|
| Nom | Sheesh |
| Activité | Sneakers reconditionnées vendues en ligne + abonnement d'entretien (nettoyage, réparation, collecte et retour à domicile) |
| Siège | Lyon |
| Création | 2021 |
| Effectif | 45 salariés |
| Abonnés | environ 18 000 |
| Service client | 8 conseillers, téléphone, email, chat |
| Équipe tech | 6 personnes, stack Node / TypeScript, dépôt GitHub |
| Outils | CRM HubSpot, téléphonie VoIP à webhooks, Slack, Asana, blog SEO, n8n |
| Enjeu | Automatiser les décisions répétitives sans faire exploser la facture LLM ni perdre le contrôle |

### 4.2 Personnages récurrents

1. **Inès**, CTO : fil rouge du cocon, pragmatique, obsédée par la maîtrise des coûts et la réversibilité des automatisations
2. **Karim**, responsable service client : exprime les besoins métier des cas 1, 2, 3
3. **Léa**, responsable contenu et SEO : cas 12 et 20

### 4.3 Règles d'usage

1. Chaque article commence par un encadré : « Sheesh est une entreprise fictive créée pour illustrer ces exemples. Les volumes et situations décrits sont illustratifs. Ils ne constituent pas une réalisation client d'Aphélie. »
2. Continuité avec la page mère : le message « chaussures trop petites » de l'exemple retail peut être présenté comme un message typique reçu par Sheesh, avec lien vers l'ancre `#exemple-retail-des-chaussures-trop-petites-et-une-demande-de-remboursement`. Ne pas réécrire cet exemple.
3. Les outils cités (HubSpot, Slack, Asana, GitHub, n8n) sont présentés comme interchangeables.

---

## 5. Logo Sheesh

Livrable : deux fichiers SVG autonomes, `sheesh-logo-light.svg` (fond clair) et `sheesh-logo-dark.svg` (fond sombre).

1. Wordmark « sheesh » en minuscules, typographie sans empattement arrondie, dessinée en tracés (pas de dépendance à une police externe)
2. Élément graphique : une **semelle stylisée vue de côté** placée sous le mot, avec des motifs de crampons (points ou petits rectangles)
3. **Interdiction de toute courbe évoquant un logo de marque existante** (en particulier aucune forme de virgule ou de « swoosh »), ni ressemblance avec un logo réel
4. Palette : une couleur d'accent chaude (par exemple orange corail `#FF5A36`) + un neutre (`#141414` en version claire, `#F5F5F0` en version sombre)
5. ViewBox horizontal (environ 4:1), lisible à 32 px de hauteur
6. Code SVG propre : pas d'images embarquées, `<title>Sheesh</title>` pour l'accessibilité

---

## 6. Architecture du cocon

```
Page mère (existante)
JEV AI : cas concrets et méthode
/blog/jev-ai-cas-usage-automatisation
        │
        ▼
Hub (nouveau)
10 exemples concrets d'utilisation de Jev AI
/blog/jev-ai-10-exemples-concrets
        │
        ├── S1 Appels manqués et transcriptions (cas 1 et 2)
        ├── S2 Risque de churn et relance rédigée par un LLM (cas 3)
        ├── S3 Contrôle qualité de contenus IA (cas 12)
        ├── S4 Garde-fou Jev pour agent IA ou serveur MCP (cas 16)
        ├── S5 Cascade de modèles (cas 17)
        └── S6 Veille concurrentielle automatisée (cas 20)
```

### 6.1 Slugs, titres et intentions

| Article | Slug | Titre (H1) proposé | Mot-clé principal |
|---|---|---|---|
| Hub | `jev-ai-10-exemples-concrets` | 10 exemples concrets d'utilisation de Jev AI (avec le code pour les reproduire) | exemples Jev AI |
| S1 | `jev-ai-appels-manques-transcriptions` | Jev AI : trier les appels manqués et tagguer les transcriptions d'appels | automatiser appels manqués IA |
| S2 | `jev-ai-detection-churn-relance` | Jev AI : détecter le risque de résiliation et préparer une relance avec un LLM | détection churn IA |
| S3 | `jev-ai-controle-qualite-contenu-ia` | Jev AI : contrôler la qualité des contenus générés par IA avant publication | contrôle qualité contenu IA |
| S4 | `jev-ai-garde-fou-agent-mcp` | Jev AI : ajouter un garde-fou à un agent IA ou un serveur MCP | sécuriser agent IA |
| S5 | `jev-ai-cascade-modeles-llm` | Jev AI : une cascade de modèles pour ne payer le gros LLM que si nécessaire | routage LLM coût |
| S6 | `jev-ai-veille-concurrentielle` | Jev AI : automatiser une veille concurrentielle qui ne remonte que l'essentiel | veille concurrentielle automatisée |

Le hub ne doit pas cibler « JEV AI cas d'usage automatisation » (intention de la page mère) pour éviter la cannibalisation.

### 6.2 Maillage interne obligatoire

Liens verticaux :

1. Hub vers page mère : dans l'introduction (fondamentaux), dans chaque cas au moment de parler des seuils (ancre bonnes pratiques), en fin d'article (protocole d'évaluation et coûts)
2. Hub vers chaque satellite : lien contextuel dans le texte du cas + encadré « Mise en œuvre détaillée : [titre du satellite] »
3. Chaque satellite vers le hub (introduction et conclusion)
4. Chaque satellite vers la page mère : ancres accès fournisseurs, coûts, protocole d'évaluation

Liens transversaux :

1. S1 vers S2 : les tags d'appels alimentent le score de risque de churn
2. S2 vers S1 : origine des tags
3. S3 vers S5 : même principe de vérification par Jev
4. S5 vers S3 : application au contenu
5. S4 vers le cas 15 du hub (ancre du cas) : filtrer les données personnelles avant qu'un agent les transmette
6. S6 vers S3 : le digest hebdomadaire peut passer par le contrôle qualité

Liens vers les contenus et services Aphélie :

1. S1 vers https://www.aphelie.com/blog/openai-realtime-api-agents-vocaux-traduction-transcription (étape de transcription)
2. S5 vers https://www.aphelie.com/blog/fable-5-ia-souverainete-europeenne (une cascade multi-fournisseurs réduit aussi la dépendance à un seul fournisseur)
3. Hub (section PHP) vers https://www.aphelie.com/blog/laravel-ai-sdk
4. Variantes n8n vers https://www.aphelie.com/services/n8n
5. S1 et S2 vers https://www.aphelie.com/services/integrations-hubspot
6. Chaque article, en conclusion, vers https://www.aphelie.com/services/ia-et-automatisation

Ancres des liens : descriptives et variées, jamais « cliquez ici ».

---

## 7. Contenu du hub (4 000 à 5 000 mots)

### 7.1 Plan

1. Introduction : pourquoi confier des décisions à un modèle qui n'écrit pas ; renvoi vers la page mère pour les fondamentaux
2. Encadré Sheesh (section 4.3)
3. Le schéma commun aux 10 exemples : **entrée → questions Jev → règles applicatives → action réversible, LLM ou humain**
4. Rappel express des trois primitives (5 lignes max, lien page mère)
5. Les 10 exemples (gabarit 7.2)
6. Appeler Jev depuis Laravel : un seul extrait PHP équivalent à l'appel de base (Http client Laravel), lien vers l'article Laravel AI SDK
7. Ce que ces exemples ont en commun : ce qui reste au code, ce qui reste à l'humain
8. Quand ne pas utiliser Jev (lien page mère)
9. Reproduire les exemples : lien vers le dépôt de code, commandes d'installation
10. FAQ (5 questions, balisables en FAQPage)
11. Sources

### 7.2 Gabarit de chaque exemple

1. **Titre H2** numéroté
2. **La situation chez Sheesh** (3 à 5 lignes, qui, quoi, volume illustratif)
3. **La décision confiée à Jev** (1 phrase)
4. **Les questions Jev** : JSON complet de la requête
5. **L'enchaînement** : diagramme Mermaid (bloc ```mermaid) de décision et actions
6. **Garde-fous** : ce qui reste au code métier, ce qui reste à un humain
7. Pour les cas 4, 14, 15 : **code TypeScript complet** du cas + emplacement « Résultat réel »
8. Pour les autres : extrait clé + encadré vers le satellite
9. **Ordre de grandeur de coût** : formule de la page mère, sans valeur inventée (hypothèse de tokens explicitement signalée)

### 7.3 Contenu attendu des 10 exemples

#### Exemple 1 : Trier les appels manqués (détail en S1)

1. Situation : environ 120 appels manqués par jour (illustratif), mêlant prospects, abonnés, réclamations, fournisseurs et démarchage
2. Entrée (`state`) : numéro connu ou non, heure, fiche CRM résumée (statut abonné, dernier ticket), transcription du message vocal s'il existe
3. Questions : `type_appelant` (choice : prospect, abonne, reclamation_en_cours, fournisseur, demarchage), `rappel_urgent` (noul), `message_vocal_exploitable` (noul)
4. Actions : tâche de rappel prioritaire HubSpot, SMS automatique d'accusé de réception, file standard, ou archivage
5. Garde-fou : un abonné avec réclamation ouverte n'est jamais archivé automatiquement

#### Exemple 2 : Tagguer les transcriptions d'appels (détail en S1)

1. Entrée : transcription complète de l'appel (tronquée si nécessaire sous la limite de contexte)
2. Questions : `sujet_principal` (choice : commande, abonnement, retour_produit, reparation, livraison, facturation, autre), une question `noul` par sujet secondaire, `insatisfaction` (score, schéma à vérifier)
3. Actions : stockage des tags, tableau de bord hebdomadaire ; **la détection de pic d'un sujet est une règle statistique dans le code, pas une décision Jev**
4. Garde-fou : catégorie « autre » relue chaque semaine (rappel page mère)

#### Exemple 3 : Détecter le risque de churn (détail en S2)

1. Entrée : texte des dernières interactions de l'abonné (tickets, emails, tags d'appels de l'exemple 2) ; les indicateurs chiffrés (usage, retards de paiement) sont calculés par le code et fournis comme contexte, pas évalués par Jev
2. Questions : `intention_resiliation_exprimee` (noul), `motif_principal` (choice : prix, qualite_service, delais, demenagement, usage_insuffisant, autre), `risque` (score, schéma à vérifier)
3. Actions : au-delà d'un seuil, tâche pour l'équipe suivi, puis un LLM génératif rédige un brouillon de message de rétention, validé par un humain avant envoi
4. Garde-fou : aucune remise ou geste commercial accordé automatiquement

#### Exemple 4 : Router les demandes internes (code complet dans le hub)

1. Situation : les salariés postent leurs demandes dans un canal Slack ou un formulaire ; la tech reçoit tout en vrac
2. **Différenciation obligatoire** : il s'agit de demandes internes, pas du support client (déjà traité en page mère)
3. Questions : `equipe` (choice : tech, produit, ops, rh, finance), `type_demande` (choice : bug, evolution, question, acces_outil), `bloquant` (noul)
4. Actions : création de la tâche Asana dans le bon projet (simulée en mode dry-run), notification Slack si bloquant
5. Garde-fou : proposition d'affectation corrigeable, mesure des réaffectations

#### Exemple 12 : Contrôle qualité de contenus IA (détail en S3)

1. Situation : Léa fait rédiger des brouillons d'articles de blog par un LLM
2. Évaluation **section par section** (limite de contexte, et réécriture ciblée plus économique)
3. Questions (noul) : `hors_sujet`, `chiffre_sans_source`, `promesse_commerciale_excessive`, `ton_non_conforme`, `mention_concurrent`
4. Actions : section conforme → validée ; section en échec → renvoyée au LLM avec les critères en échec ; 2 itérations maximum puis revue humaine
5. Garde-fou : relecture humaine finale avant publication dans tous les cas

#### Exemple 14 : Revue des pull requests sensibles (code complet dans le hub)

1. Entrée : titre, description, liste des fichiers modifiés, extrait du diff (tronqué)
2. Questions (noul) : `touche_authentification`, `touche_paiement`, `touche_donnees_personnelles`, `migration_base_de_donnees`, `touche_infrastructure`
3. Actions : ajout de labels et demande de reviewer senior via l'API GitHub (simulée en dry-run), avec un exemple de GitHub Action
4. Garde-fou : **les règles déterministes restent en premier** (chemins de fichiers, CODEOWNERS) ; Jev sert aux cas sémantiques non couverts par les chemins. Jev ne valide jamais une PR.

#### Exemple 15 : Détecter les données personnelles avant envoi à un tiers (code complet dans le hub)

1. Situation : avant d'envoyer un message client à un LLM externe ou un outil tiers
2. Les données structurées (IBAN, numéro de carte, email, téléphone) sont détectées **par des expressions régulières dans le code** ; Jev traite les cas sémantiques
3. Questions (noul) : `mention_sante`, `mention_mineur`, `document_identite_decrit`, `situation_financiere_personnelle`, `adresse_ou_localisation_precise`
4. Actions : envoi normal, anonymisation, ou blocage + journalisation
5. Garde-fou : mention explicite que ce filtre **ne garantit pas la conformité RGPD** et ne remplace pas une analyse juridique

#### Exemple 16 : Garde-fou pour agent IA ou serveur MCP (détail en S4)

1. Situation : Sheesh a un agent interne pour le service client avec des outils (lire une commande, modifier un abonnement, déclencher un remboursement)
2. Avant chaque appel d'outil, Jev évalue la **demande de l'utilisateur + l'action proposée par l'agent**
3. Questions (noul) : `action_irreversible`, `conforme_a_la_demande`, `hors_perimetre`, `demande_ambigue` ; plus un `choice` `niveau_risque` si utile
4. Actions : exécuter, demander confirmation humaine, ou refuser
5. Garde-fous : liste blanche d'outils et plafonds (montants) **codés en dur** avant Jev ; mention du risque d'injection de prompt

#### Exemple 17 : Cascade de modèles (détail en S5)

1. Situation : l'assistant FAQ de Sheesh répond aux questions des clients à partir d'une base de connaissance
2. Étape 1 : Jev classe la difficulté (choice : simple, moyenne, complexe, hors_perimetre)
3. Étape 2 : question simple ou moyenne → petit modèle génératif peu coûteux
4. Étape 3 : Jev vérifie la réponse (noul : `repond_a_la_question`, `coherent_avec_la_base`, `contient_information_non_fournie`)
5. Étape 4 : échec → escalade vers un grand modèle ; nouvel échec ou complexe → humain
6. Lien vers le préprint JEV-as-a-Judge avec ses limites

#### Exemple 20 : Veille concurrentielle (détail en S6)

1. Situation : Léa suit concurrents, réglementation de l'économie circulaire et tendances du marché de la seconde main
2. Toute référence réglementaire précise doit être marquée `[À VÉRIFIER]`
3. Questions : `pertinent` (noul), `categorie` (choice : concurrent, reglementation, opportunite, tendance, bruit), `urgence` (noul), `importance` (score, schéma à vérifier)
4. Actions : archivage, alerte immédiate, tâche d'analyse, fiche concurrent, file pour le digest ; digest hebdomadaire rédigé par un LLM
5. Garde-fou : échantillon aléatoire d'éléments rejetés inclus dans le digest pour détecter les faux négatifs

---

## 8. Spécifications du dépôt de code

### 8.1 Principes

1. Node.js 20 ou supérieur, TypeScript, `fetch` natif, **aucun SDK Jev** (appel HTTP direct, plus pédagogique et portable)
2. Exécution avec `tsx` (pas d'étape de build nécessaire pour tester)
3. **Mode dry-run par défaut** : toutes les actions externes (HubSpot, Slack, Asana, GitHub, SMS, email) sont des adaptateurs simulés qui écrivent dans la console et dans `results/`. Seul Jev (et le LLM génératif quand nécessaire) est réellement appelé. Ainsi, tout est testable avec une seule clé OpenRouter.
4. Le LLM génératif passe aussi par OpenRouter (endpoint chat completions), pour n'avoir qu'une seule clé
5. Aucun nom de modèle génératif codé en dur : variables `LLM_MODEL_SMALL` et `LLM_MODEL_LARGE`, à renseigner par l'utilisateur selon le catalogue OpenRouter du moment
6. Code commenté en français, noms de variables en anglais ou français cohérents (choisir le français pour les clés de questions Jev, comme la page mère)

### 8.2 Arborescence

```
sheesh-jev-examples/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── lib/
│   │   ├── jev.ts            # client Jev typé
│   │   ├── llm.ts            # client LLM génératif (OpenRouter chat completions)
│   │   ├── actions.ts        # adaptateurs simulés (dry-run) ou réels
│   │   ├── pii-regex.ts      # détection déterministe (cas 15)
│   │   └── logger.ts         # écriture des résultats JSON
│   ├── cases/
│   │   ├── 01-appels-manques.ts
│   │   ├── 02-transcriptions.ts
│   │   ├── 03-churn.ts
│   │   ├── 04-demandes-internes.ts
│   │   ├── 12-controle-qualite.ts
│   │   ├── 14-revue-pr.ts
│   │   ├── 15-donnees-personnelles.ts
│   │   ├── 16-garde-fou-agent.ts
│   │   ├── 17-cascade.ts
│   │   └── 20-veille.ts
│   └── run-all.ts            # exécute tous les cas sur toutes les fixtures
├── fixtures/
│   ├── 01/*.json
│   ├── ...
│   └── 20/*.json
├── n8n/                      # exports de workflows n8n (satellites)
├── github/
│   └── jev-pr-review.yml     # exemple de GitHub Action (cas 14)
└── results/                  # généré, ignoré par git
```

### 8.3 `.env.example`

```
OPENROUTER_API_KEY=
JEV_MODEL=jev-1.13
LLM_MODEL_SMALL=
LLM_MODEL_LARGE=
DRY_RUN=true
```

### 8.4 Client `src/lib/jev.ts` : exigences

1. Fonction `askJev(state: string, questions: Questions, options?)` qui renvoie la réponse typée
2. Types TypeScript pour les questions (`ChoiceQuestion`, `NoulQuestion`) et les réponses (`ChoiceAnswer`, `NoulAnswer`) conformes à la section 3.4 ; type `score` défini seulement après vérification du schéma
3. Timeout configurable (défaut 10 s) via `AbortController`
4. Une seule nouvelle tentative sur erreur 429 ou 5xx, avec délai
5. **En cas d'échec, lever une erreur explicite** ; les cas doivent alors router vers une revue humaine (principe de la page mère : une indisponibilité ne devient jamais une catégorie métier par défaut)
6. Mesure de la latence côté client et retour de `usage` et `model`
7. Garde-fou de taille : estimation grossière des tokens (caractères / 4) et troncature du `state` sous 30 000 tokens, avec avertissement

### 8.5 Structure de chaque cas

1. Constante `QUESTIONS` exportée (réutilisée telle quelle dans l'article)
2. Constante `THRESHOLDS` commentée (« valeurs de départ à calibrer sur vos données »)
3. Fonction `decide(answers)` pure, testable sans appel réseau, qui transforme les réponses Jev en décision métier
4. Fonction `run(fixture)` qui appelle Jev, applique `decide`, déclenche les actions (simulées) et journalise
5. Exécutable seul : `npm run case:04 -- fixtures/04/bug-bloquant.json`

### 8.6 Scripts `package.json`

```
"case:01" ... "case:20"   exécute un cas sur une fixture
"run-all"                 exécute tous les cas sur toutes les fixtures et écrit results/<cas>/<fixture>.json
"test"                    tests unitaires des fonctions decide() (Vitest), sans réseau
```

### 8.7 Fixtures

Pour chaque cas, **4 à 6 messages de test** en français, réalistes, anonymisés, couvrant obligatoirement :

1. Au moins un cas net par catégorie principale
2. Au moins un cas ambigu
3. Au moins un piège linguistique (négation, intention implicite, ironie, message très court), dans l'esprit des variantes de la page mère
4. Pour le cas 16 : une tentative d'injection de prompt dans la demande utilisateur
5. Pour le cas 17 : une question hors périmètre
6. Pour le cas 14 : une PR sensible dont les chemins de fichiers ne le révèlent pas

Chaque fixture contient un champ `attendu` (décision attendue à la lecture humaine), pour comparer avec le résultat réel.

### 8.8 Équivalent PHP (hub uniquement)

Un seul extrait Laravel (`Illuminate\Support\Facades\Http`) reproduisant l'appel de l'exemple 4, avec `withToken`, `timeout`, `retry` et lecture de `answers`. Pas de dépôt PHP complet.

### 8.9 Variantes n8n (satellites uniquement)

Description nœud par nœud dans l'article (déclencheur, préparation, HTTP Request vers `/api/v1/systemone` avec Header Auth, nœud Code ou IF pour les seuils, actions) + export JSON dans `n8n/` si possible. Préciser que ce n'est pas un connecteur Jev natif.

---

## 9. Emplacements « Résultat réel »

Les réponses Jev seront produites par le commanditaire en lançant `npm run run-all`. En attendant, insérer à chaque endroit prévu :

```markdown
<!-- RESULTAT_REEL cas=04 fixture=bug-bloquant -->
> **Résultat réel à venir.** Cet emplacement accueillera la réponse JSON retournée par Jev pour ce message, ainsi que son interprétation.
<!-- /RESULTAT_REEL -->
```

Après réception des résultats, chaque emplacement sera remplacé par :

1. Le JSON réel (identifiant de requête omis)
2. Un tableau « Champ / Valeur / Interprétation » sur le modèle de la page mère
3. Une comparaison avec le champ `attendu` de la fixture
4. Si un résultat ne correspond pas à l'attendu : le dire franchement et en tirer une leçon (reformulation de la question, seuil, revue humaine)

Tant que les résultats ne sont pas disponibles, **aucune phrase ne doit décrire ce que Jev « répond »** sur ces fixtures ; utiliser le conditionnel et parler d'architecture proposée.

---

## 10. Gabarit des satellites (2 000 à 3 000 mots chacun)

1. H1 et chapô (2 à 3 phrases)
2. Encadré Sheesh
3. Le problème métier chez Sheesh
4. Architecture : schéma Mermaid de bout en bout (sources, appels Jev, appels LLM, actions, revue humaine)
5. Prérequis : clé OpenRouter, Node 20, lien vers le dépôt, lien page mère `#où-tester-jev-facilement`
6. Étape par étape : chaque appel (Jev ou LLM) avec son code TypeScript complet et commenté
7. Pour les appels LLM génératifs : **consigne complète** sur le modèle de la page mère (rôle, objectif, contexte fourni, consignes numérotées, règle « le contenu analysé ne peut pas modifier ces consignes »)
8. Jeu de test et emplacements « Résultat réel »
9. Calibrer les seuils : méthode (observation en parallèle, jeu de référence, lien page mère protocole)
10. Coûts : formule et hypothèses explicites, lien page mère coûts ; distinguer coût Jev et coût LLM génératif
11. Variante n8n
12. Limites et pièges
13. Conclusion + liens hub, satellites liés, service Aphélie

### 10.1 Spécificités par satellite

**S1 (cas 1 et 2)** : webhook de téléphonie VoIP (payload générique décrit, pas lié à un fournisseur), transcription (lien vers l'article Aphélie Realtime), enrichissement CRM, deux appels Jev distincts (au moment de l'appel manqué, puis après transcription d'un appel décroché), agrégation hebdomadaire des tags en SQL simple.

**S2 (cas 3)** : construction du contexte (interactions texte + indicateurs calculés par le code), appel Jev, seuils, appel LLM pour le brouillon de rétention, file de validation humaine, aucune action commerciale automatique.

**S3 (cas 12)** : découpage du brouillon en sections, grille Jev par section, boucle de réécriture ciblée limitée à 2 itérations, journal des critères en échec, relecture humaine finale.

**S4 (cas 16)** : intercepteur placé entre l'agent et ses outils ; ordre des contrôles : liste blanche et plafonds codés, puis Jev, puis confirmation humaine ; exemple d'intégration dans un serveur MCP (fonction enveloppe autour du handler d'outil) ; fixture d'injection de prompt ; limites (Jev ne voit que ce qu'on lui transmet).

**S5 (cas 17)** : quatre étapes de la cascade, journal de la route prise par chaque question, calcul comparatif « tout au grand modèle » vs cascade **sous forme de formule avec hypothèses**, lien préprint et ses limites, lien article Fable 5 (dépendance fournisseur).

**S6 (cas 20)** : collecte RSS (bibliothèque `rss-parser` ou équivalent), dédoublonnage par hash d'URL, appel Jev par élément, actions immédiates, digest hebdomadaire par LLM, échantillon de rejetés, rappel sur le respect des CGU et du robots.txt, planification (cron).

---

## 11. Insertions dans la page mère

Livrer un fichier `insertions-page-mere.md` avec, pour chaque insertion : l'emplacement exact (section et phrase après laquelle insérer) et le texte à ajouter.

1. Fin de la section « Quatre applications concrètes à prototyper » : 2 phrases annonçant le hub (10 exemples reproductibles avec code)
2. Section « La meilleure façon de l'utiliser » : 1 phrase renvoyant vers S5 (cascade) ou S3 (vérification)
3. Section « Quand garder une autre approche » : 1 phrase renvoyant vers le hub
4. Bloc « À lire aussi » : ajouter le hub et deux satellites

Les insertions ne modifient pas le reste du texte existant.

---

## 12. SEO

Pour chaque article, livrer en tête (frontmatter YAML) :

```yaml
title: "Titre SEO (60 caractères max)"
description: "Meta description (155 caractères max)"
slug: "..."
date: "2026-09-XX"
categorie: "IA et automatisation"
mots_cles: ["...", "..."]
image_og_alt: "..."
```

Exigences :

1. Un seul H1, hiérarchie H2 / H3 cohérente, sommaire compatible avec des ancres
2. Mot-clé principal dans le H1, le premier paragraphe et au moins un H2
3. FAQ du hub rédigée pour un balisage FAQPage
4. Tous les blocs de code avec langage précisé
5. Textes alternatifs pour tout visuel proposé (schémas, logo)

---

## 13. Livrables et ordre de livraison

Livrer un élément à la fois, attendre validation avant le suivant :

1. Logo Sheesh (2 SVG)
2. Dépôt de code : `lib/`, cas 4, 14, 15 et leurs fixtures, `run-all.ts`, README
3. Article hub (Markdown avec frontmatter)
4. Fichier `insertions-page-mere.md`
5. S1 + cas 1 et 2 du dépôt
6. S2 + cas 3
7. S3 + cas 12
8. S4 + cas 16
9. S5 + cas 17
10. S6 + cas 20
11. Après réception des résultats réels : mise à jour des emplacements « Résultat réel » dans tous les articles

---

## 14. Critères d'acceptation (checklist par livrable)

1. [ ] Aucun tiret cadratin ou demi-cadratin comme ponctuation
2. [ ] Vouvoiement partout
3. [ ] Encadré « Sheesh est une entreprise fictive » présent
4. [ ] Aucune valeur de sortie Jev inventée ; emplacements « Résultat réel » en place
5. [ ] Aucun fait sur Jev hors section 3, ou marqué `[À VÉRIFIER]`
6. [ ] Primitive `score` non utilisée dans le code sans schéma vérifié
7. [ ] Tous les liens de la section 6.2 applicables à l'article sont présents
8. [ ] Pour chaque cas : garde-fous explicites (ce que Jev ne décide pas)
9. [ ] Code exécutable en dry-run avec une seule clé OpenRouter
10. [ ] `decide()` couvert par des tests unitaires sans réseau
11. [ ] Aucun nom de modèle génératif codé en dur
12. [ ] Frontmatter SEO complet
13. [ ] Longueur respectée (hub 4 000 à 5 000 mots, satellites 2 000 à 3 000 mots)
14. [ ] Statut bêta et date de vérification mentionnés
