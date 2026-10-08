# AI Maroc — Roadmap technique

## État actuel
- Landing page AI Maroc
- Pack CV/candidatures + catalogue digital
- CV Builder + suivi local des candidatures
- Sauvegarde locale, export/import JSON et export PDF navigateur
- Interface arabe RTL + français
- Backend Node/Express actif
- Endpoint `/api/chat` avec validation, rate limit et fallback multi-provider
- Endpoint `/api/public-tools` pour météo, devises, livres, emplois et géocodage
- CI GitHub Actions avec syntax checks + tests Node
- Production sur Vercel

## Priorités techniques
1. Réduire la latence et améliorer la résilience du fallback AI.
2. Remplacer le rate limit mémoire par une protection partagée si le trafic devient réel.
3. Ajouter un stockage serveur des comptes/conversations seulement avec une architecture de confidentialité claire.
4. Ajouter des tests d'intégration ciblés autour des APIs externes et du parcours mobile.
5. Nettoyer les contenus marketing/documentaires pour qu'ils restent synchronisés avec Shopify.

## Paiement
La boutique utilise Shopify comme parcours de checkout avec les moyens de paiement configurés dans le magasin. Toute modification de paiement, abonnement ou facturation doit être validée séparément avant activation.

## Règle de sécurité
Aucune clé secrète, token, mot de passe ou identifiant de paiement ne doit être commitée dans GitHub.
