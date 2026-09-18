"""
Document Processor Service for STEP 5
Extracts text and tabular content from PDF, DOCX, XLSX, CSV, and Images (JPG/JPEG/PNG).
Never modifies original files.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

logger = logging.getLogger("document_processor")

# Lazy / safe loader for PaddleOCR engine
_paddle_ocr_engine = None
_paddle_ocr_attempted = False

def get_ocr_engine():
    global _paddle_ocr_engine, _paddle_ocr_attempted
    if not _paddle_ocr_attempted:
        _paddle_ocr_attempted = True
        try:
            from paddleocr import PaddleOCR
            # Initialize CPU paddleocr cleanly
            _paddle_ocr_engine = PaddleOCR(lang='en')
            logger.info("PaddleOCR engine initialized successfully.")
        except Exception as err:
            logger.warning(f"PaddleOCR disabled / failed to initialize: {err}")
            _paddle_ocr_engine = None
    return _paddle_ocr_engine


def process_pdf(file_path: str) -> Dict[str, Any]:
    fitz_module = None
    try:
        import fitz  # PyMuPDF
        fitz_module = fitz
    except ImportError:
        logger.warning("PyMuPDF (fitz) not available, falling back to pypdf parser.")
        fitz_module = None

    if fitz_module is not None:
        doc = fitz_module.open(file_path)
        page_count = len(doc)
        chunks = []
        full_text_list = []
        
        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc[page_idx]
            text = page.get_text("text").strip()
            
            # If page has minimal digital text, attempt OCR via PaddleOCR
            if len(text) < 10:
                ocr_engine = get_ocr_engine()
                if ocr_engine:
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        result = ocr_engine.ocr(img_bytes, cls=False)
                        ocr_lines = []
                        if result and result[0]:
                            for line in result[0]:
                                if line and len(line) >= 2 and line[1]:
                                    ocr_lines.append(line[1][0])
                        ocr_text = "\n".join(ocr_lines).strip()
                        if ocr_text:
                            text = f"[OCR Extracted Page {page_num}]\n" + ocr_text
                    except Exception as e:
                        logger.warning(f"OCR processing failed for PDF page {page_num}: {e}")
            
            if text:
                chunks.append({
                    "page_number": page_num,
                    "sheet_name": None,
                    "chunk_type": "text",
                    "content": text
                })
                full_text_list.append(f"--- Page {page_num} ---\n{text}")
        
        doc.close()
        full_text = "\n\n".join(full_text_list)
        return {
            "page_count": page_count,
            "meta_info": json.dumps({"pages": page_count, "format": "PDF", "engine": "PyMuPDF"}),
            "full_text": full_text,
            "chunks": chunks
        }
    else:
        try:
            import pypdf
        except ImportError:
            raise RuntimeError("Neither 'PyMuPDF' (fitz) nor 'pypdf' is installed. Please install PyMuPDF or pypdf.")

        reader = pypdf.PdfReader(file_path)
        page_count = len(reader.pages)
        chunks = []
        full_text_list = []
        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            try:
                text = (page.extract_text() or "").strip()
            except Exception as pe:
                logger.warning(f"pypdf extraction error on page {page_num}: {pe}")
                text = ""

            if text:
                chunks.append({
                    "page_number": page_num,
                    "sheet_name": None,
                    "chunk_type": "text",
                    "content": text
                })
                full_text_list.append(f"--- Page {page_num} ---\n{text}")

        full_text = "\n\n".join(full_text_list)
        return {
            "page_count": page_count,
            "meta_info": json.dumps({"pages": page_count, "format": "PDF", "engine": "pypdf"}),
            "full_text": full_text,
            "chunks": chunks
        }


def process_docx(file_path: str) -> Dict[str, Any]:
    import docx
    
    doc = docx.Document(file_path)
    chunks = []
    full_text_list = []
    
    # Process paragraphs
    para_texts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    # Process tables
    table_texts = []
    for t_idx, table in enumerate(doc.tables):
        rows_data = []
        for row in table.rows:
            row_vals = [cell.text.strip() for cell in row.cells]
            rows_data.append(" | ".join(row_vals))
        if rows_data:
            table_str = f"[Table {t_idx + 1}]\n" + "\n".join(rows_data)
            table_texts.append(table_str)
    
    if para_texts:
        para_content = "\n".join(para_texts)
        chunks.append({
            "page_number": 1,
            "sheet_name": None,
            "chunk_type": "text",
            "content": para_content
        })
        full_text_list.append(para_content)
        
    if table_texts:
        table_content = "\n\n".join(table_texts)
        chunks.append({
            "page_number": 1,
            "sheet_name": None,
            "chunk_type": "table",
            "content": table_content
        })
        full_text_list.append(table_content)
        
    full_text = "\n\n".join(full_text_list)
    return {
        "page_count": len(chunks) or 1,
        "meta_info": json.dumps({"paragraphs": len(para_texts), "tables": len(doc.tables), "format": "DOCX"}),
        "full_text": full_text,
        "chunks": chunks
    }


def process_xlsx(file_path: str) -> Dict[str, Any]:
    import pandas as pd
    
    excel_file = pd.ExcelFile(file_path)
    sheet_names = excel_file.sheet_names
    chunks = []
    full_text_list = []
    
    meta = {"sheets": sheet_names, "format": "XLSX"}
    
    for idx, sheet in enumerate(sheet_names):
        df = pd.read_excel(excel_file, sheet_name=sheet)
        if df.empty:
            continue
            
        columns = [str(c).strip() for c in df.columns]
        pipe_rows = [" | ".join(columns)]
        
        for _, row in df.iterrows():
            row_vals = [str(val).strip() if pd.notna(val) else "" for val in row]
            pipe_rows.append(" | ".join(row_vals))
            
        sheet_content = f"[Sheet: {sheet}]\n" + "\n".join(pipe_rows)
        
        chunks.append({
            "page_number": idx + 1,
            "sheet_name": sheet,
            "chunk_type": "table",
            "content": sheet_content
        })
        full_text_list.append(sheet_content)

        # Granular Row Chunks for FAISS vector search precision
        for r_idx, row in df.iterrows():
            row_pairs = []
            mine_identifier = ""
            for col in columns:
                val = str(row[col]).strip() if pd.notna(row[col]) else ""
                if val:
                    row_pairs.append(f"{col}: {val}")
                    if "mine" in col.lower() or "project" in col.lower():
                        mine_identifier = val
            if row_pairs:
                header_title = f"[Record #{r_idx+1}: {mine_identifier}]" if mine_identifier else f"[Record #{r_idx+1}]"
                row_content = header_title + "\n" + "\n".join(row_pairs)
                chunks.append({
                    "page_number": r_idx + 1,
                    "sheet_name": f"{sheet} Row",
                    "chunk_type": "record",
                    "content": row_content
                })
        
    full_text = "\n\n".join(full_text_list)
    return {
        "page_count": len(chunks),
        "meta_info": json.dumps(meta),
        "full_text": full_text,
        "chunks": chunks
    }


def process_csv(file_path: str) -> Dict[str, Any]:
    import pandas as pd
    
    try:
        df = pd.read_csv(file_path)
    except Exception:
        df = pd.read_csv(file_path, encoding="latin1")
        
    columns = [str(c).strip() for c in df.columns]
    pipe_rows = [" | ".join(columns)]
    chunks = []

    for _, row in df.iterrows():
        row_vals = [str(val).strip() if pd.notna(val) else "" for val in row]
        pipe_rows.append(" | ".join(row_vals))
        
    csv_content = f"[CSV Data]\n" + "\n".join(pipe_rows)
    
    chunks.append({
        "page_number": 1,
        "sheet_name": "CSV",
        "chunk_type": "table",
        "content": csv_content
    })

    # Granular Row Chunks for FAISS vector search precision
    for idx, row in df.iterrows():
        row_pairs = []
        mine_identifier = ""
        for col in columns:
            val = str(row[col]).strip() if pd.notna(row[col]) else ""
            if val:
                row_pairs.append(f"{col}: {val}")
                if "mine" in col.lower() or "project" in col.lower():
                    mine_identifier = val
        if row_pairs:
            header_title = f"[Record #{idx+1}: {mine_identifier}]" if mine_identifier else f"[Record #{idx+1}]"
            row_content = header_title + "\n" + "\n".join(row_pairs)
            chunks.append({
                "page_number": idx + 1,
                "sheet_name": "CSV Row",
                "chunk_type": "record",
                "content": row_content
            })
    
    meta = {"columns": columns, "row_count": len(df), "format": "CSV"}
    return {
        "page_count": len(chunks),
        "meta_info": json.dumps(meta),
        "full_text": csv_content,
        "chunks": chunks
    }


def process_image(file_path: str) -> Dict[str, Any]:
    from PIL import Image
    
    img = Image.open(file_path)
    width, height = img.size
    img_format = img.format or "IMAGE"
    
    ocr_text = ""
    ocr_engine = get_ocr_engine()
    if ocr_engine:
        try:
            result = ocr_engine.ocr(file_path, cls=False)
            ocr_lines = []
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2 and line[1]:
                        ocr_lines.append(line[1][0])
            ocr_text = "\n".join(ocr_lines).strip()
        except Exception as e:
            logger.warning(f"OCR failed for image {file_path}: {e}")
            
    if not ocr_text:
        ocr_text = f"[Image File: {os.path.basename(file_path)}, Dimensions: {width}x{height}]"
        
    chunk = {
        "page_number": 1,
        "sheet_name": None,
        "chunk_type": "ocr",
        "content": ocr_text
    }
    
    meta = {"width": width, "height": height, "format": img_format}
    return {
        "page_count": 1,
        "meta_info": json.dumps(meta),
        "full_text": ocr_text,
        "chunks": [chunk]
    }


def process_document_file(file_path: str, filename: str) -> Dict[str, Any]:
    actual_path = file_path if os.path.exists(file_path) else None
    if not actual_path:
        from app.core.storage import find_file_on_disk
        actual_path = find_file_on_disk(file_path)

    if not actual_path or not os.path.exists(actual_path):
        raise FileNotFoundError(f"Uploaded document file not found: {file_path}")

    file_path = actual_path
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if ext == "pdf":
        return process_pdf(file_path)
    elif ext == "docx":
        return process_docx(file_path)
    elif ext in ("xlsx", "xls"):
        return process_xlsx(file_path)
    elif ext == "csv":
        return process_csv(file_path)
    elif ext in ("jpg", "jpeg", "png"):
        return process_image(file_path)
    else:
        raise ValueError(f"Unsupported file extension: .{ext}")
