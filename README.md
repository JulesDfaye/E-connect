# E-connect — Cloudflare Workers + D1

Socle web scolaire original : HTML5, CSS modulaire, JavaScript ESM, API Fetch et base D1. Optimisé pour VS Code, GitHub et Cloudflare. Vert, jaune, rouge, bleu, beige et bleu marine.

## Périmètre réellement livré
- Accueil responsive, connexion, tableau de bord alimenté par la base.
- Comptes admin, enseignant, parent, intendant.
- CRUD : années scolaires, classes, élèves, notes, présences, fournisseurs, articles, demandes d’approvisionnement et comptes.
- Recherche sur les champs nom/matière, pagination à 25 lignes, formulaires d’édition et archivage.
- Restriction enseignants par classe responsable et parents par enfant rattaché.
- Bulletin de suivi pondéré imprimable / enregistrable en PDF par le navigateur.
- Demandes mono-article : approbation admin, réception avec entrée en stock.
- Audit des opérations CRUD et commandes ; sessions en cookies HttpOnly ; CSRF et validation serveur.

Ce n’est PAS la migration complète du prototype Python V2 précédent. Pas d’import de son ancienne base. Commencer dans un dossier neuf et ne pas y copier de fichier SQLite existant.
Cette livraison ne reprend pas le QR de pointage, la messagerie interne, les notifications SMTP/SMS, la récupération automatique de mot de passe, les PDF serveur, les sauvegardes programmées ni l’administration centrale SaaS multi-écoles. Ces fonctions demandent des modules Cloudflare supplémentaires et ne sont pas simulées ici.
Une école est créée par l’amorçage de chaque déploiement. Les tables et requêtes sont cloisonnées par school_id afin de préparer une évolution multi-écoles.

## Prérequis
- VS Code et Node.js 22+ recommandé.
- Python 3.10+ uniquement pour les tests (le Worker n’utilise pas Python).
- Compte Cloudflare pour créer une base distante/déployer ; dépôt GitHub pour le CI/CD.
- Accès Internet pour installer Wrangler et utiliser les services distants.

## Démarrer dans VS Code
Extraire le ZIP et ouvrir le dossier contenant package.json dans VS Code.

    npm install
    npm run db:migrate:local

Copier .dev.vars.example vers .dev.vars et remplacer BOOTSTRAP_TOKEN par un secret hexadécimal aléatoire de 64 caractères :

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Puis lancer :

    npm run dev

Wrangler annonce l’URL locale (normalement http://localhost:8787). Laisser ce terminal ouvert. Le binding local D1 utilise un stockage local de développement distinct de la base distante. Si la configuration locale de votre version Wrangler exige l’identifiant réel, créer la base avec npx wrangler d1 create e-connect-db et renseigner database_id ; ne pas appliquer les migrations --remote pour ce seul essai local.

### Créer le premier administrateur
Dans un deuxième terminal, définir le même secret que dans .dev.vars et un mot de passe initial fort (12 caractères minimum).
Le script lit ces variables dans le terminal : il ne charge pas .dev.vars automatiquement.

PowerShell :

    $env:BOOTSTRAP_TOKEN="LE_MEME_SECRET_HEXADECIMAL_64_CARACTERES"
    $env:ADMIN_PASSWORD="VOTRE_MOT_DE_PASSE_FORT"
    $env:EC_URL="http://localhost:8787"
    npm run bootstrap
    Remove-Item Env:ADMIN_PASSWORD
    Remove-Item Env:BOOTSTRAP_TOKEN

macOS/Linux :

    export BOOTSTRAP_TOKEN="LE_MEME_SECRET_HEXADECIMAL_64_CARACTERES"
    export ADMIN_PASSWORD="VOTRE_MOT_DE_PASSE_FORT"
    export EC_URL="http://localhost:8787"
    npm run bootstrap
    unset ADMIN_PASSWORD BOOTSTRAP_TOKEN

Le script demande le nom de l’école, le nom et l’e-mail administrateur. Il n’existe aucun mot de passe par défaut. Utiliser une saisie de secret protégée par votre terminal/gestionnaire si nécessaire ; l’affectation littérale d’un secret peut rester dans l’historique shell. Le mot de passe ne doit jamais être passé comme argument du script ou committé.
L’initialisation est unique et protégée par secret. Retirer ensuite la variable BOOTSTRAP_TOKEN de .dev.vars, puis redémarrer Wrangler. Pour une URL locale différente, adapter EC_URL exactement (localhost et 127.0.0.1 sont des origines différentes).

Ouvrir /app.html et se connecter. Créer une année active, les comptes enseignant/parent/intendant, une classe avec son enseignant, puis un élève et son parent.

## Commandes
- npm run dev : serveur Wrangler local et assets.
- npm run build : vérifications de syntaxe JS et liens statiques ; pas de transpilation nécessaire.
- npm test : handlers API + SQL SQLite via adaptateur D1 de test.
- npm run db:migrate:local : schéma local.
- npm run db:migrate:remote : migrations sur la VRAIE base Cloudflare.
- npm run bootstrap : première école et son administrateur.
- npm run deploy : déploiement réel dans votre compte connecté.

Sous Windows, si les tests ne trouvent pas python3 mais python fonctionne : $env:PYTHON="python".

## Organisation et documentation
Voir docs/ARBORESCENCE.txt pour la liste exhaustive des fichiers.
- docs/ARCHITECTURE.md : composants, rôles et limites.
- docs/API.md : endpoints, champs, authentification et erreurs.
- docs/DEPLOIEMENT.md : D1, GitHub Actions, Workers Builds et secrets.
- docs/TESTS.txt : résultats de la génération.
- SECURITY.md : contrôles présents et prérequis de production.

## Vérifications et déploiement
Le code a été vérifié avec Node et des tests Fetch/SQLite dans l’environnement de génération. Il n’a pas été exécuté sur un vrai Worker/D1 distant, testé visuellement dans un navigateur ni publié sur votre compte. Les tests SQLite ne garantissent pas à eux seuls l’exécution sur D1 : valider avec Wrangler puis un environnement de staging.
Wrangler n’a pas été installé dans cet environnement et aucun package-lock.json n’est fabriqué. Après npm install, committer le vrai lockfile ; le pipeline utilise alors npm ci.

Le déploiement continu est préparé mais pas activé : vous devez créer la base Cloudflare, remplacer l’UUID factice, configurer les secrets GitHub et envoyer le dépôt. Voir le guide pas à pas.

## Limites à traiter avant utilisation réelle
- Contrôle de sécurité et de charge sur l’environnement Cloudflare ; protection anti-abus edge.
- Stratégie de sauvegarde/export D1, restauration testée, rétention et copie protégée. Aucun cron de sauvegarde n’est inclus.
- Notes : une ligne = une évaluation ; moyenne de note/barème × 20 pondérée par coefficient. Pas de classement ni validation officielle.
- Un seul parent par élève et un enseignant responsable par classe ; pas d’historique annuel des affectations.
- L’édition de stock permet un ajustement direct réservé admin/intendant ; audit et mouvement technique sont enregistrés. Pas de prix, taxes, factures ou livraisons partielles.
- Les sélecteurs et le bulletin chargent au maximum 4000 dossiers ; prévoir recherche serveur spécialisée au-delà.
- Les comptes sont désactivés, les dossiers archivés ; pas de purge légale automatisée, ni de réactivation via UI dans cette version.
- Pas de changement de mot de passe en libre-service. Un admin peut modifier un mot de passe de compte ; tout changement de compte révoque ses sessions. En cas de perte de tous les comptes admin, prévoir une procédure opérateur sécurisée.
- Migrations non rétrocompatibles : planifier une maintenance, ne pas les pousser aveuglément en production.

Utiliser uniquement des données fictives jusqu’à validation métier et sécurité.
