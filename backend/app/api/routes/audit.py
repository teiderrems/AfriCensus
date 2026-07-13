from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
from ...dependencies import require_roles
from ...schemas import AuditLogOut, Role


router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def audit_logs(user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.AUDITOR))) -> list[dict[str, Any]]:
    logs = sorted(store.all()["audit_logs"], key=lambda item: item["created_at"], reverse=True)
    all_users = {u["id"]: u for u in store.all().get("users", [])}
    
    result = []
    for log in logs:
        # Shallow copy to avoid mutating the store directly if it's returning references
        out_log = dict(log)
        
        user_id = out_log.get("user_id")
        if user_id and user_id in all_users:
            out_log["user_name"] = all_users[user_id].get("full_name")
        else:
            out_log["user_name"] = "system" if not user_id else user_id
            
        entity_type = out_log.get("entity_type")
        entity_id = out_log.get("entity_id")
        entity_name = entity_id
        
        if entity_type and entity_type in store.all():
            entity_list = store.all()[entity_type]
            entity = next((e for e in entity_list if e.get("id") == entity_id), None)
            if entity:
                if "household_code" in entity:
                    entity_name = entity["household_code"]
                elif "first_name" in entity and "last_name" in entity:
                    entity_name = f"{entity['first_name']} {entity['last_name']}"
                elif "name" in entity:
                    entity_name = entity["name"]
                elif "full_name" in entity:
                    entity_name = entity["full_name"]
                    
        out_log["entity_name"] = entity_name
        result.append(out_log)
        
    return result
