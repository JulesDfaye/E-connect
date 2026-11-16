# Sécurité et usage responsable

Ce projet est un socle de développement, pas une certification de sécurité.

## Contrôles présents
Requêtes préparées, whitelist de tables/champs, FK composites de tenant, autorisations serveur, cookies HttpOnly/SameSite Strict et Secure en HTTPS, expiration des sessions, jeton CSRF, contrôle Origin, limite de corps JSON, échappement DOM via textContent et CSP sans scripts inline.
Les mots de passe et tokens ne sont pas exposés dans les listes. Les sessions sont stockées sous forme d’empreintes. Les détails SQL ne sont pas renvoyés au client.
Les routes d’amorçage sont verrouillées par un secret hexadécimal et une contrainte SQL unique.

## Contrôles supplémentaires nécessaires
Audit de l’authentification/PBKDF2 et de son coût CPU, identité gérée ou MFA selon les besoins, limitation au niveau edge, suivi des anomalies et protection anti-automatisation.
Le journal CRUD n’inclut pas toutes les connexions/consultations. Ce n’est pas un journal inviolable ou exhaustif.
Les vérifications de dépendances applicatives avant archivage ne remplacent pas une stratégie de concurrence et des tests de charge sur D1. Compléter les invariants de cycle de vie par triggers si le contexte le requiert.
Les sauvegardes, la suppression réglementaire, les durées de conservation, l’information des familles et le contrôle des opérateurs restent à organiser.
Ne pas utiliser la base de production dans une preview ou dans des tests automatiques.
Ne jamais partager .dev.vars, les cookies, les jetons Cloudflare ou une base contenant des données d’élèves.

## Git et dépendances
Ajouter le vrai package-lock.json après installation et utiliser npm ci ensuite. Évaluer les mises à jour avant déploiement. Les versions majeures des actions et de Wrangler ne sont pas une garantie d’immuabilité ; épingler les versions/digests selon votre politique d’approvisionnement.
Détecter et révoquer immédiatement tout secret committé ; l’effacer du dernier commit ne suffit pas.

## Signalement
Ne pas publier de données personnelles ou de secrets dans une issue publique. Utiliser un canal privé défini par le propriétaire du dépôt.
