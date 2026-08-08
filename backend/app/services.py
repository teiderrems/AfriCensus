from sqlalchemy.orm import Session
from app.db_services import visible_query
from typing import Any
from uuid import uuid4
from fastapi import HTTPException
from .schemas import ValidationStatus, now_iso


def can_see_zone(user: dict[str, Any], zone_id: str) ->bool:
    return user['role'] == 'ADMIN' or zone_id in user.get('zone_ids', [])


def assert_zone(user: dict[str, Any], zone_id: str) ->None:
    if not can_see_zone(user, zone_id):
        raise HTTPException(status_code=403, detail='Zone not allowed')


def public_user(user: dict[str, Any]) ->dict[str, Any]:
    return {key: user[key] for key in ('id', 'username', 'full_name',
        'role', 'zone_ids')}


def inverse_relation(relation: dict[str, Any]) ->(dict[str, Any] | None):
    mapping = {'PERE_DE': 'ENFANT_DE', 'MERE_DE': 'ENFANT_DE',
        'CONJOINT_DE': 'CONJOINT_DE'}
    inverse_type = mapping.get(relation['relation_type'])
    if not inverse_type:
        return None
    return {'local_id': None, 'campaign_id': relation['campaign_id'],
        'source_person_id': relation['target_person_id'],
        'target_person_id': relation['source_person_id'], 'relation_type':
        inverse_type, 'evidence_type': relation.get('evidence_type'),
        'source_type': relation.get('source_type'), 'validation_status':
        'SUBMITTED', 'sync_status': 'SYNCED', 'comment':
        'Relation inverse générée automatiquement', 'zone_id': relation.get
        ('zone_id')}


def _determine_category(rtype: str) -> str:
    rtype_upper = (rtype or "").upper()
    if rtype_upper in ["PERE_DE", "MERE_DE", "ENFANT_DE", "FATHER", "MOTHER", "PARENT", "SON", "DAUGHTER", "CHILD", "STEPFATHER", "STEPMOTHER", "STEPSON", "STEPDAUGHTER"]:
        return "parent_child"
    elif rtype_upper in ["CONJOINT_DE", "EPOUX_DE", "EPOUSE_DE", "SPOUSE", "HUSBAND", "WIFE", "PARTNER"]:
        return "spouse"
    elif rtype_upper in ["TUTEUR_DE", "RESPONSABLE_LEGAL_DE", "GUARDIAN", "BEAU_PERE_DE", "BELLE_MERE_DE", "BEAU_FILS_DE", "BELLE_FILLE_DE"]:
        return "guardian"
    return "parent_child" if "DE" in rtype_upper or "PARENT" in rtype_upper else "guardian"


def _fetch_family_network(db: Session, person_id: str, depth: int, user: dict[str, Any]):
    from sqlalchemy import select, or_
    from .models import Person, FamilyRelation
    
    visited_people_ids = set()
    current_layer_ids = {person_id}
    
    graph: dict[str, list[tuple[str, str, str, str, str]]] = {}
    all_people_dict = {}

    for d in range(depth):
        if not current_layer_ids:
            break
            
        visited_people_ids.update(current_layer_ids)
        
        relations = db.scalars(
            select(FamilyRelation)
            .where(
                or_(
                    FamilyRelation.source_person_id.in_(current_layer_ids),
                    FamilyRelation.target_person_id.in_(current_layer_ids)
                )
            )
            .where(FamilyRelation.deleted_at.is_(None))
        ).all()
        
        next_layer_ids = set()
        for r in relations:
            src = r.source_person_id
            tgt = r.target_person_id
            rtype = r.relation_type
            st = getattr(r, 'validation_status', None) or 'VALIDATED'
            cat = _determine_category(rtype)
            rid = r.id or f"{src}_{rtype}_{tgt}"
            
            if src not in graph: graph[src] = []
            if tgt not in graph: graph[tgt] = []
            
            edge_src = (rtype, tgt, st, cat, rid)
            if edge_src not in graph[src]:
                graph[src].append(edge_src)
            
            inv = inverse_relation(r.to_dict())
            if inv:
                inv_type = inv['relation_type']
                inv_cat = _determine_category(inv_type)
                edge_tgt = (inv_type, src, st, inv_cat, f"{rid}_inv")
                if edge_tgt not in graph[tgt]:
                    graph[tgt].append(edge_tgt)
                    
            if src in current_layer_ids and tgt not in visited_people_ids:
                next_layer_ids.add(tgt)
            if tgt in current_layer_ids and src not in visited_people_ids:
                next_layer_ids.add(src)
                
        current_layer_ids = next_layer_ids

    all_needed = visited_people_ids | current_layer_ids
    if all_needed:
        people = db.scalars(
            visible_query(select(Person), Person, user)
            .where(Person.id.in_(all_needed))
            .where(Person.deleted_at.is_(None))
        ).all()
        for p in people:
            all_people_dict[p.id] = p.to_dict()
            
    filtered_graph = {}
    for node, edges in graph.items():
        if node in all_people_dict:
            filtered_graph[node] = [edge for edge in edges if edge[1] in all_people_dict]

    return all_people_dict, filtered_graph


def _node_group(item_id: str, person_id: str, parents: set[str], children:
    set[str], spouses: set[str], siblings: set[str]) ->str:
    if item_id == person_id:
        return 'root'
    if item_id in parents:
        return 'parent'
    if item_id in spouses:
        return 'spouse'
    if item_id in children:
        return 'child'
    if item_id in siblings:
        return 'sibling'
    return 'relative'


from sqlalchemy import select, delete
from .models import MODEL_BY_COLLECTION, _clean_payload

def active_condition(model):
    if hasattr(model, 'deleted_at'):
        return model.deleted_at.is_(None)
    elif hasattr(model, 'active'):
        return model.active == True
    elif hasattr(model, 'is_active'):
        return model.is_active == True
    else:
        from sqlalchemy import true
        return true()



def db_audit(db: Session, user_id: (str | None), action: str, entity_type:
    str, entity_id: str) ->None:
    model = MODEL_BY_COLLECTION['audit_logs']
    audit_log = model(id=str(uuid4()), user_id=user_id, action=action,
        entity_type=entity_type, entity_id=entity_id, created_at=now_iso())
    db.add(audit_log)


def db_create_item(db: Session, collection: str, payload: dict[str, Any],
    user_id: str, action: str) ->dict[str, Any]:
    model = MODEL_BY_COLLECTION[collection]
    now = now_iso()
    item_id = str(uuid4())
    item_dict = {'id': item_id, **payload, 'created_by': payload.get(
        'created_by', user_id), 'created_at': now, 'updated_at': now,
        'deleted_at': None}
    instance = model(**_clean_payload(model, item_dict))
    db.add(instance)
    db_audit(db, user_id, action, collection, item_id)
    db.commit()
    db.refresh(instance)
    return instance.to_dict()


def db_update_item(db: Session, collection: str, item_id: str, payload:
    dict[str, Any], user_id: str, action: str) ->dict[str, Any]:
    model = MODEL_BY_COLLECTION[collection]
    instance = db.scalar(select(model).where(model.id == item_id).where(
        active_condition(model)))
    if not instance:
        raise HTTPException(status_code=404, detail=f'{collection} not found')
    update_data = payload | {'updated_at': now_iso()}
    cleaned = _clean_payload(model, update_data)
    for key, value in cleaned.items():
        setattr(instance, key, value)
    db_audit(db, user_id, action, collection, item_id)
    db.commit()
    db.refresh(instance)
    return instance.to_dict()


def db_decision(db: Session, collection: str, item_id: str, status_value:
    str, comment: (str | None), user_id: str, action: str) ->dict[str, Any]:
    model = MODEL_BY_COLLECTION[collection]
    instance = db.scalar(select(model).where(model.id == item_id).where(
        active_condition(model)))
    if not instance:
        raise HTTPException(status_code=404, detail=f'{collection} not found')
    instance.validation_status = ValidationStatus(status_value).value
    if hasattr(instance, 'decision_comment'):
        instance.decision_comment = comment
    instance.updated_at = now_iso()
    db_audit(db, user_id, action, collection, item_id)
    db.commit()
    db.refresh(instance)
    return instance.to_dict()


def db_set_status(db: Session, collection: str, item_id: str, status_value:
    str, user_id: str, action: str, comment: str | None = None) -> dict[str, Any]:
    return db_decision(db, collection, item_id, status_value, comment, user_id,
        action)


def db_soft_delete(db: Session, collection: str, item_id: str, user_id: str,
    action: str) ->None:
    model = MODEL_BY_COLLECTION[collection]
    instance = db.scalar(select(model).where(model.id == item_id).where(
        active_condition(model)))
    if not instance:
        raise HTTPException(status_code=404, detail=f'{collection} not found')
    instance.deleted_at = now_iso()
    db_audit(db, user_id, action, collection, item_id)
    db.commit()


def db_find_or_404(db: Session, collection: str, item_id: str) ->dict[str, Any
    ]:
    model = MODEL_BY_COLLECTION[collection]
    instance = db.scalar(select(model).where(model.id == item_id).where(
        active_condition(model)))
    if not instance:
        raise HTTPException(status_code=404, detail=f'{collection} not found')
    return instance.to_dict()


def db_visible_item(db: Session, collection: str, item_id: str, user: dict[
    str, Any]) ->dict[str, Any]:
    item = db_find_or_404(db, collection, item_id)
    if item.get('zone_id') and not can_see_zone(user, item['zone_id']):
        raise HTTPException(status_code=403, detail='Zone not allowed')
    return item


def db_build_family_tree(db: Session, person_id: str, user: dict[str, Any], depth: int=2) ->dict[str, Any]:
    central = db_visible_item(db, 'persons', person_id, user)
    visible_people, graph = _fetch_family_network(db, central['id'], depth, user)

    def public_person(p):
        if not p:
            return {}
        d = p if isinstance(p, dict) else p.to_dict()
        fname = d.get('first_name') or ''
        lname = d.get('last_name') or ''
        d['label'] = f"{fname} {lname}".strip() or d.get('id', '')
        return d

    nodes = []
    links = []
    
    distances: dict[str, int] = {central['id']: 0}
    queue = [(central['id'], 0)]
    while queue:
        current_id, current_dist = queue.pop(0)
        if current_dist < depth:
            for edge in graph.get(current_id, []):
                target_id = edge[1] if isinstance(edge, (tuple, list)) else edge
                if target_id not in distances:
                    distances[target_id] = current_dist + 1
                    queue.append((target_id, current_dist + 1))
                    
    # Build direct relation lookup for central person
    central_rel_map = {}
    for edge in graph.get(central['id'], []):
        if isinstance(edge, (tuple, list)):
            rtype, tgt = edge[0], edge[1]
            central_rel_map[tgt] = rtype

    for pid, dist in distances.items():
        node = public_person(visible_people[pid])
        if pid == central['id']:
            node['group'] = 'root'
        elif pid in central_rel_map:
            rtype = central_rel_map[pid]
            if rtype in ['FATHER', 'MOTHER', 'PARENT', 'STEPFATHER', 'STEPMOTHER', 'GRANDFATHER', 'GRANDMOTHER']:
                node['group'] = 'parent'
            elif rtype in ['SON', 'DAUGHTER', 'CHILD', 'STEPSON', 'STEPDAUGHTER', 'GRANDSON', 'GRANDDAUGHTER']:
                node['group'] = 'child'
            elif rtype in ['HUSBAND', 'WIFE', 'SPOUSE', 'PARTNER']:
                node['group'] = 'spouse'
            elif rtype in ['BROTHER', 'SISTER', 'SIBLING']:
                node['group'] = 'sibling'
            else:
                node['group'] = 'relative'
        else:
            node['group'] = 'relative'
        nodes.append(node)

    links_seen = set()
    pairs_seen = set()
    for src, dist in distances.items():
        if dist < depth:
            for edge in graph.get(src, []):
                if isinstance(edge, (tuple, list)):
                    rtype = edge[0]
                    tgt = edge[1]
                    status = edge[2] if len(edge) > 2 else "VALIDATED"
                    category = edge[3] if len(edge) > 3 else _determine_category(rtype)
                    rel_id = edge[4] if len(edge) > 4 else f"{src}_{rtype}_{tgt}"
                else:
                    rtype = edge
                    tgt = edge
                    status = "VALIDATED"
                    category = _determine_category(rtype)
                    rel_id = f"{src}_{rtype}_{tgt}"

                pair_key = tuple(sorted([src, tgt]))
                if tgt in distances and rel_id not in links_seen:
                    if pair_key in pairs_seen:
                        continue
                    links_seen.add(rel_id)
                    pairs_seen.add(pair_key)
                    links.append({
                        "id": rel_id,
                        "source": src,
                        "target": tgt,
                        "relation_type": rtype,
                        "type": rtype,
                        "category": category,
                        "status": status,
                    })
                    
    return {
        "root": public_person(central),
        "depth": depth,
        "nodes": nodes,
        "links": links
    }

def db_family_medical_summary(db: Session, person_id: str, user: dict[str, Any], distance: int=2) ->dict[str, Any]:
    from .models import MedicalHistory
    from sqlalchemy import select
    from collections import defaultdict
    central = db_visible_item(db, 'persons', person_id, user)
    visible_people, graph = _fetch_family_network(db, central['id'], distance, user)
    
    def public_person(p):
        return p if isinstance(p, dict) else p.to_dict()

    distances: dict[str, int] = {central['id']: 0}
    queue = [(central['id'], 0)]
    while queue:
        current_id, current_dist = queue.pop(0)
        if current_dist < distance:
            for edge in graph.get(current_id, []):
                target_id = edge[1] if isinstance(edge, (tuple, list)) else edge
                if target_id not in distances:
                    distances[target_id] = current_dist + 1
                    queue.append((target_id, current_dist + 1))
                    
    reached_ids = list(distances.keys())
    if not reached_ids:
        return {
            "root_person_id": central["id"],
            "depth": distance,
            "total_family_members": 0,
            "total_medical_records": 0,
            "hereditary_records": 0,
            "conditions": [],
            "records": []
        }
        
    all_histories = db.scalars(
        visible_query(select(MedicalHistory), MedicalHistory, user)
        .where(MedicalHistory.person_id.in_(reached_ids))
        .where(MedicalHistory.deleted_at.is_(None))
    ).all()
    
    records = []
    hereditary_count = 0
    conditions_map = defaultdict(lambda: {"category": "", "total_cases": 0, "hereditary_cases": 0, "affected_generations": set(), "severity_counts": defaultdict(int)})
    
    for history in all_histories:
        h_person_id = history.person_id
        if h_person_id in distances:
            records.append({
                'person': public_person(visible_people[h_person_id]),
                'distance': distances[h_person_id],
                'condition_name': history.condition_name,
                'category': history.category,
                'severity': history.severity,
                'hereditary_risk': history.hereditary_risk
            })
            if history.hereditary_risk:
                hereditary_count += 1
            
            cname = history.condition_name
            cmap = conditions_map[cname]
            cmap["category"] = history.category
            cmap["total_cases"] += 1
            if history.hereditary_risk:
                cmap["hereditary_cases"] += 1
            cmap["severity_counts"][history.severity] += 1
            cmap["affected_generations"].add(str(distances[h_person_id]))
            
    conditions = []
    for cname, cmap in conditions_map.items():
        conditions.append({
            "condition_name": cname,
            "category": cmap["category"],
            "total_cases": cmap["total_cases"],
            "hereditary_cases": cmap["hereditary_cases"],
            "affected_generations": list(cmap["affected_generations"]),
            "severity_counts": dict(cmap["severity_counts"])
        })
            
    return {
        "root_person_id": central["id"],
        "depth": distance,
        "total_family_members": len(reached_ids) - 1,
        "total_medical_records": len(records),
        "hereditary_records": hereditary_count,
        "conditions": conditions,
        "records": sorted(records, key=lambda x: x['distance'])
    }
