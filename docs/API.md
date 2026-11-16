# API REST — même origine

Toutes les réponses sont JSON. GET /api/health est public. GET /api/auth/session renvoie user et csrf, ou null.

## Authentification
- POST /api/auth/bootstrap : secret X-Bootstrap-Token, corps {school,name,email,password}. Une seule initialisation autorisée. Ne pas appeler depuis une page publique.
- POST /api/auth/login : {email,password}, renvoie user, csrf et cookie de session.
- POST /api/auth/logout : révoque la session.

Pour toute mutation : Origin doit être exactement l’origine du Worker et X-Requested-With doit valoir E-connect. Après connexion, ajouter X-CSRF-Token. Les requêtes avec un corps exigent Content-Type: application/json. Les requêtes cross-origin ne sont pas autorisées.

## CRUD
Ressources : years, classes, students, grades, attendance, suppliers, items, orders, users.

- GET /api/:resource?page=1&q=texte : {data,page,pageSize:25,total}.
- GET /api/:resource/:id : {data}.
- POST /api/:resource : créer un dossier.
- PUT /api/:resource/:id : remplacer les champs éditables (fournir tous ces champs).
- DELETE /api/:resource/:id : archiver ; comptes désactivés.

Recherche sur name ou subject seulement. Les commandes n’ont pas de PUT : utiliser les transitions.

Champs par ressource :
- years : name, active (0 ou 1).
- classes : name, teacher_id (nullable, compte enseignant actif).
- students : name, class_id, parent_id (nullable, compte parent actif).
- grades : student_id, year_id, term, subject, score, maximum, coefficient.
- attendance : student_id, year_id, day (AAAA-MM-JJ), status (Présent, Absent, Retard).
- suppliers : name, email (facultatif), phone (facultatif).
- items : name, quantity (entier positif ou nul).
- orders : supplier_id, item_id, quantity (entier strictement positif).
- users : name, email, role (admin, enseignant, parent, intendant), password (requis à la création, facultatif à la modification).

Les utilisateurs ne peuvent pas choisir school_id ou les identifiants à la création. Le serveur les attribue. Un compte admin ne peut pas être désactivé via cette interface. Modifier un compte révoque ses sessions. Changer le rôle détache ses anciens liens parent et enseignant : vérifier les élèves et classes ensuite.

## Commandes
POST /api/orders/:id/approve — admin uniquement, demandee → approuvee.
POST /api/orders/:id/cancel — admin uniquement, demandee → annulee.
POST /api/orders/:id/receive — admin/intendant, approuvee → recue, entrée atomique en stock.
Envoyer un corps {} et les protections de mutation.

## Audit
GET /api/audit — admin seulement, 200 derniers événements de l’établissement. Journal en ajout seul au niveau applicatif ; pas de garantie d’inaltérabilité contre un administrateur D1.

## Erreurs
400 validation ; 401 authentification ; 403 autorisation/CSRF/origine ; 404 introuvable ; 409 conflit ou contraintes ; 413 corps trop grand ; 415 format ; 429 limitation ; 500 erreur avec référence d’incident.
