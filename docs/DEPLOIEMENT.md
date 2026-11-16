# Déploiement continu — GitHub + Cloudflare Workers + D1

## Option principale : GitHub Actions
Un seul mécanisme doit déployer la production : ne pas activer simultanément le pipeline Actions et Workers Builds pour la même branche.

### 1. Créer D1
Installer Node 22 ou plus récent puis, depuis le dossier du projet :

    npm install
    npx wrangler login
    npx wrangler d1 create e-connect-db

Remplacer database_id dans wrangler.toml par l’UUID retourné. Le nom du binding doit rester DB. Le fichier de configuration contient un UUID factice et ne peut pas être déployé tel quel.
Conserver package-lock.json généré par npm install et le committer pour figer les versions. L’archive n’en contient pas : aucune installation npm n’a été effectuée dans l’environnement de génération.

### 2. Préparer la production

    npm run db:migrate:remote
    npx wrangler secret put BOOTSTRAP_TOKEN
    npm run deploy

Saisir un secret aléatoire hexadécimal de 64 caractères pour BOOTSTRAP_TOKEN. Générer une valeur avec :

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Le premier déploiement permet de connaître l’URL workers.dev. L’initialisation de l’administrateur est décrite dans README. Utiliser EC_URL=https://votre-worker.votre-compte.workers.dev dans le terminal exécutant npm run bootstrap, avec le même BOOTSTRAP_TOKEN et ADMIN_PASSWORD définis localement.
Ne jamais entrer ces secrets dans public/, dans wrangler.toml, dans un commit ou dans les logs du workflow.
Après l’initialisation réussie :

    npx wrangler secret delete BOOTSTRAP_TOKEN

L’amorçage est également verrouillé par la table setup. Ne jamais supprimer cette ligne pour réinitialiser une application existante.

### 3. Envoyer vers GitHub
Créer un dépôt GitHub vide, de préférence privé pendant le développement. Puis :

    git init
    git add .
    git commit -m "Initialiser E-connect Workers D1"
    git branch -M main
    git remote add origin https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git
    git push -u origin main

Avant git add, vérifier git status --ignored. .dev.vars, .env, node_modules et .wrangler doivent rester hors de Git.

### 4. Ajouter les secrets GitHub
Dans le dépôt : Settings → Secrets and variables → Actions.
Créer CLOUDFLARE_API_TOKEN et CLOUDFLARE_ACCOUNT_ID.
Le jeton Cloudflare doit avoir les permissions nécessaires pour déployer Workers et ses assets et appliquer les migrations D1 dans le compte concerné. Le limiter au périmètre nécessaire ; ne pas utiliser la Global API Key.
Créer l’environnement GitHub production (Settings → Environments), éventuellement protégé par validation humaine. Les secrets peuvent être placés dans cet environnement.

### 5. Pipeline fourni
.github/workflows/ci-deploy.yml :
- pull request : vérifications de syntaxe et tests, sans secret de production ;
- push main : mêmes tests, puis installation de Wrangler, migrations D1 distantes et déploiement ;
- workflow_dispatch : exécution manuelle sur main.
Les tests tournent avec Node 22 et Python 3.12 sur GitHub. Ils ne nécessitent pas de compte Cloudflare. Le déploiement attend leur réussite.
Configurer la protection de main pour exiger des revues et le statut tests si nécessaire.
Les migrations exécutées automatiquement doivent être compatibles avec l’ancienne version encore en ligne. Une restauration ou un rollback de données ne sont pas automatisés par ce pipeline.

## Alternative : intégration native Workers Builds
Si vous préférez gérer le lien GitHub dans Cloudflare : désactiver le job deploy du workflow (ou le réserver aux tests) AVANT d’activer cette option.
1. Dans Workers & Pages, sélectionner le Worker déjà créé.
2. Settings → Builds → Connect ; autoriser l’application GitHub pour le dépôt voulu.
3. Branche de production : main ; dossier racine : celui contenant package.json.
4. Build command : npm run build.
5. Deploy command : npm run db:migrate:remote && npm run deploy.
6. Configurer l’authentification de build nécessaire à D1/Workers et le fichier wrangler.toml correct.
7. Faire un push et vérifier les logs.
Les runtimes fournis par Workers Builds peuvent différer ; Python n’est pas requis par la commande build de ce projet. Les tests du dépôt restent dans GitHub Actions.
Les déploiements natifs ne sont pas automatiquement bloqués par le statut CI GitHub : mettre en place la politique de branche et le flux de fusion appropriés.
Ne pas activer de preview sur la base de production. Pour le staging, créer une autre base, un autre Worker et une configuration distincte.

## Domaine et contrôles après déploiement
Ajouter un domaine depuis les réglages du Worker si souhaité. Vérifier HTTPS, /api/health, connexion, chaque rôle, un CRUD complet, un bulletin, une commande et l’impossibilité pour un parent d’accéder aux autres élèves.
Ne pas publier de vraies données scolaires avant revue des accès, sauvegardes, politique de conservation, charge et protection des données.

## Vercel et Pages
Cette archive cible Workers, pas Vercel et pas un projet Pages Functions. Elle n’inclut donc pas de vercel.json trompeur : D1 et le binding ASSETS ne sont pas interchangeables avec une base Vercel. Un portage Vercel demanderait un adaptateur serveur, un autre accès base et sa configuration de déploiement.

## Références officielles
https://developers.cloudflare.com/workers/static-assets/binding/
https://developers.cloudflare.com/d1/reference/migrations/
https://developers.cloudflare.com/d1/worker-api/d1-database/
https://developers.cloudflare.com/workers/ci-cd/builds/
https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
