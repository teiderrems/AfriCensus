from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from .container import store
from .schemas import ValidationStatus, now_iso


def create_item(collection: str, payload: dict[str, Any], user_id: str, action: str) -> dict[str, Any]:
    data = store.all()
    now = now_iso()
    item = {
        "id": str(uuid4()),
        **payload,
        "created_by": payload.get("created_by", user_id),
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    data[collection].append(item)
    audit(data, user_id, action, collection, item["id"])
    store.save(data)
    return item


def update_item(collection: str, item_id: str, payload: dict[str, Any], user_id: str, action: str) -> dict[str, Any]:
    data = store.all()
    item = find_in_data(data, collection, item_id)
    item.update(payload | {"updated_at": now_iso()})
    audit(data, user_id, action, collection, item_id)
    store.save(data)
    return item


def set_status(collection: str, item_id: str, status_value: str, user_id: str, action: str) -> dict[str, Any]:
    return decision(collection, item_id, status_value, None, user_id, action)


def decision(collection: str, item_id: str, status_value: str, comment: str | None, user_id: str, action: str) -> dict[str, Any]:
    data = store.all()
    item = find_in_data(data, collection, item_id)
    item["validation_status"] = ValidationStatus(status_value)
    item["decision_comment"] = comment
    item["updated_at"] = now_iso()
    audit(data, user_id, action, collection, item_id)
    store.save(data)
    return item


def soft_delete(collection: str, item_id: str, user_id: str, action: str) -> None:
    data = store.all()
    item = find_in_data(data, collection, item_id)
    item["deleted_at"] = now_iso()
    audit(data, user_id, action, collection, item_id)
    store.save(data)


def find_item(collection: str, item_id: str) -> dict[str, Any] | None:
    return next((item for item in store.all()[collection] if item["id"] == item_id and not item.get("deleted_at")), None)


def find_or_404(collection: str, item_id: str) -> dict[str, Any]:
    item = find_item(collection, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"{collection} not found")
    return item


def find_in_data(data: dict[str, Any], collection: str, item_id: str) -> dict[str, Any]:
    item = next((entry for entry in data[collection] if entry["id"] == item_id and not entry.get("deleted_at")), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"{collection} not found")
    return item


def visible_item(collection: str, item_id: str, user: dict[str, Any]) -> dict[str, Any]:
    item = find_or_404(collection, item_id)
    if item.get("zone_id") and not can_see_zone(user, item["zone_id"]):
        raise HTTPException(status_code=403, detail="Zone not allowed")
    return item


def visible(items: list[dict[str, Any]], user: dict[str, Any]) -> list[dict[str, Any]]:
    return [item for item in items if not item.get("deleted_at") and (not item.get("zone_id") or can_see_zone(user, item["zone_id"]))]


def filter_items(items: list[dict[str, Any]], zone_id: str | None, status_filter: str | None) -> list[dict[str, Any]]:
    if zone_id:
        items = [item for item in items if item.get("zone_id") == zone_id]
    if status_filter:
        items = [item for item in items if item.get("validation_status") == status_filter]
    return items


def can_see_zone(user: dict[str, Any], zone_id: str) -> bool:
    return user["role"] == "ADMIN" or zone_id in user.get("zone_ids", [])


def assert_zone(user: dict[str, Any], zone_id: str) -> None:
    if not can_see_zone(user, zone_id):
        raise HTTPException(status_code=403, detail="Zone not allowed")


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {key: user[key] for key in ("id", "username", "full_name", "role", "zone_ids")}


def audit(data: dict[str, Any], user_id: str | None, action: str, entity_type: str, entity_id: str) -> None:
    data["audit_logs"].append(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "created_at": now_iso(),
        }
    )


def inverse_relation(relation: dict[str, Any]) -> dict[str, Any] | None:
    mapping = {"PERE_DE": "ENFANT_DE", "MERE_DE": "ENFANT_DE", "CONJOINT_DE": "CONJOINT_DE"}
    inverse_type = mapping.get(relation["relation_type"])
    if not inverse_type:
        return None
    return {
        "local_id": None,
        "campaign_id": relation["campaign_id"],
        "source_person_id": relation["target_person_id"],
        "target_person_id": relation["source_person_id"],
        "relation_type": inverse_type,
        "evidence_type": relation.get("evidence_type"),
        "source_type": relation.get("source_type"),
        "validation_status": "SUBMITTED",
        "sync_status": "SYNCED",
        "comment": "Relation inverse générée automatiquement",
        "zone_id": relation.get("zone_id"),
    }


def detect_duplicates(new_person: dict[str, Any]) -> None:
    data = store.all()
    for person in data["persons"]:
        if person["id"] == new_person["id"]:
            continue
        score = 0
        score += 35 if person.get("last_name", "").lower() == new_person.get("last_name", "").lower() else 0
        score += 25 if person.get("first_name", "").lower() == new_person.get("first_name", "").lower() else 0
        score += 25 if person.get("birth_date") and person.get("birth_date") == new_person.get("birth_date") else 0
        score += 15 if person.get("phone") and person.get("phone") == new_person.get("phone") else 0
        if score > 70:
            data["duplicate_candidates"].append(
                {
                    "id": str(uuid4()),
                    "person_a_id": person["id"],
                    "person_b_id": new_person["id"],
                    "score": score,
                    "status": "OPEN",
                    "created_at": now_iso(),
                }
            )
    store.save(data)


def build_family_tree(person_id: str, user: dict[str, Any], depth: int = 2) -> dict[str, Any]:
    central = visible_item("persons", person_id, user)
    data = store.all()
    visible_people = {person["id"]: person for person in visible(data["persons"], user)}
    relations = [
        relation
        for relation in visible(data["family_relations"], user)
        if relation["source_person_id"] in visible_people and relation["target_person_id"] in visible_people
    ]

    graph = _relation_graph(relations)
    linked_ids = _expand_family_ids(person_id, graph, depth)
    parents, children, spouses = _direct_groups(person_id, relations)

    sibling_ids = _siblings(person_id, parents, relations) if depth >= 2 else set()
    linked_ids.update(sibling_ids)

    links = []
    for relation in relations:
        source_id = relation["source_person_id"]
        target_id = relation["target_person_id"]
        if source_id in linked_ids and target_id in linked_ids:
            category = _relation_category(relation["relation_type"])
            links.append(
                {
                    "id": relation["id"],
                    "source": source_id,
                    "target": target_id,
                    "type": relation["relation_type"],
                    "category": category,
                    "status": relation.get("validation_status"),
                }
            )

    nodes = [
        _tree_node(visible_people[item_id], _node_group(item_id, person_id, parents, children, spouses, sibling_ids))
        for item_id in linked_ids
        if item_id in visible_people
    ]

    return {
        "root": _tree_node(central, "root"),
        "depth": depth,
        "nodes": sorted(nodes, key=lambda node: (node["group"], node["label"])),
        "links": links,
        "parents": [visible_people[item_id] for item_id in parents if item_id in visible_people],
        "children": [visible_people[item_id] for item_id in children if item_id in visible_people],
        "spouses": [visible_people[item_id] for item_id in spouses if item_id in visible_people],
        "siblings": [visible_people[item_id] for item_id in sibling_ids if item_id in visible_people],
    }


def family_medical_summary(person_id: str, user: dict[str, Any], depth: int = 2) -> dict[str, Any]:
    tree = build_family_tree(person_id, user, depth)
    family_ids = {node["id"] for node in tree["nodes"]}
    people_by_id = {person["id"]: person for person in visible(store.all()["persons"], user) if person["id"] in family_ids}
    group_by_id = {node["id"]: node["group"] for node in tree["nodes"]}
    histories = [
        history
        for history in visible(store.all()["medical_histories"], user)
        if history["person_id"] in family_ids
    ]

    condition_map: dict[str, dict[str, Any]] = {}
    records: list[dict[str, Any]] = []
    for history in histories:
        person = people_by_id.get(history["person_id"], {})
        group = group_by_id.get(history["person_id"], "relative")
        record = {
            **history,
            "person_label": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
            "family_group": group,
        }
        records.append(record)
        condition_key = f"{history['condition_name'].lower()}::{history.get('category', '')}"
        summary = condition_map.setdefault(
            condition_key,
            {
                "condition_name": history["condition_name"],
                "category": history.get("category", "UNKNOWN"),
                "total_cases": 0,
                "hereditary_cases": 0,
                "affected_generations": set(),
                "severity_counts": {},
            },
        )
        summary["total_cases"] += 1
        if history.get("hereditary_risk"):
            summary["hereditary_cases"] += 1
        summary["affected_generations"].add(group)
        severity = history.get("severity", "UNKNOWN")
        summary["severity_counts"][severity] = summary["severity_counts"].get(severity, 0) + 1

    conditions = []
    for item in condition_map.values():
        conditions.append(
            {
                **item,
                "affected_generations": sorted(item["affected_generations"]),
            }
        )

    return {
        "root_person_id": person_id,
        "depth": tree["depth"],
        "total_family_members": len(family_ids),
        "total_medical_records": len(records),
        "hereditary_records": sum(1 for history in histories if history.get("hereditary_risk")),
        "conditions": sorted(conditions, key=lambda item: (-item["total_cases"], item["condition_name"])),
        "records": sorted(records, key=lambda item: (item.get("condition_name", ""), item.get("person_label", ""))),
    }


def _relation_graph(relations: list[dict[str, Any]]) -> dict[str, set[str]]:
    graph: dict[str, set[str]] = {}
    for relation in relations:
        source_id = relation["source_person_id"]
        target_id = relation["target_person_id"]
        graph.setdefault(source_id, set()).add(target_id)
        graph.setdefault(target_id, set()).add(source_id)
    return graph


def _expand_family_ids(person_id: str, graph: dict[str, set[str]], depth: int) -> set[str]:
    max_depth = max(0, min(depth, 6))
    visited = {person_id}
    frontier = {person_id}
    for _ in range(max_depth):
        next_frontier: set[str] = set()
        for current_id in frontier:
            next_frontier.update(graph.get(current_id, set()) - visited)
        if not next_frontier:
            break
        visited.update(next_frontier)
        frontier = next_frontier
    return visited


def _direct_groups(person_id: str, relations: list[dict[str, Any]]) -> tuple[set[str], set[str], set[str]]:
    parents: set[str] = set()
    children: set[str] = set()
    spouses: set[str] = set()
    for relation in relations:
        source_id = relation["source_person_id"]
        target_id = relation["target_person_id"]
        relation_type = relation["relation_type"]
        if relation_type in {"PERE_DE", "MERE_DE", "TUTEUR_DE", "RESPONSABLE_LEGAL_DE"}:
            if target_id == person_id:
                parents.add(source_id)
            if source_id == person_id:
                children.add(target_id)
        elif relation_type == "ENFANT_DE":
            if source_id == person_id:
                parents.add(target_id)
            if target_id == person_id:
                children.add(source_id)
        elif relation_type == "CONJOINT_DE":
            if source_id == person_id:
                spouses.add(target_id)
            if target_id == person_id:
                spouses.add(source_id)
    return parents, children, spouses


def _relation_category(relation_type: str) -> str:
    if relation_type in {"PERE_DE", "MERE_DE", "ENFANT_DE"}:
        return "parent_child"
    if relation_type == "CONJOINT_DE":
        return "spouse"
    if relation_type in {"TUTEUR_DE", "RESPONSABLE_LEGAL_DE"}:
        return "guardian"
    return "other"


def _siblings(person_id: str, parents: set[str], relations: list[dict[str, Any]]) -> set[str]:
    sibling_ids: set[str] = set()
    if not parents:
        return sibling_ids
    for relation in relations:
        source_id = relation["source_person_id"]
        target_id = relation["target_person_id"]
        relation_type = relation["relation_type"]
        if relation_type in {"PERE_DE", "MERE_DE", "TUTEUR_DE", "RESPONSABLE_LEGAL_DE"} and source_id in parents and target_id != person_id:
            sibling_ids.add(target_id)
        if relation_type == "ENFANT_DE" and target_id in parents and source_id != person_id:
            sibling_ids.add(source_id)
    return sibling_ids


def _tree_node(person: dict[str, Any], group: str) -> dict[str, Any]:
    return {
        "id": person["id"],
        "label": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
        "gender": person.get("gender"),
        "birth_date": person.get("birth_date"),
        "estimated_age": person.get("estimated_age"),
        "validation_status": person.get("validation_status"),
        "group": group,
    }


def _node_group(
    item_id: str,
    person_id: str,
    parents: set[str],
    children: set[str],
    spouses: set[str],
    siblings: set[str],
) -> str:
    if item_id == person_id:
        return "root"
    if item_id in parents:
        return "parent"
    if item_id in spouses:
        return "spouse"
    if item_id in children:
        return "child"
    if item_id in siblings:
        return "sibling"
    return "relative"
