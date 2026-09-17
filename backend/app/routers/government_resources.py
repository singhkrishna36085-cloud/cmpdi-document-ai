"""
Government Resources Router
Exposes official Ministry of Coal resource registry endpoints.
GET /api/government-resources          — List all verified official resources
GET /api/government-resources/categories — List categories with item counts
GET /api/government-resources/search     — Search resources by query string
"""

import json
import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status

router = APIRouter(prefix="/api/government-resources", tags=["government-resources"])

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "registry.json")


def _load_registry() -> List[Dict[str, Any]]:
    if not os.path.exists(REGISTRY_PATH):
        return []
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("", status_code=status.HTTP_200_OK)
def get_resources(category: Optional[str] = Query(None, description="Optional category filter")):
    """List official Ministry of Coal resources from registry."""
    items = _load_registry()
    items = [i for i in items if i.get("verified") and i.get("title") != "Home"]
    
    if category:
        cat_lower = category.lower()
        items = [i for i in items if i.get("category", "").lower() == cat_lower]
        
    return {
        "total": len(items),
        "resources": items
    }


@router.get("/categories", status_code=status.HTTP_200_OK)
def get_resource_categories():
    """List resource categories with total item counts."""
    items = _load_registry()
    items = [i for i in items if i.get("verified") and i.get("title") != "Home"]
    
    categories: Dict[str, int] = {}
    for item in items:
        cat = item.get("category", "General")
        categories[cat] = categories.get(cat, 0) + 1
        
    result = [{"category": k, "count": v} for k, v in categories.items()]
    return {
        "total_categories": len(result),
        "categories": result
    }


@router.get("/search", status_code=status.HTTP_200_OK)
def search_resources(q: str = Query(..., min_length=1, description="Search query string")):
    """Search official Ministry of Coal resources by title, category, or parent."""
    q_clean = q.strip().lower()
    if not q_clean:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
        
    items = _load_registry()
    items = [i for i in items if i.get("verified") and i.get("title") != "Home"]
    
    results = [
        i for i in items
        if q_clean in i.get("title", "").lower()
        or q_clean in i.get("category", "").lower()
        or q_clean in i.get("parent", "").lower()
    ]
    
    return {
        "query": q,
        "total": len(results),
        "results": results
    }
