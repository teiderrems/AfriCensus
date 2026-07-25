---
name: africensus-link-code-agent
description: Spécification complète pour construire AfriCensus Link, une plateforme de recensement numérique avec backend FastAPI, back-office Angular servi par FastAPI, application mobile Flutter offline-first, gestion des personnes, ménages, zones, liens familiaux, synchronisation, validation, rapports, audit, sécurité et internationalisation français / anglais.
version: 1.0
language: fr
stack_backend: FastAPI
stack_web: Angular
stack_mobile: Flutter
database: PostgreSQL + PostGIS
mobile_storage: SQLite
auth: JWT
i18n_default_language: Français
i18n_supported_languages: Français, Anglais
---

# AfriCensus Link — Skill de développement complet

## 1. Mission de l’agent de code

Tu es un agent de code chargé de construire **AfriCensus Link**, une application de recensement numérique destinée à gérer :

- les personnes ;
- les ménages ;
- les zones géographiques ;
- les campagnes de recensement ;
- les liens familiaux et de parentalité ;
- la collecte mobile hors ligne ;
- la synchronisation mobile vers serveur ;
- la validation par superviseur ;
- la détection des doublons ;
- les rapports statistiques ;
- les exports ;
- les journaux d’audit ;
- la sécurité ;
- l’internationalisation français / anglais.

Le projet doit être développé avec la stack suivante :

- Backend : FastAPI
- Frontend web : Angular
- Application mobile : Flutter
- Base de données centrale : PostgreSQL + PostGIS
- Stockage local mobile : SQLite
- Authentification : JWT access token + refresh token
- Déploiement : Docker
- Documentation API : OpenAPI / Swagger générée par FastAPI

Le backend FastAPI doit exposer les API REST et servir le build Angular en production.

---

# 2. Vision produit

AfriCensus Link est une plateforme de recensement numérique conçue pour les contextes africains, notamment :

- zones à faible connectivité ;
- collecte terrain via mobile ;
- absence fréquente de documents officiels ;
- structures familiales élargies ;
- besoin de validation humaine ;
- nécessité de protéger les données personnelles ;
- besoin de produire des statistiques fiables.

La logique centrale du produit est :

- recenser les personnes ;
- regrouper les personnes dans des ménages ;
- relier les membres d’une famille ;
- localiser les ménages ;
- valider les données ;
- produire des statistiques ;
- protéger et auditer les informations sensibles.

---

# 3. Objectifs fonctionnels

L’application doit permettre de :

- créer une fiche personne ;
- créer une fiche ménage ;
- rattacher des personnes à un ménage ;
- enregistrer les liens familiaux ;
- gérer les personnes sans document officiel ;
- gérer les zones géographiques ;
- gérer les campagnes de recensement ;
- fonctionner hors ligne sur mobile ;
- synchroniser les données vers FastAPI ;
- valider les données depuis Angular ;
- détecter les doublons ;
- produire des rapports ;
- exporter les données ;
- journaliser les actions sensibles ;
- afficher l’application en français et en anglais.

---

# 4. Architecture générale

## 4.1 Vue d’ensemble

L’architecture cible est la suivante :

- Flutter collecte les données sur le terrain.
- Flutter stocke localement les données en SQLite.
- Flutter synchronise avec FastAPI quand Internet est disponible.
- FastAPI traite les données, les règles métier, la sécurité et les API.
- PostgreSQL + PostGIS stocke les données centrales.
- Angular sert de back-office superviseur, administrateur, statisticien et auditeur.
- FastAPI sert le build Angular en production.

## 4.2 Responsabilités FastAPI

FastAPI doit gérer :

- authentification ;
- utilisateurs ;
- rôles et permissions ;
- zones géographiques ;
- campagnes ;
- ménages ;
- personnes ;
- relations familiales ;
- documents ;
- synchronisation ;
- validation ;
- doublons ;
- rapports ;
- exports ;
- audit logs ;
- internationalisation des messages backend ;
- service du front Angular buildé.

## 4.3 Responsabilités Angular

Angular doit gérer le back-office web :

- connexion web ;
- tableau de bord ;
- gestion des zones ;
- gestion des agents ;
- gestion des campagnes ;
- liste des ménages ;
- détail ménage ;
- liste des personnes ;
- détail personne ;
- validation ;
- doublons ;
- rapports ;
- exports ;
- audit logs ;
- paramètres ;
- changement de langue français / anglais.

## 4.4 Responsabilités Flutter

Flutter doit gérer l’application mobile terrain :

- connexion agent ;
- téléchargement des zones affectées ;
- création ménage ;
- création personne ;
- création relation familiale ;
- fonctionnement hors ligne ;
- stockage local SQLite ;
- file de synchronisation ;
- synchronisation avec FastAPI ;
- réception des corrections ;
- affichage des statuts ;
- changement de langue français / anglais.

---

# 5. Structure de dépôt recommandée

Le projet doit être organisé en monorepo.

Structure cible :

- backend
  - application FastAPI
  - modules métier
  - migrations base de données
  - tests backend
  - dossier destiné au build Angular
- web
  - application Angular
  - modules back-office
  - services API
  - composants partagés
  - fichiers de traduction français / anglais
- mobile
  - application Flutter
  - stockage local SQLite
  - synchronisation
  - écrans terrain
  - fichiers de traduction français / anglais
- docs
  - documentation API
  - documentation base de données
  - documentation synchronisation
  - documentation permissions
  - documentation déploiement
- docker-compose
- README

---

# 6. Utilisateurs et rôles

## 6.1 Agent recenseur

L’agent recenseur utilise Flutter sur le terrain.

Il peut :

- se connecter ;
- télécharger sa zone ;
- créer un ménage ;
- créer une personne ;
- ajouter des liens familiaux ;
- travailler hors ligne ;
- synchroniser les données ;
- corriger une fiche retournée par superviseur ;
- soumettre les fiches à validation.

## 6.2 Superviseur

Le superviseur utilise Angular.

Il peut :

- consulter les fiches de sa zone ;
- valider une personne ;
- valider un ménage ;
- valider une relation familiale ;
- rejeter une fiche ;
- demander une correction ;
- examiner les doublons ;
- suivre l’avancement des agents ;
- consulter les rapports de sa zone.

## 6.3 Administrateur

L’administrateur utilise Angular.

Il peut :

- créer des utilisateurs ;
- gérer les rôles ;
- gérer les permissions ;
- créer des zones ;
- créer des campagnes ;
- affecter des agents aux zones ;
- configurer les paramètres ;
- consulter l’audit ;
- gérer les exports.

## 6.4 Statisticien

Le statisticien utilise Angular.

Il peut :

- consulter les statistiques ;
- générer des rapports ;
- exporter des données anonymisées ;
- filtrer par zone, période ou campagne.

## 6.5 Auditeur

L’auditeur utilise Angular.

Il peut :

- consulter les logs d’audit ;
- vérifier les exports ;
- contrôler les validations ;
- analyser les accès sensibles.

---

# 7. Modules métier

## 7.1 Authentification

Le module Authentification doit gérer :

- connexion ;
- déconnexion ;
- refresh token ;
- utilisateur courant ;
- expiration de session ;
- compte désactivé ;
- journalisation des connexions ;
- langue préférée utilisateur.

## 7.2 Utilisateurs

Le module Utilisateurs doit gérer :

- création utilisateur ;
- modification utilisateur ;
- désactivation utilisateur ;
- activation utilisateur ;
- attribution de rôle ;
- affectation agent-zone ;
- préférence de langue.

## 7.3 Rôles et permissions

Rôles initiaux :

- AGENT
- SUPERVISOR
- ADMIN
- STATISTICIAN
- AUDITOR

Permissions principales :

- créer personne ;
- lire personne ;
- modifier personne ;
- soumettre personne ;
- valider personne ;
- rejeter personne ;
- exporter personne ;
- créer ménage ;
- valider ménage ;
- créer relation ;
- valider relation ;
- gérer zone ;
- gérer campagne ;
- gérer utilisateur ;
- consulter rapport ;
- exporter rapport ;
- consulter audit.

## 7.4 Zones géographiques

Niveaux de zones possibles :

- pays ;
- région ;
- province ;
- district ;
- commune ;
- village ;
- quartier ;
- zone de recensement.

Fonctionnalités :

- créer zone ;
- modifier zone ;
- supprimer logiquement zone ;
- importer zones ;
- consulter enfants d’une zone ;
- consulter progression d’une zone ;
- affecter agents à zone.

## 7.5 Campagnes

Statuts campagne :

- PLANNED
- ACTIVE
- SUSPENDED
- COMPLETED
- ARCHIVED

Fonctionnalités :

- créer campagne ;
- modifier campagne ;
- activer campagne ;
- suspendre campagne ;
- terminer campagne ;
- archiver campagne ;
- associer zones ;
- associer agents ;
- consulter progression.

## 7.6 Ménages

Un ménage représente une unité de vie ou de résidence.

Champs métier principaux :

- identifiant serveur ;
- identifiant local mobile ;
- code ménage ;
- campagne ;
- zone ;
- chef de ménage ;
- adresse descriptive ;
- latitude ;
- longitude ;
- type de logement ;
- statut d’occupation ;
- nombre de membres ;
- statut de validation ;
- statut de synchronisation ;
- créateur ;
- dates de création et modification ;
- date de suppression logique.

Fonctionnalités :

- créer ménage ;
- modifier ménage ;
- ajouter membre ;
- retirer membre ;
- définir chef de ménage ;
- soumettre ménage ;
- valider ménage ;
- rejeter ménage ;
- demander correction ;
- consulter membres ;
- consulter historique.

## 7.7 Personnes

Une personne représente un individu recensé.

Champs métier principaux :

- identifiant serveur ;
- identifiant local mobile ;
- ménage ;
- campagne ;
- zone ;
- prénom ;
- nom ;
- autres noms ;
- surnom ;
- sexe ;
- date de naissance ;
- date de naissance estimée ;
- âge estimé ;
- lieu de naissance ;
- nationalité ;
- langue principale ;
- statut matrimonial ;
- profession ;
- niveau d’éducation ;
- téléphone ;
- sans document ;
- source de l’information ;
- statut de validation ;
- statut de synchronisation ;
- créateur ;
- dates de création et modification ;
- date de suppression logique.

Fonctionnalités :

- créer personne ;
- modifier personne ;
- rattacher personne à ménage ;
- marquer sans document ;
- soumettre personne ;
- valider personne ;
- rejeter personne ;
- demander correction ;
- consulter relations ;
- consulter audit ;
- consulter doublons ;
- consulter graphe familial.

## 7.8 Relations familiales

Une relation familiale relie deux personnes.

Types MVP :

- PERE_DE
- MERE_DE
- ENFANT_DE
- CONJOINT_DE
- TUTEUR_DE
- RESPONSABLE_LEGAL_DE

Types avancés :

- PARENT_DE
- FRERE_DE
- SOEUR_DE
- GRAND_PARENT_DE
- PETIT_ENFANT_DE
- ADOPTANT_DE
- ADOPTE_DE
- MEMBRE_DU_MEME_MENAGE
- CHEF_DE_MENAGE_DE

Champs métier principaux :

- identifiant serveur ;
- identifiant local mobile ;
- campagne ;
- personne source ;
- personne cible ;
- type de relation ;
- type de preuve ;
- source de l’information ;
- statut de validation ;
- date de début ;
- date de fin ;
- commentaire ;
- créateur ;
- dates de création et modification ;
- date de suppression logique.

Fonctionnalités :

- créer relation ;
- modifier relation ;
- valider relation ;
- rejeter relation ;
- contester relation ;
- générer ou suggérer une relation inverse ;
- détecter incohérence ;
- afficher graphe familial.

## 7.9 Documents

Le module Documents doit gérer :

- type de document ;
- numéro de document ;
- pays de délivrance ;
- date de délivrance ;
- date d’expiration ;
- fichier attaché si autorisé ;
- statut de validation ;
- rejet ou validation.

## 7.10 Synchronisation

Le module Synchronisation doit gérer :

- pull mobile ;
- push mobile ;
- lots de synchronisation ;
- correspondance local_id / server_id ;
- erreurs par élément ;
- conflits ;
- reprise après échec ;
- statuts de synchronisation ;
- corrections à renvoyer au mobile.

## 7.11 Validation

Le module Validation doit gérer :

- file de validation ;
- validation personne ;
- validation ménage ;
- validation relation ;
- rejet ;
- demande de correction ;
- commentaire superviseur ;
- historique des décisions ;
- journalisation.

## 7.12 Doublons

Le module Doublons doit gérer :

- détection de similarité ;
- score de similarité ;
- comparaison côte à côte ;
- décision superviseur ;
- marquer doublon ;
- marquer non-doublon ;
- demander vérification terrain ;
- fusion contrôlée ;
- audit de décision.

## 7.13 Rapports

Rapports MVP :

- résumé population ;
- ménages ;
- répartition âge/sexe ;
- progression par zone ;
- progression par agent ;
- doublons ;
- statuts de validation.

## 7.14 Exports

Exports MVP :

- personnes ;
- ménages ;
- relations familiales ;
- statistiques ;
- export personnalisé.

Les exports doivent pouvoir être produits en français ou en anglais.

## 7.15 Audit logs

Actions à journaliser :

- connexion réussie ;
- échec connexion ;
- création personne ;
- modification personne ;
- suppression logique personne ;
- création ménage ;
- modification ménage ;
- création relation ;
- validation personne ;
- rejet personne ;
- demande correction ;
- export de données ;
- consultation fiche sensible ;
- fusion doublon ;
- changement rôle utilisateur.

---

# 8. Statuts métier

## 8.1 Statuts de validation

Les statuts techniques doivent rester en anglais dans la base :

- DRAFT
- SUBMITTED
- NEEDS_CORRECTION
- VALIDATED
- REJECTED
- POTENTIAL_DUPLICATE
- ARCHIVED

## 8.2 Statuts de relation familiale

- DECLARED
- NEEDS_CONFIRMATION
- VALIDATED
- REJECTED
- CONTESTED
- ARCHIVED

## 8.3 Statuts de synchronisation

- LOCAL_ONLY
- PENDING_SYNC
- SYNCED
- SYNC_FAILED
- CONFLICT

---

# 9. Règles métier

## 9.1 Personnes

- Une personne peut être créée sans document officiel.
- Si la date de naissance est inconnue, l’âge estimé peut être renseigné.
- Une personne doit être rattachée à une campagne.
- Une personne doit être rattachée à une zone.
- Une fiche validée ne peut pas être modifiée directement par un agent.
- Toute modification après validation doit créer une demande de correction.
- Une suppression métier doit être logique.

## 9.2 Ménages

- Un ménage doit appartenir à une zone.
- Un ménage peut être créé sans chef de ménage.
- Le chef de ménage doit être membre du ménage.
- Le nombre de membres doit être recalculé automatiquement.
- Le GPS est recommandé mais non bloquant.
- Une coordonnée GPS hors zone doit créer une alerte.

## 9.3 Relations familiales

- La personne source et la personne cible doivent être différentes.
- Une personne ne peut pas être son propre parent.
- Une relation PERE_DE doit suggérer une relation inverse ENFANT_DE.
- Une relation MERE_DE doit suggérer une relation inverse ENFANT_DE.
- Une relation CONJOINT_DE doit être réciproque.
- Une relation TUTEUR_DE doit être distinguée d’une relation parentale.
- Une incohérence d’âge doit générer une alerte.
- Une relation rejetée ne doit pas être supprimée physiquement.
- Les relations déclaratives doivent être distinguées des relations prouvées.

## 9.4 Doublons

- Le système doit calculer un score de similarité.
- Un score supérieur au seuil configuré doit créer une alerte.
- La fusion doit être réservée aux superviseurs ou administrateurs.
- Toute décision doit être journalisée.
- Une décision de non-doublon doit être conservée.

---

# 10. API REST FastAPI

Toutes les routes API doivent commencer par :

- /api/v1

Les routes API ne doivent pas être interceptées par le fallback Angular.

---

## 10.1 Authentification

Endpoints :

- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh-token
- POST /api/v1/auth/reset-password
- GET /api/v1/auth/me

Le login doit retourner :

- access token ;
- refresh token ;
- utilisateur ;
- rôle ;
- zones affectées ;
- langue préférée si disponible.

---

## 10.2 Utilisateurs

Endpoints :

- GET /api/v1/users
- GET /api/v1/users/{id}
- POST /api/v1/users
- PUT /api/v1/users/{id}
- DELETE /api/v1/users/{id}
- POST /api/v1/users/{id}/activate
- POST /api/v1/users/{id}/disable
- POST /api/v1/users/{id}/assign-role
- PUT /api/v1/users/{id}/language

---

## 10.3 Rôles et permissions

Endpoints :

- GET /api/v1/roles
- GET /api/v1/roles/{id}
- POST /api/v1/roles
- PUT /api/v1/roles/{id}
- GET /api/v1/permissions
- POST /api/v1/roles/{id}/permissions
- DELETE /api/v1/roles/{id}/permissions/{permission_id}

---

## 10.4 Zones

Endpoints :

- GET /api/v1/zones
- GET /api/v1/zones/{id}
- POST /api/v1/zones
- PUT /api/v1/zones/{id}
- DELETE /api/v1/zones/{id}
- GET /api/v1/zones/{id}/children
- GET /api/v1/zones/{id}/progress
- POST /api/v1/zones/import

---

## 10.5 Campagnes

Endpoints :

- GET /api/v1/campaigns
- GET /api/v1/campaigns/{id}
- POST /api/v1/campaigns
- PUT /api/v1/campaigns/{id}
- POST /api/v1/campaigns/{id}/activate
- POST /api/v1/campaigns/{id}/suspend
- POST /api/v1/campaigns/{id}/complete
- POST /api/v1/campaigns/{id}/archive

---

## 10.6 Affectations agents-zones

Endpoints :

- GET /api/v1/assignments
- POST /api/v1/assignments
- DELETE /api/v1/assignments/{id}
- GET /api/v1/users/{id}/assignments
- GET /api/v1/zones/{id}/agents

---

## 10.7 Ménages

Endpoints :

- GET /api/v1/households
- GET /api/v1/households/{id}
- POST /api/v1/households
- PUT /api/v1/households/{id}
- DELETE /api/v1/households/{id}
- POST /api/v1/households/{id}/submit
- POST /api/v1/households/{id}/validate
- POST /api/v1/households/{id}/reject
- POST /api/v1/households/{id}/request-correction
- GET /api/v1/households/{id}/members
- POST /api/v1/households/{id}/members
- DELETE /api/v1/households/{id}/members/{person_id}

---

## 10.8 Personnes

Endpoints :

- GET /api/v1/persons
- GET /api/v1/persons/{id}
- POST /api/v1/persons
- PUT /api/v1/persons/{id}
- DELETE /api/v1/persons/{id}
- POST /api/v1/persons/{id}/submit
- POST /api/v1/persons/{id}/validate
- POST /api/v1/persons/{id}/reject
- POST /api/v1/persons/{id}/request-correction
- GET /api/v1/persons/{id}/relations
- GET /api/v1/persons/{id}/audit
- GET /api/v1/persons/{id}/duplicates
- GET /api/v1/persons/{id}/family-graph

---

## 10.9 Relations familiales

Endpoints :

- GET /api/v1/family-relations
- GET /api/v1/family-relations/{id}
- POST /api/v1/family-relations
- PUT /api/v1/family-relations/{id}
- DELETE /api/v1/family-relations/{id}
- POST /api/v1/family-relations/{id}/validate
- POST /api/v1/family-relations/{id}/reject
- POST /api/v1/family-relations/{id}/contest

---

## 10.10 Documents

Endpoints :

- GET /api/v1/persons/{id}/documents
- POST /api/v1/persons/{id}/documents
- GET /api/v1/documents/{id}
- DELETE /api/v1/documents/{id}
- POST /api/v1/documents/{id}/validate
- POST /api/v1/documents/{id}/reject

---

## 10.11 Synchronisation

Endpoints :

- POST /api/v1/sync/pull
- POST /api/v1/sync/push
- GET /api/v1/sync/status
- GET /api/v1/sync/batches
- GET /api/v1/sync/batches/{id}

Le push doit accepter des lots contenant :

- ménages ;
- personnes ;
- relations familiales ;
- documents ;
- soumissions ;
- corrections.

Le serveur doit retourner :

- éléments créés ;
- éléments mis à jour ;
- erreurs par élément ;
- conflits ;
- correspondance local_id / server_id.

---

## 10.12 Validation

Endpoints :

- GET /api/v1/validations/queue
- GET /api/v1/validations/{id}
- POST /api/v1/validations/{id}/approve
- POST /api/v1/validations/{id}/reject
- POST /api/v1/validations/{id}/request-correction

---

## 10.13 Doublons

Endpoints :

- GET /api/v1/duplicates
- GET /api/v1/duplicates/{id}
- POST /api/v1/duplicates/{id}/mark-duplicate
- POST /api/v1/duplicates/{id}/mark-not-duplicate
- POST /api/v1/duplicates/{id}/request-field-check
- POST /api/v1/duplicates/{id}/merge

---

## 10.14 Rapports

Endpoints :

- GET /api/v1/reports/population-summary
- GET /api/v1/reports/households
- GET /api/v1/reports/age-gender
- GET /api/v1/reports/zone-progress
- GET /api/v1/reports/agent-progress
- GET /api/v1/reports/duplicates
- GET /api/v1/reports/validation-status

---

## 10.15 Exports

Endpoints :

- GET /api/v1/exports/persons
- GET /api/v1/exports/households
- GET /api/v1/exports/family-relations
- GET /api/v1/exports/statistics
- POST /api/v1/exports/custom
- GET /api/v1/exports/{id}/download

Les exports doivent accepter une langue :

- français ;
- anglais.

Si aucune langue n’est fournie, utiliser la langue transmise par la requête.  
Si aucune langue n’est disponible, utiliser le français.

---

## 10.16 Audit logs

Endpoints :

- GET /api/v1/audit-logs
- GET /api/v1/audit-logs/{id}
- GET /api/v1/audit-logs/entity/{entity_type}/{entity_id}

---

# 11. Pages Angular

## 11.1 Pages web MVP

Pages à créer :

- /login
- /dashboard
- /zones
- /zones/:id
- /agents
- /households
- /households/:id
- /persons
- /persons/:id
- /persons/:id/family-graph
- /validations
- /validations/:id
- /duplicates
- /duplicates/:id
- /reports
- /exports
- /audit-logs
- /settings

## 11.2 Menu Angular

Menu latéral :

- Dashboard / Tableau de bord
- Zones / Zones
- Agents / Agents
- Households / Ménages
- Persons / Personnes
- Family relations / Relations familiales
- Validation / Validation
- Duplicates / Doublons
- Reports / Rapports
- Exports / Exports
- Audit logs / Journal d’audit
- Settings / Paramètres

## 11.3 Composants Angular

Composants attendus :

- layout principal ;
- menu latéral ;
- barre supérieure ;
- carte statistique ;
- badge de statut ;
- tableau de données ;
- détail personne ;
- détail ménage ;
- panneau validation ;
- comparaison doublons ;
- graphe familial ;
- timeline audit ;
- modal export ;
- sélecteur de langue.

## 11.4 Services Angular

Services attendus :

- AuthService
- UserService
- ZoneService
- CampaignService
- HouseholdService
- PersonService
- FamilyRelationService
- ValidationService
- DuplicateService
- ReportService
- ExportService
- AuditLogService
- LanguageService

## 11.5 Guards Angular

Guards attendus :

- AuthGuard
- RoleGuard
- PermissionGuard

---

# 12. Pages Flutter

## 12.1 Pages mobile MVP

Pages à créer :

- SplashScreen
- LoginScreen
- AgentDashboardScreen
- AssignedZonesScreen
- HouseholdListScreen
- HouseholdFormScreen
- HouseholdDetailScreen
- PersonFormScreen
- PersonDetailScreen
- FamilyRelationFormScreen
- FamilyOverviewScreen
- DuplicateWarningScreen
- SyncScreen
- CorrectionListScreen
- SettingsScreen
- HelpScreen
- LanguageSettingsScreen

## 12.2 Parcours agent

Parcours principal :

- démarrage ;
- connexion ;
- téléchargement zone ;
- création ménage ;
- ajout personnes ;
- ajout relations familiales ;
- soumission ;
- synchronisation ;
- correction si nécessaire.

## 12.3 Règles UX mobile

- Un écran doit avoir une action principale claire.
- Les boutons doivent être larges.
- Les formulaires doivent être découpés en étapes.
- Toute donnée doit être sauvegardée localement.
- Le statut de synchronisation doit être visible.
- Les messages doivent être simples.
- L’application doit rester utilisable hors ligne.
- La langue doit pouvoir être changée dans les paramètres.

---

# 13. Synchronisation mobile

## 13.1 Principe

Le mobile doit toujours écrire d’abord en local.

Lorsqu’un agent crée une donnée :

- sauvegarder dans SQLite ;
- ajouter une entrée dans la file de synchronisation ;
- afficher le statut à synchroniser ;
- envoyer au serveur quand la connexion est disponible ;
- recevoir l’identifiant serveur ;
- mettre à jour la correspondance local / serveur ;
- marquer comme synchronisé.

## 13.2 Types d’opérations

Opérations possibles :

- CREATE
- UPDATE
- DELETE_LOGICAL
- SUBMIT

## 13.3 Entités synchronisées

Entités :

- household ;
- person ;
- family_relation ;
- document ;
- validation_status ;
- correction.

## 13.4 Conflits

Types de conflits :

- modification d’une fiche déjà validée ;
- personne potentiellement en doublon ;
- ménage hors zone ;
- relation familiale contradictoire ;
- conflit de version.

Règles :

- le mobile ne doit pas écraser une donnée validée ;
- le serveur doit retourner un conflit ;
- le mobile doit afficher le conflit ;
- le superviseur doit résoudre le conflit dans Angular.

---

# 14. Détection des doublons

## 14.1 Champs utilisés

Champs à comparer :

- nom ;
- prénom ;
- autres noms ;
- surnom ;
- date de naissance ;
- âge estimé ;
- sexe ;
- lieu de naissance ;
- téléphone ;
- numéro de document ;
- ménage ;
- zone ;
- parents déclarés.

## 14.2 Score indicatif

Score recommandé :

- nom proche ;
- prénom proche ;
- date de naissance identique ;
- âge estimé proche ;
- sexe identique ;
- lieu de naissance proche ;
- téléphone identique ;
- document identique ;
- même ménage ;
- même parent déclaré.

## 14.3 Seuils

Seuils :

- 0 à 40 : faible probabilité ;
- 41 à 70 : doublon possible ;
- 71 à 90 : doublon probable ;
- 91 et plus : doublon très probable.

---

# 15. Internationalisation français / anglais

## 15.1 Objectif

AfriCensus Link doit être disponible en deux langues dès le MVP :

- Français ;
- Anglais.

Le français est la langue par défaut.  
L’anglais est la deuxième langue obligatoire.

L’objectif est que l’application puisse être utilisée par des agents, superviseurs, administrateurs, statisticiens et partenaires internationaux sans modifier le code métier.

---

## 15.2 Principes généraux

L’agent de code doit respecter les principes suivants :

- Aucun texte visible par l’utilisateur ne doit être codé en dur.
- Tous les textes de l’interface doivent passer par un système de traduction.
- Les valeurs métier stockées en base doivent rester sous forme de codes techniques.
- Les statuts doivent être traduits uniquement à l’affichage.
- Les types de relations familiales doivent être traduits uniquement à l’affichage.
- Le backend doit pouvoir retourner des messages localisés.
- Le français doit être utilisé comme langue de secours.
- La langue choisie par l’utilisateur doit être mémorisée.
- Les requêtes envoyées au backend doivent transmettre la langue active.
- Les rapports et exports doivent pouvoir être générés en français ou en anglais.

---

## 15.3 Langues supportées

Langues MVP :

- Français ;
- Anglais.

Codes de langue acceptés :

- fr ;
- fr-FR ;
- en ;
- en-US.

Langue par défaut :

- Français.

Langue de secours :

- Français.

Si une langue non supportée est demandée, l’application doit utiliser le français.

---

## 15.4 Stratégie i18n par couche

### Backend FastAPI

FastAPI doit gérer :

- détection de la langue demandée ;
- messages de succès ;
- messages d’erreur métier ;
- messages liés à la synchronisation ;
- messages liés à la validation ;
- libellés utilisés dans les exports ;
- libellés utilisés dans les rapports générés côté serveur.

Le backend doit toujours retourner :

- un code métier stable ;
- un message dans la langue active.

Le code ne doit jamais changer selon la langue.

### Angular

Angular doit gérer :

- traduction du back-office ;
- changement de langue ;
- mémorisation de la langue ;
- envoi de la langue active au backend ;
- menus traduits ;
- statuts traduits ;
- boutons traduits ;
- messages d’erreur traduits ;
- rapports web traduits.

Le sélecteur de langue doit être disponible dans la barre supérieure.

Libellés recommandés :

- FR ;
- EN.

### Flutter

Flutter doit gérer :

- langue du téléphone si supportée ;
- fallback français si non supportée ;
- changement manuel de langue ;
- mémorisation de la langue ;
- envoi de la langue active au backend ;
- formulaires traduits ;
- messages de synchronisation traduits ;
- corrections demandées traduites.

---

## 15.5 Priorité de détection de langue

La langue active doit être déterminée dans cet ordre :

1. Langue choisie manuellement par l’utilisateur.
2. Langue enregistrée dans le profil utilisateur.
3. Langue du navigateur ou du téléphone.
4. Langue envoyée dans la requête.
5. Français par défaut.

---

## 15.6 Transmission de la langue au backend

Toutes les requêtes envoyées au backend doivent indiquer la langue active.

Le backend doit comprendre si l’utilisateur souhaite recevoir les messages en français ou en anglais.

Si aucune langue n’est transmise, le backend utilise le français.

---

## 15.7 Stockage de la préférence de langue

### Angular

Le back-office doit mémoriser la langue choisie localement dans le navigateur.

La préférence doit rester disponible après fermeture et réouverture du navigateur.

### Flutter

L’application mobile doit mémoriser la langue choisie localement sur l’appareil.

La préférence doit rester disponible après fermeture et réouverture de l’application.

### FastAPI

Le profil utilisateur peut contenir une préférence de langue.

Cette préférence est utile pour :

- rapports ;
- exports ;
- notifications futures ;
- emails éventuels ;
- messages système.

---

# 16. Traductions principales

## 16.1 Menus Angular

Français :

- Tableau de bord
- Zones
- Agents
- Ménages
- Personnes
- Relations familiales
- Validation
- Doublons
- Rapports
- Exports
- Journal d’audit
- Paramètres

Anglais :

- Dashboard
- Zones
- Agents
- Households
- Persons
- Family relations
- Validation
- Duplicates
- Reports
- Exports
- Audit logs
- Settings

---

## 16.2 Actions

Français :

- Créer
- Modifier
- Supprimer
- Enregistrer
- Annuler
- Soumettre
- Valider
- Rejeter
- Demander correction
- Synchroniser
- Exporter
- Rechercher
- Ouvrir
- Fermer
- Continuer
- Retour

Anglais :

- Create
- Edit
- Delete
- Save
- Cancel
- Submit
- Validate
- Reject
- Request correction
- Sync
- Export
- Search
- Open
- Close
- Continue
- Back

---

## 16.3 Statuts métier

Les codes techniques restent en base.

Codes :

- DRAFT
- SUBMITTED
- NEEDS_CORRECTION
- VALIDATED
- REJECTED
- POTENTIAL_DUPLICATE
- ARCHIVED
- LOCAL_ONLY
- PENDING_SYNC
- SYNCED
- SYNC_FAILED
- CONFLICT

Affichage français :

- DRAFT : Brouillon
- SUBMITTED : Soumis
- NEEDS_CORRECTION : À corriger
- VALIDATED : Validé
- REJECTED : Rejeté
- POTENTIAL_DUPLICATE : Doublon potentiel
- ARCHIVED : Archivé
- LOCAL_ONLY : Local uniquement
- PENDING_SYNC : À synchroniser
- SYNCED : Synchronisé
- SYNC_FAILED : Échec de synchronisation
- CONFLICT : Conflit

Affichage anglais :

- DRAFT : Draft
- SUBMITTED : Submitted
- NEEDS_CORRECTION : Needs correction
- VALIDATED : Validated
- REJECTED : Rejected
- POTENTIAL_DUPLICATE : Potential duplicate
- ARCHIVED : Archived
- LOCAL_ONLY : Local only
- PENDING_SYNC : Pending sync
- SYNCED : Synced
- SYNC_FAILED : Sync failed
- CONFLICT : Conflict

---

## 16.4 Types de relations familiales

Les codes techniques restent en base.

Codes :

- PERE_DE
- MERE_DE
- ENFANT_DE
- CONJOINT_DE
- TUTEUR_DE
- RESPONSABLE_LEGAL_DE
- PARENT_DE
- FRERE_DE
- SOEUR_DE
- GRAND_PARENT_DE
- PETIT_ENFANT_DE
- ADOPTANT_DE
- ADOPTE_DE
- MEMBRE_DU_MEME_MENAGE
- CHEF_DE_MENAGE_DE

Affichage français :

- PERE_DE : Père de
- MERE_DE : Mère de
- ENFANT_DE : Enfant de
- CONJOINT_DE : Conjoint de
- TUTEUR_DE : Tuteur de
- RESPONSABLE_LEGAL_DE : Responsable légal de
- PARENT_DE : Parent de
- FRERE_DE : Frère de
- SOEUR_DE : Sœur de
- GRAND_PARENT_DE : Grand-parent de
- PETIT_ENFANT_DE : Petit-enfant de
- ADOPTANT_DE : Adoptant de
- ADOPTE_DE : Adopté de
- MEMBRE_DU_MEME_MENAGE : Membre du même ménage
- CHEF_DE_MENAGE_DE : Chef de ménage de

Affichage anglais :

- PERE_DE : Father of
- MERE_DE : Mother of
- ENFANT_DE : Child of
- CONJOINT_DE : Spouse of
- TUTEUR_DE : Guardian of
- RESPONSABLE_LEGAL_DE : Legal representative of
- PARENT_DE : Parent of
- FRERE_DE : Brother of
- SOEUR_DE : Sister of
- GRAND_PARENT_DE : Grandparent of
- PETIT_ENFANT_DE : Grandchild of
- ADOPTANT_DE : Adoptive parent of
- ADOPTE_DE : Adopted child of
- MEMBRE_DU_MEME_MENAGE : Member of the same household
- CHEF_DE_MENAGE_DE : Head of household of

---

# 17. Textes des écrans mobile

## 17.1 Splash screen

Français :

- AfriCensus Link
- Recenser. Relier. Comprendre.
- Commencer

Anglais :

- AfriCensus Link
- Register. Connect. Understand.
- Start

## 17.2 Connexion mobile

Français :

- Connexion agent
- Identifiant
- Mot de passe
- Se connecter
- Mot de passe oublié ?
- Données protégées

Anglais :

- Agent login
- Username
- Password
- Sign in
- Forgot password?
- Protected data

## 17.3 Tableau de bord agent

Français :

- Bonjour
- Zone affectée
- Ménages
- Personnes
- À envoyer
- À corriger
- Progression
- Créer un ménage
- Voir mes ménages
- Synchroniser

Anglais :

- Hello
- Assigned zone
- Households
- Persons
- To send
- To correct
- Progress
- Create household
- View my households
- Sync

## 17.4 Création ménage

Français :

- Nouveau ménage
- Localisation
- Zone
- Adresse descriptive
- Position GPS
- Capturer ma position
- Type de logement
- Statut d’occupation
- Observation
- Enregistrer le ménage
- Enregistrer et ajouter personne

Anglais :

- New household
- Location
- Zone
- Address description
- GPS position
- Capture my location
- Housing type
- Occupancy status
- Observation
- Save household
- Save and add person

## 17.5 Création personne

Français :

- Nouvelle personne
- Identité
- Nom
- Prénom
- Autres noms
- Surnom
- Sexe
- Date de naissance
- Âge estimé
- Lieu de naissance
- Nationalité
- Document
- Source de l’information
- Enregistrer
- Enregistrer et ajouter relation

Anglais :

- New person
- Identity
- Last name
- First name
- Other names
- Nickname
- Gender
- Birth date
- Estimated age
- Birth place
- Nationality
- Document
- Information source
- Save
- Save and add relation

## 17.6 Relation familiale

Français :

- Ajouter une relation familiale
- Personne source
- Type de relation
- Personne liée
- Source de l’information
- Type de preuve
- Commentaire
- Enregistrer la relation

Anglais :

- Add family relation
- Source person
- Relation type
- Linked person
- Information source
- Evidence type
- Comment
- Save relation

## 17.7 Synchronisation

Français :

- Synchronisation
- État actuel
- Éléments à envoyer
- Dernière synchronisation
- Connexion disponible
- Hors ligne
- Synchroniser maintenant
- Échec réseau
- Synchronisation terminée

Anglais :

- Synchronization
- Current status
- Items to send
- Last synchronization
- Connection available
- Offline
- Sync now
- Network failure
- Synchronization completed

---

# 18. Messages backend localisés

## 18.1 Authentification

Français :

- Identifiant ou mot de passe incorrect.
- Votre compte est désactivé.
- Vous n’avez pas l’autorisation d’effectuer cette action.
- Session expirée. Veuillez vous reconnecter.

Anglais :

- Invalid username or password.
- Your account is disabled.
- You are not allowed to perform this action.
- Session expired. Please sign in again.

## 18.2 Personnes

Français :

- Personne créée avec succès.
- Personne mise à jour avec succès.
- Fiche personne soumise à validation.
- Fiche personne validée.
- Fiche personne rejetée.
- Correction demandée pour cette fiche.
- Personne introuvable.

Anglais :

- Person created successfully.
- Person updated successfully.
- Person record submitted for validation.
- Person record validated.
- Person record rejected.
- Correction requested for this record.
- Person not found.

## 18.3 Ménages

Français :

- Ménage créé avec succès.
- Ménage mis à jour avec succès.
- Ménage soumis à validation.
- Ménage validé.
- Ménage rejeté.
- Chef de ménage manquant.
- Ménage introuvable.

Anglais :

- Household created successfully.
- Household updated successfully.
- Household submitted for validation.
- Household validated.
- Household rejected.
- Head of household missing.
- Household not found.

## 18.4 Relations familiales

Français :

- Relation familiale créée.
- Relation familiale validée.
- Relation familiale rejetée.
- Une personne ne peut pas être liée à elle-même.
- Une incohérence d’âge a été détectée.
- Cette relation existe déjà.
- Relation familiale introuvable.

Anglais :

- Family relation created.
- Family relation validated.
- Family relation rejected.
- A person cannot be linked to themselves.
- An age inconsistency was detected.
- This relation already exists.
- Family relation not found.

## 18.5 Synchronisation

Français :

- Synchronisation démarrée.
- Synchronisation terminée.
- Échec de synchronisation.
- Conflit de synchronisation détecté.
- Aucun élément à synchroniser.
- Certains éléments n’ont pas pu être synchronisés.

Anglais :

- Synchronization started.
- Synchronization completed.
- Synchronization failed.
- Synchronization conflict detected.
- No item to synchronize.
- Some items could not be synchronized.

## 18.6 Doublons

Français :

- Doublon potentiel détecté.
- Doublon confirmé.
- Doublon rejeté.
- Vérification terrain demandée.
- Fiches fusionnées avec succès.

Anglais :

- Potential duplicate detected.
- Duplicate confirmed.
- Duplicate rejected.
- Field verification requested.
- Records merged successfully.

---

# 19. Exports multilingues

Les exports doivent être disponibles en français et en anglais.

## 19.1 Colonnes export personnes

Français :

- Nom
- Prénom
- Sexe
- Date de naissance
- Âge estimé
- Lieu de naissance
- Nationalité
- Ménage
- Zone
- Statut

Anglais :

- Last name
- First name
- Gender
- Birth date
- Estimated age
- Birth place
- Nationality
- Household
- Zone
- Status

## 19.2 Colonnes export ménages

Français :

- Code ménage
- Zone
- Adresse
- Type de logement
- Statut d’occupation
- Nombre de membres
- Chef de ménage
- Statut

Anglais :

- Household code
- Zone
- Address
- Housing type
- Occupancy status
- Number of members
- Head of household
- Status

---

# 20. Rapports multilingues

## 20.1 Titres français

- Rapport de recensement
- Population totale
- Nombre de ménages
- Répartition par sexe
- Répartition par âge
- Avancement par zone
- Avancement par agent
- Fiches à corriger
- Doublons potentiels
- Données synchronisées

## 20.2 Titres anglais

- Census report
- Total population
- Number of households
- Breakdown by gender
- Breakdown by age
- Progress by zone
- Progress by agent
- Records needing correction
- Potential duplicates
- Synchronized data

---

# 21. Sécurité

## 21.1 Authentification

Le système doit utiliser :

- access token court ;
- refresh token ;
- rotation refresh token ;
- révocation token ;
- expiration session ;
- stockage sécurisé mobile.

## 21.2 Autorisation

Chaque requête doit contrôler :

- rôle ;
- permission ;
- zone affectée ;
- campagne active ;
- droit d’export ;
- droit de validation.

## 21.3 Données sensibles

Données sensibles :

- nom ;
- prénom ;
- date de naissance ;
- lieu de naissance ;
- adresse ;
- GPS ;
- téléphone ;
- document ;
- photo ;
- relations familiales ;
- statuts vulnérables.

## 21.4 Audit obligatoire

Toute action sensible doit être journalisée.

---

# 22. Charte graphique

## 22.1 Identité

Nom :

- AfriCensus Link

Slogan français :

- Recenser. Relier. Comprendre.

Slogan anglais :

- Register. Connect. Understand.

Style :

- institutionnel ;
- humain ;
- moderne ;
- sécurisé.

## 22.2 Couleurs

Couleurs principales :

- Bleu Gouvernance : #1F4E79
- Vert Territoire : #2E7D32
- Ocre Communauté : #D9902F
- Fond clair : #F7F9FB
- Texte principal : #1F2937
- Texte secondaire : #6B7280
- Erreur : #C62828
- Alerte : #F9A825
- Information : #1976D2

## 22.3 Statuts visuels

- brouillon : gris ;
- soumis : bleu ;
- à corriger : orange ;
- validé : vert ;
- rejeté : rouge ;
- doublon potentiel : violet ;
- synchronisé : vert ;
- à synchroniser : orange ;
- conflit : rouge.

---

# 23. Tests obligatoires

## 23.1 Tests backend

Tester :

- login ;
- refresh token ;
- création zone ;
- création campagne ;
- création ménage ;
- création personne ;
- création relation familiale ;
- validation personne ;
- rejet personne ;
- synchronisation push ;
- synchronisation pull ;
- score doublon ;
- permissions ;
- audit logs ;
- messages localisés français ;
- messages localisés anglais ;
- fallback français.

## 23.2 Tests Angular

Tester :

- login ;
- routes protégées ;
- dashboard ;
- liste personnes ;
- détail personne ;
- liste ménages ;
- détail ménage ;
- validation ;
- rapports ;
- audit logs ;
- changement français / anglais ;
- persistance de la langue ;
- envoi de la langue active au backend.

## 23.3 Tests Flutter

Tester :

- login ;
- création ménage hors ligne ;
- création personne hors ligne ;
- création relation hors ligne ;
- ajout dans la file de synchronisation ;
- synchronisation ;
- erreur réseau ;
- corrections demandées ;
- changement français / anglais ;
- persistance de la langue ;
- envoi de la langue active au backend.

---

# 24. Backlog MVP

## Sprint 0 : Initialisation

- créer monorepo ;
- créer backend FastAPI ;
- créer application Angular ;
- créer application Flutter ;
- créer Docker PostgreSQL ;
- créer configuration environnement.

## Sprint 1 : Authentification et utilisateurs

- modèles users, roles, permissions ;
- login JWT ;
- refresh token ;
- login Angular ;
- login Flutter ;
- guards Angular ;
- stockage sécurisé mobile ;
- préférence langue utilisateur.

## Sprint 2 : Zones et campagnes

- API zones ;
- API campagnes ;
- affectation agent-zone ;
- interface Angular zones ;
- téléchargement zones sur Flutter.

## Sprint 3 : Ménages

- API ménages ;
- création ménage Flutter ;
- liste ménages Flutter ;
- liste ménages Angular ;
- détail ménage Angular.

## Sprint 4 : Personnes

- API personnes ;
- création personne Flutter ;
- détail personne Flutter ;
- liste personnes Angular ;
- détail personne Angular.

## Sprint 5 : Relations familiales

- API relations familiales ;
- ajout relation Flutter ;
- affichage relations Angular ;
- règles métier relation.

## Sprint 6 : Synchronisation

- SQLite Flutter ;
- file de synchronisation ;
- sync push ;
- sync pull ;
- correspondance local_id / server_id ;
- gestion erreurs.

## Sprint 7 : Validation

- file validation Angular ;
- valider personne ;
- rejeter personne ;
- demander correction ;
- corrections demandées sur Flutter.

## Sprint 8 : Rapports, doublons, audit et i18n

- rapports population ;
- exports CSV ;
- détection doublons simple ;
- audit logs ;
- page audit Angular ;
- traduction Angular français / anglais ;
- traduction Flutter français / anglais ;
- messages backend français / anglais ;
- exports multilingues.

---

# 25. Critères d’acceptation MVP

Le MVP est accepté si :

- un agent peut se connecter sur Flutter ;
- un agent peut télécharger sa zone ;
- un agent peut créer un ménage hors ligne ;
- un agent peut créer une personne hors ligne ;
- un agent peut créer une relation familiale hors ligne ;
- les données sont stockées localement ;
- les données sont ajoutées à la file de synchronisation ;
- les données se synchronisent vers FastAPI ;
- le superviseur voit les fiches dans Angular ;
- le superviseur peut valider, rejeter ou demander correction ;
- le mobile reçoit les corrections ;
- le dashboard Angular affiche les indicateurs principaux ;
- les exports CSV fonctionnent ;
- les logs d’audit sont créés ;
- les permissions par rôle sont appliquées ;
- FastAPI sert le build Angular en production ;
- l’application Angular fonctionne en français et en anglais ;
- l’application Flutter fonctionne en français et en anglais ;
- FastAPI retourne les messages métier en français ou en anglais ;
- le français est utilisé comme fallback.

---

# 26. Definition of Done

Une tâche est terminée si :

- le code est développé ;
- le code est relu ;
- les tests passent ;
- les migrations sont créées si nécessaire ;
- les endpoints sont documentés ;
- les permissions sont appliquées ;
- les erreurs sont gérées proprement ;
- les logs d’audit sont créés si nécessaire ;
- la fonctionnalité fonctionne en environnement de test ;
- la documentation est mise à jour ;
- les textes visibles existent en français ;
- les textes visibles existent en anglais ;
- aucun libellé utilisateur n’est codé en dur ;
- la langue active est transmise au backend ;
- le fallback français fonctionne.

---

# 27. Instructions strictes pour l’agent de code

L’agent de code doit respecter strictement les règles suivantes :

- Ne pas mélanger les routes API et le fallback Angular.
- Toutes les routes API doivent commencer par /api/v1.
- FastAPI doit servir Angular uniquement pour les routes non API.
- Ne jamais supprimer physiquement une fiche métier.
- Utiliser une suppression logique.
- Ne jamais modifier directement une fiche validée depuis Flutter.
- Toutes les modifications sensibles doivent être auditées.
- Le mobile doit toujours écrire en local avant synchronisation.
- La synchronisation doit être relançable après échec.
- Le serveur doit retourner les erreurs par élément synchronisé.
- Les données personnelles ne doivent pas apparaître dans les exports anonymisés.
- Les permissions doivent être contrôlées côté backend.
- Ne pas stocker les libellés traduits comme valeurs métier en base.
- Ne stocker que des codes techniques.
- Traduire les statuts dans Angular ou Flutter.
- Traduire les types de relation dans Angular ou Flutter.
- Ne pas dupliquer les pages par langue.
- Ne pas créer deux applications séparées.
- Ne pas coder les textes directement dans les écrans.
- Ne pas retourner uniquement du texte libre depuis FastAPI.
- Toujours retourner un code stable avec le message.
- Toujours prévoir un fallback français.
- Toujours transmettre la langue active au backend.

---

# 28. Résultat attendu

L’agent de code doit produire :

- un backend FastAPI fonctionnel ;
- une base PostgreSQL migrée ;
- une application Angular de back-office ;
- une application Flutter mobile offline-first ;
- une synchronisation mobile fiable ;
- un système d’authentification JWT ;
- un système de rôles et permissions ;
- un dashboard superviseur ;
- un module de validation ;
- un module de doublons simple ;
- un module de rapports ;
- un module d’audit ;
- une internationalisation français / anglais complète ;
- un serveur FastAPI capable de servir Angular en production ;
- une documentation de lancement local ;
- un docker-compose fonctionnel.

---

# 29. Résumé final

Construire AfriCensus Link avec :

- FastAPI pour l’API, la sécurité, la base de données, la synchronisation, les rapports, les exports, l’audit, l’i18n backend et le service du front Angular ;
- Angular pour le tableau de bord web, la validation, les rapports, les exports, l’audit et l’interface bilingue ;
- Flutter pour l’application terrain offline-first et bilingue ;
- PostgreSQL + PostGIS pour les données centrales ;
- SQLite mobile pour la collecte hors ligne ;
- JWT pour l’authentification ;
- Docker pour le lancement local et le déploiement.

L’application doit permettre de :

- recenser les personnes ;
- créer les ménages ;
- relier les familles ;
- collecter hors ligne ;
- synchroniser ;
- valider ;
- détecter les doublons ;
- produire des rapports ;
- sécuriser les données ;
- auditer les actions ;
- fonctionner en français et en anglais.

## 22. Gestion des versions et Gitignore

Afin d'éviter de surcharger le dépôt Git, l'agent de code doit respecter scrupuleusement les règles suivantes concernant `.gitignore` :

- **Backend / Frontend** : Ne jamais versionner les dossiers générés ou les dépendances (`node_modules/`, `dist/`, `__pycache__/`, `venv/`, `.angular/`, `.pytest_cache/`).
- **Mobile (Flutter)** : Ignorer impérativement le dossier de build principal (`mobile/build/`), les dépendances et builds iOS (`mobile/ios/Pods/`, `mobile/ios/.symlinks/`, `mobile/ios/Runner.xcworkspace/`, `mobile/ios/Flutter/Flutter.framework/`), et les builds Android (`mobile/android/.gradle/`, `mobile/android/app/build/`).
- **IDE** : Ne jamais commit les dossiers générés par les IDE (`.idea/`, `.vscode/`, `.dart_tool/`).

Ces règles doivent être présentes dans le fichier `.gitignore` à la racine pour garantir que le dépôt reste léger.