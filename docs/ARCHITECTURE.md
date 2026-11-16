# Architecture

## Choix
Cloudflare Workers + static assets + D1, avec API Fetch standard en JavaScript ESM. Pas de bundler front-end ni framework navigateur. Wrangler empaquette le Worker. Les styles sont répartis en variables, base, layout et composants ; main.css les importe.

Le navigateur charge public/index.html ou public/app.html. Le client appelle /api/* sur la même origine. Le Worker traite l’authentification et les autorisations puis exécute des requêtes préparées D1. Les autres chemins sont servis via les assets Cloudflare.

## Séparation
- public : uniquement le contenu accessible au navigateur. Aucun secret.
- api : code serveur, jamais exposé comme asset.
- migrations : SQL versionné.
- scripts : initialisation administrative et vérifications.
- tests : tests de l’API Fetch avec un adaptateur D1 local de test.
- .github : pipeline CI et déploiement.
- .vscode : outils de développement.

## Session
Cookie HttpOnly et SameSite=Strict, Secure en HTTPS ; session de huit heures. La base ne stocke que l’empreinte du jeton. Les mutations exigent Origin identique, X-Requested-With et, après connexion, un jeton CSRF. Les erreurs API n’exposent pas les détails internes ni les mots de passe.
Les mots de passe utilisent Web Crypto PBKDF2-SHA256, sel aléatoire, 100000 itérations. Ce choix de compatibilité n’est pas une certification de sécurité : benchmark CPU Workers et revue de la politique de hashage/identité nécessaires avant production ; une identité gérée peut être préférable.
La limitation de connexion est une protection de base par adresse de compte, pas une protection anti-bot complète. Ajouter rate limiting edge et/ou Turnstile avant ouverture publique.

## Périmètre des rôles
- admin : gestion de l’école et des comptes, dossiers, notes, stocks et audit.
- enseignant : classes affectées, élèves de ces classes, notes et présences ; création/modification/archivage de toutes les évaluations de ces classes (pas d’attribution par auteur).
- parent : consultation des enfants rattachés, de leurs notes et présences.
- intendant : fournisseurs, inventaire et demandes d’approvisionnement. Seul admin approuve ou annule une demande.
Les contrôles côté serveur restent autoritaires ; masquer un bouton n’est pas une autorisation.

## Données
Les FK composites id/school_id empêchent les références directes à un autre établissement. Les filtres de lecture sont appliqués côté API. L’amorçage crée une école et son administrateur par déploiement ; pas d’interface d’administration centrale multi-écoles dans cette livraison.
Chaque note/présence référence une année. La classe et le parent d’un élève ne sont pas historisés par année. Une classe a un enseignant responsable ; pas d’affectation multi-enseignants par matière.
DELETE réalise un archivage logique (ou une désactivation des comptes) afin de conserver les historiques. Il ne satisfait pas à lui seul une demande de purge de données personnelles.
Les commandes ont un article et une réception intégrale. Un trigger crédite le stock lors de la transition approuvee → recue ; une répétition est rejetée. Les modifications de stock produisent aussi un mouvement technique. Les créations à stock initial positif sont tracées dans l’audit de création, pas comme un mouvement séparé.

## Transactions et déploiements
D1 batch regroupe mutation et audit. Les migrations sont appliquées avant le code : adopter des migrations additives compatibles avec la version précédente (expand/contract). Le pipeline n’assure pas de rollback automatique ni de sauvegarde autonome.
Le nom Worker de wrangler.toml doit correspondre à l’application dans Cloudflare.
Ne pas faire pointer les déploiements de test et previews vers la base de production. Aucun environnement de preview avec sa propre base n’est préconfiguré.

## Tests
L’adaptateur de test exécute le SQL réellement préparé dans SQLite via Python. Les mêmes handlers Fetch sont appelés dans Node. Cela vérifie la logique et les contraintes, mais ne reproduit pas le moteur Workers, les limites D1, le réseau Cloudflare ni un navigateur.
Il faut compléter par npm run dev et un test sur une base D1 de staging.
