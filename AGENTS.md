# Règles pour les agents

## Contexte
Dépôt de code compagnon des articles Jev AI d'Aphélie.
Spécifications : docs/brief-cocon-jev-ai.md, sections 3 et 8.

## Règles
1. Node 20+, TypeScript, fetch natif, aucun SDK Jev, exécution via tsx.
2. Mode DRY_RUN=true par défaut : seules les API Jev et LLM sont réellement appelées.
3. Ne jamais coder en dur un nom de modèle génératif (variables LLM_MODEL_SMALL et LLM_MODEL_LARGE).
4. Ne pas utiliser la primitive score tant que son schéma n'est pas vérifié dans la doc TypeSafe.
5. Chaque fonction decide() est pure et couverte par des tests Vitest sans réseau.
6. npm test doit passer avant de rendre la main.
7. Ne jamais écrire de clé API dans le code, les tests ou les fixtures.
8. Un seul livrable par tâche.
