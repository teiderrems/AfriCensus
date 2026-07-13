from .store import OrmStore


def create_store() -> OrmStore:
    return OrmStore()


store = create_store()
