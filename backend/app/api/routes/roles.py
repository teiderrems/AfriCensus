from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ...database import get_db
from ...dependencies import require_roles
from ...models import AppRole, User
from ...schemas import AppRoleIn, AppRoleOut, Role, now_iso
from ...services import db_audit

router = APIRouter(prefix="/roles", tags=["roles"])

SYSTEM_PERMISSIONS = [
    {
        "module": "users",
        "label_fr": "Gestion des Utilisateurs & Accès",
        "label_en": "User Management & Access",
        "permissions": [
            {"key": "users:read", "label_fr": "Consulter les utilisateurs", "label_en": "View users", "desc_fr": "Voir la liste et les détails des utilisateurs", "desc_en": "View user list and details"},
            {"key": "users:write", "label_fr": "Créer et modifier des utilisateurs", "label_en": "Create and edit users", "desc_fr": "Ajouter de nouveaux comptes et éditer les informations", "desc_en": "Add new accounts and edit details"},
            {"key": "users:delete", "label_fr": "Désactiver/supprimer des utilisateurs", "label_en": "Deactivate/delete users", "desc_fr": "Changer le statut actif ou supprimer des comptes", "desc_en": "Change active status or delete accounts"},
            {"key": "roles:manage", "label_fr": "Gérer les rôles et permissions", "label_en": "Manage roles and permissions", "desc_fr": "Créer et modifier les rôles système et leurs privilèges", "desc_en": "Create and edit system roles and their privileges"},
        ]
    },
    {
        "module": "persons",
        "label_fr": "Recensement & Fiches Individuelles",
        "label_en": "Census & Individual Records",
        "permissions": [
            {"key": "persons:read", "label_fr": "Consulter les personnes", "label_en": "View persons", "desc_fr": "Accéder aux fiches individuelles recensées", "desc_en": "Access individual census records"},
            {"key": "persons:write", "label_fr": "Enregistrer et modifier des personnes", "label_en": "Create and edit persons", "desc_fr": "Saisir ou corriger les données d'une personne", "desc_en": "Input or update person details"},
            {"key": "persons:validate", "label_fr": "Valider les fiches personnes", "label_en": "Validate person records", "desc_fr": "Approuver les déclarations soumises par les agents", "desc_en": "Approve declarations submitted by agents"},
            {"key": "persons:delete", "label_fr": "Supprimer des personnes", "label_en": "Delete persons", "desc_fr": "Archiver ou supprimer une fiche personne", "desc_en": "Archive or remove a person record"},
        ]
    },
    {
        "module": "households",
        "label_fr": "Gestion des Ménages & Famille",
        "label_en": "Households & Family Management",
        "permissions": [
            {"key": "households:read", "label_fr": "Consulter les ménages", "label_en": "View households", "desc_fr": "Afficher la liste des ménages et arbres généalogiques", "desc_en": "View households list and family trees"},
            {"key": "households:write", "label_fr": "Créer et modifier des ménages", "label_en": "Create and edit households", "desc_fr": "Ajouter ou modifier la composition d'un ménage", "desc_en": "Add or update household composition"},
            {"key": "households:validate", "label_fr": "Valider les ménages", "label_en": "Validate households", "desc_fr": "Valider définitivement la fiche d'un ménage", "desc_en": "Validate household record"},
        ]
    },
    {
        "module": "zones",
        "label_fr": "Territoire & Campagnes",
        "label_en": "Territory & Campaigns",
        "permissions": [
            {"key": "zones:read", "label_fr": "Consulter le découpage territorial", "label_en": "View geographic zones", "desc_fr": "Consulter la cartographie et les zones", "desc_en": "View map and collection zones"},
            {"key": "zones:write", "label_fr": "Gérer les zones et affectations", "label_en": "Manage zones and assignments", "desc_fr": "Créer des zones et affecter des agents", "desc_en": "Create zones and assign agents"},
            {"key": "campaigns:read", "label_fr": "Consulter les campagnes", "label_en": "View campaigns", "desc_fr": "Voir les détails des campagnes de recensement", "desc_en": "View census campaign details"},
            {"key": "campaigns:write", "label_fr": "Administrer les campagnes", "label_en": "Administer campaigns", "desc_fr": "Créer et clôturer des campagnes", "desc_en": "Create and close campaigns"},
        ]
    },
    {
        "module": "validation",
        "label_fr": "Contrôle de Qualité & Doublons",
        "label_en": "Quality Control & Duplicates",
        "permissions": [
            {"key": "validation:manage", "label_fr": "Traiter la file de validation", "label_en": "Process validation queue", "desc_fr": "Demander des corrections ou approuver les soumissions", "desc_en": "Request corrections or approve submissions"},
            {"key": "duplicates:manage", "label_fr": "Fusionner les doublons", "label_en": "Merge duplicate records", "desc_fr": "Inspecter et résoudre les paires de doublons suspectes", "desc_en": "Inspect and resolve duplicate candidates"},
        ]
    },
    {
        "module": "reports_audit",
        "label_fr": "Statistiques, Exports & Audit",
        "label_en": "Analytics, Exports & Audit",
        "permissions": [
            {"key": "reports:read", "label_fr": "Consulter les tableaux de bord", "label_en": "Access analytics dashboards", "desc_fr": "Visualiser les graphiques et synthèses démographiques", "desc_en": "View charts and demographic summaries"},
            {"key": "reports:export", "label_fr": "Exporter les données", "label_en": "Export raw data", "desc_fr": "Télécharger les rapports au format CSV/Excel", "desc_en": "Download reports in CSV/Excel format"},
            {"key": "audit:read", "label_fr": "Consulter les journaux d'audit", "label_en": "View security audit logs", "desc_fr": "Inspecter l'historique des actions utilisateurs et sécurité", "desc_en": "Inspect history of user actions and security events"},
            {"key": "system:config", "label_fr": "Configurer le système", "label_en": "System configuration", "desc_fr": "Modifier les paramètres d'infrastructure et maintenance", "desc_en": "Update infrastructure and maintenance settings"},
        ]
    },
    {
        "module": "features",
        "label_fr": "Accès aux Modules Applicatifs",
        "label_en": "Application Module Access",
        "permissions": [
            {"key": "messaging:access", "label_fr": "Messagerie instantanée", "label_en": "Instant Messaging", "desc_fr": "Autoriser l'accès au module de messagerie", "desc_en": "Grant access to instant messaging module"},
            {"key": "family_tree:access", "label_fr": "Arbre Généalogique", "label_en": "Family Tree", "desc_fr": "Autoriser l'accès à l'arbre généalogique", "desc_en": "Grant access to family tree module"},
            {"key": "medical:read", "label_fr": "Antécédents Médicaux", "label_en": "Medical History", "desc_fr": "Autoriser l'accès aux antécédents médicaux", "desc_en": "Grant access to medical history module"},
            {"key": "forms:access", "label_fr": "Formulaires Personnalisés", "label_en": "Custom Forms", "desc_fr": "Autoriser l'utilisation des formulaires dynamiques", "desc_en": "Grant access to dynamic forms module"},
            {"key": "birth_declaration:access", "label_fr": "Déclarations de Naissance", "label_en": "Birth Declarations", "desc_fr": "Autoriser l'accès aux déclarations de naissance", "desc_en": "Grant access to birth declarations module"},
            {"key": "duplicates:manage", "label_fr": "Gestion des Doublons", "label_en": "Duplicate Management", "desc_fr": "Autoriser l'accès à la détection et fusion de doublons", "desc_en": "Grant access to duplicate resolution module"},
            {"key": "audit:read", "label_fr": "Piste d'Audit", "label_en": "Audit Trail", "desc_fr": "Autoriser l'accès aux journaux d'audit de sécurité", "desc_en": "Grant access to security audit logs"},
        ]
    }
]

DEFAULT_ROLES = [
    {
        "id": "ADMIN",
        "name": "ADMIN",
        "description": "Administrateur National avec accès complet au système.",
        "permissions": [
            "users:read", "users:write", "users:delete", "roles:manage",
            "persons:read", "persons:write", "persons:validate", "persons:delete",
            "households:read", "households:write", "households:validate",
            "zones:read", "zones:write", "campaigns:read", "campaigns:write",
            "validation:manage", "duplicates:manage",
            "reports:read", "reports:export", "audit:read", "system:config",
            "messaging:access", "family_tree:access", "medical:read", "forms:access", "birth_declaration:access"
        ]
    },
    {
        "id": "SUPERVISOR",
        "name": "SUPERVISOR",
        "description": "Superviseur Régional responsable de la validation et du suivi des zones.",
        "permissions": [
            "users:read",
            "persons:read", "persons:write", "persons:validate",
            "households:read", "households:write", "households:validate",
            "zones:read", "campaigns:read",
            "validation:manage", "duplicates:manage",
            "reports:read", "reports:export",
            "messaging:access", "family_tree:access", "birth_declaration:access"
        ]
    },
    {
        "id": "AGENT",
        "name": "AGENT",
        "description": "Agent Recenseur de terrain pour la collecte des ménages et des individus.",
        "permissions": [
            "persons:read", "persons:write",
            "households:read", "households:write",
            "messaging:access", "family_tree:access", "birth_declaration:access", "forms:access"
        ]
    },
    {
        "id": "STATISTICIAN",
        "name": "STATISTICIAN",
        "description": "Analyste Démographique pour l'exploitation des données et rapports.",
        "permissions": [
            "persons:read", "households:read", "reports:read", "reports:export",
            "family_tree:access", "medical:read"
        ]
    },
    {
        "id": "AUDITOR",
        "name": "AUDITOR",
        "description": "Auditeur Sécurité pour le suivi de la traçabilité et de la conformité.",
        "permissions": [
            "users:read", "reports:read", "audit:read"
        ]
    }
]


def _ensure_default_roles(db: Session) -> None:
    now = now_iso()
    for role_data in DEFAULT_ROLES:
        existing = db.scalar(select(AppRole).where(AppRole.id == role_data["id"]))
        if not existing:
            db_role = AppRole(
                id=role_data["id"],
                name=role_data["name"],
                description=role_data["description"],
                permissions=role_data["permissions"],
                disabled_features=role_data.get("disabled_features", []),
                created_at=now,
                updated_at=now,
            )
            db.add(db_role)
        else:
            if existing.disabled_features is None:
                existing.disabled_features = []
    db.commit()


@router.get("/permissions/available", summary="Lister les permissions système disponibles")
def list_available_permissions(
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> list[dict[str, Any]]:
    return SYSTEM_PERMISSIONS


@router.get("", response_model=list[AppRoleOut], summary="Lister les rôles applicatifs")
def list_roles(
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)),
    db: Session = Depends(get_db),
) -> Any:
    _ensure_default_roles(db)
    roles = db.scalars(select(AppRole).order_by(AppRole.name)).all()
    user_counts = dict(
        db.query(User.role, func.count(User.id))
        .filter(User.active == True)
        .group_by(User.role)
        .all()
    )
    
    result = []
    for r in roles:
        role_dict = r.to_dict()
        role_dict["user_count"] = user_counts.get(r.name, 0)
        role_dict["is_system"] = r.id in ["ADMIN", "SUPERVISOR", "AGENT", "STATISTICIAN", "AUDITOR"]
        result.append(role_dict)
    return result


@router.post("", response_model=AppRoleOut, status_code=201, summary="Créer un rôle d'application")
def create_role(
    payload: AppRoleIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> Any:
    _ensure_default_roles(db)
    role_code = payload.name.strip().upper().replace(" ", "_")
    existing = db.scalar(select(AppRole).where(AppRole.name == role_code))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role name already exists")
    
    now = now_iso()
    new_role = AppRole(
        id=f"ROLE-{str(uuid4())[:8]}",
        name=role_code,
        description=payload.description,
        permissions=payload.permissions,
        disabled_features=payload.disabled_features,
        created_at=now,
        updated_at=now,
    )
    db.add(new_role)
    db_audit(db, user["id"], "CREATE_ROLE", "app_roles", new_role.id)
    db.commit()
    db.refresh(new_role)
    res = new_role.to_dict()
    res["user_count"] = 0
    res["is_system"] = False
    return res


@router.get("/{role_id}", response_model=AppRoleOut, summary="Lire un rôle")
def get_role(
    role_id: str,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)),
    db: Session = Depends(get_db),
) -> Any:
    role = db.scalar(select(AppRole).where(AppRole.id == role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user_count = db.scalar(select(func.count(User.id)).where(User.role == role.name).where(User.active == True))
    res = role.to_dict()
    res["user_count"] = user_count
    res["is_system"] = role.id in ["ADMIN", "SUPERVISOR", "AGENT", "STATISTICIAN", "AUDITOR"]
    return res


@router.put("/{role_id}", response_model=AppRoleOut, summary="Modifier un rôle")
def update_role(
    role_id: str,
    payload: AppRoleIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> Any:
    role = db.scalar(select(AppRole).where(AppRole.id == role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    new_name = payload.name.strip().upper().replace(" ", "_")
    if new_name != role.name:
        existing = db.scalar(select(AppRole).where(AppRole.name == new_name).where(AppRole.id != role_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role name already exists")
        role.name = new_name
        
    role.description = payload.description
    role.permissions = payload.permissions
    role.disabled_features = payload.disabled_features
    role.updated_at = now_iso()
    
    db_audit(db, user["id"], "UPDATE_ROLE", "app_roles", role_id)
    db.commit()
    db.refresh(role)
    
    user_count = db.scalar(select(func.count(User.id)).where(User.role == role.name).where(User.active == True))
    res = role.to_dict()
    res["user_count"] = user_count
    res["is_system"] = role.id in ["ADMIN", "SUPERVISOR", "AGENT", "STATISTICIAN", "AUDITOR"]
    return res


@router.delete("/{role_id}", status_code=204, summary="Supprimer un rôle personnalisé")
def delete_role(
    role_id: str,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    role = db.scalar(select(AppRole).where(AppRole.id == role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.id in ["ADMIN", "SUPERVISOR", "AGENT", "STATISTICIAN", "AUDITOR"]:
        raise HTTPException(status_code=400, detail="Cannot delete built-in system role")
        
    users_with_role = db.scalar(select(func.count(User.id)).where(User.role == role.name).where(User.active == True))
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role currently assigned to {users_with_role} user(s)")
        
    db.delete(role)
    db_audit(db, user["id"], "DELETE_ROLE", "app_roles", role_id)
    db.commit()
    return Response(status_code=204)
