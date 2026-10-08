# Confidentialité — AI Maroc

## Données stockées localement
- Le CV Builder, le suivi des candidatures et l'historique local des conversations utilisent le stockage du navigateur.
- L'historique local n'est pas envoyé au serveur par le code frontend actuel. L'utilisateur peut toutefois l'exporter manuellement en JSON.

## Chat AI
- Les demandes envoyées à la fonction AI du site passent par `/api/chat`.
- Le serveur peut transmettre la demande à l'un des fournisseurs configurés (Groq, Cerebras, Gemini, OpenRouter ou Hugging Face), puis à un fallback public si aucun fournisseur configuré ne répond.
- Les clés de ces fournisseurs doivent rester uniquement dans les variables d'environnement du déploiement.
- Pour certaines demandes, le serveur interroge aussi des APIs publiques externes pour enrichir le contexte, notamment Frankfurter, OpenLibrary ou Arbeitnow. Une recherche de livres peut transmettre une partie du texte demandé à OpenLibrary.
- Les données venant des APIs externes ne doivent jamais être présentées comme des sources officielles marocaines sans vérification.

## Outils publics
Les fonctions météo, devises, livres, emplois et géocodage de `/api/public-tools` appellent des services externes correspondants. Le site doit être considéré comme un intermédiaire technique pour ces recherches.

## Quickchat
- Le site charge actuellement un widget Quickchat tiers.
- Les conversations réalisées dans ce widget suivent le traitement de Quickchat et sont distinctes du endpoint `/api/chat` du site.
- Avant d'utiliser ce widget dans un contexte commercial, le plan Quickchat et ses conditions d'utilisation doivent être vérifiés.

## Sécurité
- Ne jamais placer de mot de passe, clé API, token, cookie ou moyen de paiement dans GitHub.
- Toute donnée sensible doit être minimisée et ne doit être stockée côté serveur que si une architecture appropriée de sécurité et de rétention est en place.

## Vente
Le site doit afficher clairement les informations du produit, le prix, la nature numérique du produit ou service, les conditions applicables et les modalités de remboursement avant paiement.

Ce document décrit le comportement actuel du projet et doit être mis à jour après toute modification du flux de données.
