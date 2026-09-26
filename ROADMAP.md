# Pack Emploi Maroc — Roadmap technique

## Déjà intégré
- Landing page
- Pack CV/candidatures
- CV Builder
- Sauvegarde locale
- Export PDF via impression navigateur
- Interface française + arabe RTL
- 3 modèles de CV
- Analyse locale de mots-clés ATS
- Suivi local des candidatures
- Documentation d'attribution open-source

## Étape serveur
1. Déployer les pages statiques.
2. Ajouter un backend pour les commandes et webhooks uniquement si nécessaire.
3. Ajouter un stockage sécurisé des commandes.
4. Ajouter la livraison numérique après paiement confirmé.
5. Ajouter l'IA côté serveur seulement avec une clé secrète en variable d'environnement.
6. Ajouter des logs minimaux et une protection anti-abus.

## Paiement
Le compte Stripe connecté peut être utilisé pour préparer l'intégration, mais le lancement ne doit pas supposer qu'un compte marchand Stripe marocain est disponible. Stripe ne liste actuellement pas le Maroc parmi ses pays/régions pris en charge pour les paiements. Vérifier le pays légal du marchand et le moyen de paiement réellement disponible avant activation.

## Règle de sécurité
Aucune clé secrète ne doit être commitée dans GitHub.
