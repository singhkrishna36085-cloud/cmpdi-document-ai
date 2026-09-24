"""
Document Processor Service for STEP 5 & Advanced Multimodal Vision
Extracts text, complex maps, borehole logs, and tabular content from PDF, DOCX, XLSX, CSV, and Images (JPG/JPEG/PNG).
Equipped with Pillow Contrast & Sharpness Enhancement and Gemini Multimodal Vision AI for faint text and geological maps.
Never modifies original files.
"""

import os
import io
import json
import base64
import logging
from typing import Dict, Any, List, Optional
import requests

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
            _paddle_ocr_engine = PaddleOCR(lang='en')
            logger.info("PaddleOCR engine initialized successfully.")
        except Exception as err:
            logger.warning(f"PaddleOCR disabled / failed to initialize: {err}")
            _paddle_ocr_engine = None
    return _paddle_ocr_engine


def enhance_image_for_faint_text(image_bytes: bytes) -> bytes:
    """
    Preprocesses page/map image to bring out faint, light-colored, faded ink,
    and pencil handwriting before vision OCR.
    """
    try:
        from PIL import Image, ImageEnhance
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        
        # 1. Boost contrast to separate faded letters from background
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.85)
        
        # 2. Sharpen edges of small/faint letters and contour lines
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.6)
        
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=92)
        return out_buf.getvalue()
    except Exception as e:
        logger.warning(f"Image enhancement notice: {e}")
        return image_bytes


def extract_text_and_map_with_gemini_vision(image_bytes: bytes, page_num: int = 1) -> str:
    """
    Uses Google Gemini Multimodal Vision API to extract:
    - Faint, faded, low-contrast text and numbers
    - Map legends, symbols, seam labels, borehole markers, contour elevations
    - Lithology columns, stratigraphic tables, coordinates, scale markers
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    if not gemini_api_key:
        logger.info("GEMINI_API_KEY not configured, skipping vision OCR.")
        return ""
        
    try:
        enhanced_bytes = enhance_image_for_faint_text(image_bytes)
        b64_img = base64.b64encode(enhanced_bytes).decode("utf-8")
        
        prompt = (
            "You are a Senior Geological Mining Cartographer and Document Vision Specialist for CMPDI and Coal India Limited. "
            "Examine this page image with extreme precision. It may contain geological maps, cross-sections, lithological drill logs, "
            "or historical technical text with faint, faded, or light-colored letters.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. TRANSCRIBE ALL TEXT: Accurately extract all text, numbers, and notes. Pay special attention to faint, faded, small, or handwritten letters.\n"
            "2. MAP & DIAGRAM ANALYSIS: If this page contains a map, plan, cross-section, or borehole lithology column:\n"
            "   - Extract all map titles, block names, lease boundaries, coordinates, and scale markers.\n"
            "   - Extract all coal seam labels (e.g. Seam I, II, III, IV, Top/Bottom), fault lines (e.g. F-1, F-2), throw, dip, and strike.\n"
            "   - Extract all borehole IDs (e.g. BH-1, BH-14), surface RL, depths, and seam thicknesses.\n"
            "   - Transcribe the complete Map Legend / Index table.\n"
            "   - Provide a structured 'Visual Map Description' summarizing spatial features.\n"
            "3. TABLES & FORMULAS: Transcribe all numerical tables into clean markdown format.\n"
            "Output the extracted information in clean, highly structured Markdown."
        )
        
        # Use gemini-1.5-flash for fast, high-quality multimodal extraction
        model_name = os.getenv("LLM_VISION_MODEL", "gemini-1.5-flash")
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key.strip()}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": b64_img
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1
            }
        }
        
        resp = requests.post(endpoint, json=payload, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                extracted_text = "".join([p.get("text", "") for p in parts]).strip()
                if extracted_text:
                    return f"[Multimodal Vision AI Analysis • Page {page_num}]\n{extracted_text}"
        else:
            logger.warning(f"Gemini Vision API status {resp.status_code}: {resp.text[:200]}")
    except Exception as exc:
        logger.warning(f"Gemini Vision extraction failed on page {page_num}: {exc}")
        
    return ""


def extract_with_tesseract(image_bytes: bytes, page_num: int = 1) -> str:
    """
    Local C++ Tesseract OCR for physical scanned pages, ink stamps, and historical borehole logs.
    Runs locally in ~150-250ms with zero network latency.
    """
    try:
        import pytesseract
        from PIL import Image, ImageOps
        img = Image.open(io.BytesIO(image_bytes))
        img_gray = ImageOps.grayscale(img)
        img_enhanced = ImageOps.autocontrast(img_gray, cutoff=2)
        text = pytesseract.image_to_string(img_enhanced, lang='eng', config='--psm 1 --oem 3').strip()
        if text and len(text) > 10:
            return f"[Tesseract OCR • Page {page_num}]\n{text}"
    except Exception as exc:
        logger.debug(f"Tesseract OCR notice on page {page_num}: {exc}")
    return ""


def extract_with_llama_parse(file_path: str) -> List[Dict[str, Any]]:
    """
    LlamaParse Cloud Engine for complex multi-column mining tables,
    stratigraphic drill logs, and borehole lithology logs.
    Activated automatically when LLAMA_CLOUD_API_KEY is configured.
    """
    api_key = os.getenv("LLAMA_CLOUD_API_KEY", "").strip()
    if not api_key:
        return []

    try:
        from llama_parse import LlamaParse
        parser = LlamaParse(
            api_key=api_key,
            result_type="markdown",
            verbose=False,
            language="en"
        )
        extra_docs = parser.load_data(file_path)
        llama_chunks = []
        for idx, doc in enumerate(extra_docs):
            content = getattr(doc, "text", "") or ""
            if content.strip():
                sub_parts = _chunk_text(content.strip(), max_chars=800, overlap=100)
                for sc in sub_parts:
                    llama_chunks.append({
                        "page_number": idx + 1,
                        "sheet_name": "LlamaParse Borehole/Table",
                        "chunk_type": "table",
                        "content": f"[LlamaParse Consensus Engine • Page {idx+1}]\n{sc}"
                    })
        logger.info(f"LlamaParse generated {len(llama_chunks)} high-fidelity table chunks.")
        return llama_chunks
    except Exception as exc:
        logger.warning(f"LlamaParse optional engine notice: {exc}")
        return []


def extract_with_docling(file_path: str) -> List[Dict[str, Any]]:
    """
    IBM Docling Layout-Aware Engine.
    Converts geological documents into structured Markdown tables and section hierarchies.
    """
    try:
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        result = converter.convert(file_path)
        markdown_text = result.document.export_to_markdown()
        if markdown_text and len(markdown_text.strip()) > 30:
            docling_chunks = []
            sub_chunks = _chunk_text(markdown_text, max_chars=800, overlap=120)
            for idx, sc in enumerate(sub_chunks):
                docling_chunks.append({
                    "page_number": idx + 1,
                    "sheet_name": "Docling Layout",
                    "chunk_type": "table",
                    "content": f"[Docling Layout Engine • Section {idx+1}]\n{sc}"
                })
            logger.info(f"Docling generated {len(docling_chunks)} structured layout chunks.")
            return docling_chunks
    except Exception as exc:
        logger.debug(f"Docling engine notice: {exc}")
    return []


def _chunk_text(text: str, max_chars: int = 700, overlap: int = 100) -> List[str]:
    """Splits long text into overlapping chunks for high-precision FAISS semantic retrieval."""
    clean = text.strip()
    if not clean:
        return []
    if len(clean) <= max_chars:
        return [clean]

    chunks = []
    paragraphs = [p.strip() for p in clean.split("\n\n") if p.strip()]
    current_chunk = ""

    for p in paragraphs:
        if len(current_chunk) + len(p) + 2 <= max_chars:
            current_chunk = f"{current_chunk}\n\n{p}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            if len(p) > max_chars:
                start = 0
                while start < len(p):
                    end = start + max_chars
                    chunks.append(p[start:end].strip())
                    start += (max_chars - overlap)
                current_chunk = ""
            else:
                current_chunk = p

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [clean]


def process_pdf(file_path: str) -> Dict[str, Any]:
    """
    Quad-Engine Ensemble Document Ingestion Architecture:
    1. PyMuPDF Turbo (fitz): Instant C++ digital text & structure (<0.1s/page)
    2. Tesseract OCR (pytesseract): Local C++ OCR for scanned pages/stamps (~0.2s/page)
    3. Docling (IBM): Layout-aware table extraction (when available)
    4. LlamaParse: Deep borehole mining log tables (when LLAMA_CLOUD_API_KEY configured)
    """
    active_engines = []
    chunks = []
    full_text_list = []
    page_count = 1

    fitz_module = None
    try:
        import fitz  # PyMuPDF
        fitz_module = fitz
    except ImportError:
        logger.warning("PyMuPDF (fitz) not available, falling back to pypdf parser.")
        fitz_module = None

    if fitz_module is not None:
        try:
            doc = fitz_module.open(file_path)
            page_count = len(doc)
            active_engines.append("PyMuPDF Turbo")
            
            vision_calls = 0
            max_vision_pages = int(os.getenv("MAX_VISION_PAGES", "3"))

            for page_idx in range(page_count):
                page_num = page_idx + 1
                page = doc[page_idx]
                text = page.get_text("text").strip()
                
                vision_analysis = ""
                ocr_text = ""
                
                # If page is scanned or sparse (< 30 chars), run optical character engines (capped to prevent delays)
                if len(text) < 30 and vision_calls < max_vision_pages:
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("jpeg")
                        
                        # 1. Local Tesseract OCR (fast ~200ms)
                        ocr_text = extract_with_tesseract(img_bytes, page_num)
                        if ocr_text and "Tesseract OCR" not in active_engines:
                            active_engines.append("Tesseract OCR")
                        
                        # 2. Multimodal Vision for complex maps if Tesseract had minimal text
                        if not ocr_text or len(ocr_text) < 40:
                            vision_analysis = extract_text_and_map_with_gemini_vision(img_bytes, page_num)
                            if vision_analysis:
                                vision_calls += 1
                                if "Gemini Vision" not in active_engines:
                                    active_engines.append("Gemini Vision")
                    except Exception as ve:
                        logger.warning(f"Page {page_num} OCR/vision notice: {ve}")

                # Synthesize digital text, Tesseract OCR, and Vision analysis
                parts = []
                if text:
                    parts.append(f"[Source: PyMuPDF-Digital • Page {page_num}]\n{text}")
                if ocr_text:
                    parts.append(ocr_text)
                if vision_analysis:
                    parts.append(vision_analysis)
                    
                if parts:
                    final_page_content = "\n\n".join(parts)
                else:
                    final_page_content = f"[Document Page {page_num}: Mining Report / Graphic Archive]"
                
                # Granular semantic chunking for high-precision FAISS matching
                page_subchunks = _chunk_text(final_page_content, max_chars=750, overlap=100)
                if not page_subchunks:
                    page_subchunks = [final_page_content]

                for sc in page_subchunks:
                    chunks.append({
                        "page_number": page_num,
                        "sheet_name": None,
                        "chunk_type": "vision" if vision_analysis else ("ocr" if ocr_text else "text"),
                        "content": sc
                    })

            doc.close()
        except Exception as fitz_err:
            logger.warning(f"PyMuPDF failed while parsing '{file_path}': {fitz_err}. Falling back to pypdf.")

    # Fallback to pypdf parser if PyMuPDF produced no chunks
    if not chunks:
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            page_count = len(reader.pages)
            active_engines.append("pypdf Fallback")
            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                try:
                    text = (page.extract_text() or "").strip()
                except Exception as pe:
                    logger.warning(f"pypdf extraction error on page {page_num}: {pe}")
                    text = ""

                content = text or f"[Document Page {page_num}: Content Archive]"
                chunks.append({
                    "page_number": page_num,
                    "sheet_name": None,
                    "chunk_type": "text",
                    "content": f"[Source: pypdf • Page {page_num}]\n{content}"
                })
                full_text_list.append(f"--- Page {page_num} ---\n{content}")
        except Exception as pypdf_err:
            logger.warning(f"pypdf fallback error: {pypdf_err}")

    # 3. LlamaParse & Docling Cloud Engines: Only run if PyMuPDF found zero text or explicitly requested
    enable_deep = os.getenv("ENABLE_DEEP_CLOUD_PARSER", "false").lower() in ("true", "1")
    if not chunks or enable_deep:
        llama_chunks = extract_with_llama_parse(file_path)
        if llama_chunks:
            active_engines.append("LlamaParse Mining Log")
            chunks.extend(llama_chunks)

        docling_chunks = extract_with_docling(file_path)
        if docling_chunks:
            active_engines.append("Docling Layout")
            chunks.extend(docling_chunks)

    full_text = "\n\n".join(full_text_list)
    return {
        "page_count": max(page_count, 1),
        "meta_info": json.dumps({
            "pages": page_count,
            "format": "PDF",
            "engines": active_engines,
            "ensemble": len(active_engines) > 1,
            "total_chunks": len(chunks)
        }),
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
    
    # 1. First, attempt Gemini Multimodal Vision AI with contrast boost
    with open(file_path, "rb") as f:
        img_bytes = f.read()
        
    ocr_text = extract_text_and_map_with_gemini_vision(img_bytes, 1)
    
    # 2. Fast C++ Tesseract OCR fallback
    if not ocr_text:
        ocr_text = extract_with_tesseract(img_bytes, 1)

    # 3. Local PaddleOCR fallback if still empty
    if not ocr_text:
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
        "chunk_type": "vision" if "Vision AI" in ocr_text else "ocr",
        "content": ocr_text
    }
    
    meta = {"width": width, "height": height, "format": img_format, "engine": "Gemini Vision"}
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
