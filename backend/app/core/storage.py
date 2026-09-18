import os
from typing import Optional


def get_upload_dir() -> str:
    """
    Returns the primary upload directory.
    Checks environment variable UPLOAD_DIR first, then defaults to backend/uploads.
    Ensures directory exists.
    """
    custom = os.environ.get("UPLOAD_DIR")
    if custom:
        os.makedirs(custom, exist_ok=True)
        return custom

    # Candidate 1: backend/uploads
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend
    upload_dir = os.path.join(base_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def find_file_on_disk(file_name_or_path: str) -> Optional[str]:
    """
    Locates an uploaded file across all known potential storage locations.
    Returns the absolute path if found, or None.
    """
    if not file_name_or_path:
        return None

    if os.path.isabs(file_name_or_path) and os.path.exists(file_name_or_path):
        return file_name_or_path

    base_name = os.path.basename(file_name_or_path)

    # Check all possible directory layouts across local, docker, render, etc.
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/app
    backend_dir = os.path.dirname(app_dir)  # backend
    project_root = os.path.dirname(backend_dir)

    search_dirs = [
        get_upload_dir(),
        os.path.join(backend_dir, "uploads"),
        os.path.join(app_dir, "uploads"),
        os.path.join(project_root, "uploads"),
        os.path.join(os.getcwd(), "uploads"),
        os.path.join(os.getcwd(), "backend", "uploads"),
        os.path.join(os.getcwd(), "backend", "app", "uploads"),
        os.path.join(os.getcwd(), "app", "uploads"),
    ]

    for d in search_dirs:
        candidate = os.path.join(d, base_name)
        if os.path.exists(candidate):
            return candidate

    return None
