"""
Word Cloud & Topic Identification Service (STEP 11)
Performs text cleaning, word frequency analysis, word cloud PNG generation,
and TF-IDF/NMF topic modeling on real PostgreSQL document chunks.
"""

import io
import json
import base64
import re
import logging
from collections import Counter
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, DocumentChunk, TopicAnalysis

logger = logging.getLogger("topic_analyzer")

# Standard English Stopwords + OCR/generic metadata stopwords
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "hed", "hell", "hes",
    "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive",
    "if", "in", "into", "is", "isn't", "it", "its", "itself", "lets", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "shes", "should", "shouldn't", "so", "some", "such", "than", "that",
    "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyre",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't",
    "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys",
    "with", "won't", "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves",
    # Metadata & OCR Noise
    "table", "columns", "rows", "data", "sheet", "page", "document", "text", "file", "csv", "docx", "pdf", "xlsx",
    "total", "sample", "step6", "step7", "val", "version", "report", "date", "status"
}

# Domain Whitelist to explicitly protect domain technical terms
DOMAIN_TERMS = {
    "coal", "seam", "mine", "production", "ash", "gcv", "borehole", "overburden", "lithology", "reserve",
    "reserves", "drilling", "sandstone", "shale", "depth", "collar", "block", "exploration", "bituminous",
    "tonnes", "million", "karanpura", "cmpdi", "rajrappa", "carbonaceous", "ob", "rl", "arg"
}


def clean_text(text: str) -> List[str]:
    """
    Cleans raw text: normalizes, removes OCR noise & stopwords while preserving domain technical terms.
    """
    if not text:
        return []

    # Lowercase & tokenize words
    words = re.findall(r'\b[a-zA-Z0-9_\-]+\b', text.lower())
    cleaned = []

    for w in words:
        w_clean = w.strip("_ -")
        if not w_clean:
            continue
        
        # Check domain term protection
        if w_clean in DOMAIN_TERMS:
            cleaned.append(w_clean)
            continue

        # Skip stopwords, single digits, and short tokens
        if w_clean in STOPWORDS or len(w_clean) < 3 or w_clean.isdigit():
            continue

        cleaned.append(w_clean)

    return cleaned


def generate_wordcloud_base64(word_freqs: Dict[str, int]) -> Optional[str]:
    """
    Generates a word cloud PNG image from frequency dictionary and returns Base64 data URI string.
    """
    if not word_freqs:
        return None

    try:
        from wordcloud import WordCloud
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        wc = WordCloud(
            width=800,
            height=400,
            background_color="white",
            colormap="viridis",
            max_words=80,
            prefer_horizontal=0.85
        )
        wc.generate_from_frequencies(word_freqs)

        buffer = io.BytesIO()
        wc.to_image().save(buffer, format="PNG")
        buffer.seek(0)

        img_b64 = base64.b64encode(buffer.read()).decode("utf-8")
        return f"data:image/png;base64,{img_b64}"
    except Exception as exc:
        logger.error(f"Failed to generate wordcloud PNG: {str(exc)}")
        return None


def derive_topic_label(keywords: List[str]) -> str:
    """
    Derives a descriptive human-readable label for a topic based on its top keywords.
    """
    kw_set = set(keywords)
    if {"borehole", "collar", "depth", "rl"}.intersection(kw_set):
        return "Borehole Depth & Collar RL Data"
    if {"seam", "lithology", "sandstone", "shale", "overburden"}.intersection(kw_set):
        return "Lithology & Stratigraphic Seams"
    if {"reserves", "exploration", "karanpura", "block", "gcv"}.intersection(kw_set):
        return "Geological Exploration & Proved Reserves"
    if {"production", "tonnes", "output", "annual"}.intersection(kw_set):
        return "Coal Production & Mining Targets"
    
    # Fallback to top 2 keywords
    top_kws = [k.title() for k in keywords[:2]]
    return f"{' & '.join(top_kws)} Theme"


def extract_topics_tfidf(doc_texts: Dict[int, str], doc_names: Dict[int, str], num_topics: int = 3) -> List[Dict[str, Any]]:
    """
    Extracts NLP topics using TF-IDF and NMF (Non-negative Matrix Factorization).
    """
    doc_ids = list(doc_texts.keys())
    corpus = [" ".join(clean_text(doc_texts[did])) for did in doc_ids]

    # Filter out empty corpus texts
    valid_indices = [i for i, text in enumerate(corpus) if len(text.strip()) > 0]
    if not valid_indices:
        return []

    valid_corpus = [corpus[i] for i in valid_indices]
    valid_doc_ids = [doc_ids[i] for i in valid_indices]

    actual_topics = min(num_topics, len(valid_corpus))
    if actual_topics == 0:
        return []

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.decomposition import NMF

        vectorizer = TfidfVectorizer(max_features=500, stop_words="english", token_pattern=r'\b[a-zA-Z0-9_\-]{3,}\b')
        tfidf_matrix = vectorizer.fit_transform(valid_corpus)
        feature_names = vectorizer.get_feature_names_out()

        nmf = NMF(n_components=actual_topics, random_state=42, max_iter=200)
        doc_topic_matrix = nmf.fit_transform(tfidf_matrix)

        topics = []
        for topic_idx, topic_weights in enumerate(nmf.components_, 1):
            top_kw_indices = topic_weights.argsort()[:-7:-1]
            keywords = [feature_names[i] for i in top_kw_indices]

            # Determine contributing documents for this topic
            contributing_docs = []
            for i, doc_weights in enumerate(doc_topic_matrix):
                if doc_weights[topic_idx - 1] > 0.05 or (actual_topics == 1):
                    did = valid_doc_ids[i]
                    contributing_docs.append({
                        "document_id": did,
                        "original_filename": doc_names.get(did, f"Doc {did}")
                    })

            topic_label = derive_topic_label(keywords)
            topics.append({
                "topic_id": topic_idx,
                "topic_name": topic_label,
                "keywords": keywords,
                "document_count": len(contributing_docs),
                "source_documents": contributing_docs
            })

        return topics
    except Exception as exc:
        logger.error(f"TF-IDF topic modeling failed: {str(exc)}")
        # Fallback simple keyword topic aggregation
        all_words = clean_text(" ".join(valid_corpus))
        top_kws = [term for term, _ in Counter(all_words).most_common(5)]
        return [{
            "topic_id": 1,
            "topic_name": derive_topic_label(top_kws),
            "keywords": top_kws,
            "document_count": len(valid_doc_ids),
            "source_documents": [{"document_id": did, "original_filename": doc_names.get(did)} for did in valid_doc_ids]
        }]


async def run_topic_analysis(db: AsyncSession, document_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    Executes real topic analysis on selected documents (or all processed documents in PostgreSQL).
    """
    # 1. Fetch Target Documents
    query = select(Document).order_by(Document.id)
    if document_ids and len(document_ids) > 0:
        query = query.where(Document.id.in_(document_ids))
    
    docs_res = await db.execute(query)
    docs = docs_res.scalars().all()

    if not docs:
        return {"error": "No matching documents found in database.", "code": 404}

    target_doc_ids = [d.id for d in docs]
    doc_names = {d.id: d.original_filename for d in docs}

    # 2. Fetch Document Chunks
    chunks_res = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id.in_(target_doc_ids)).order_by(DocumentChunk.document_id)
    )
    chunks = chunks_res.scalars().all()

    if not chunks:
        return {"error": "Selected documents have no extracted text content chunks.", "code": 400}

    # Group chunk text by document
    doc_texts: Dict[int, str] = {did: "" for did in target_doc_ids}
    all_chunks_text = []

    for c in chunks:
        doc_texts[c.document_id] += "\n" + c.content
        all_chunks_text.append(c.content)

    full_combined_text = "\n".join(all_chunks_text)

    # 3. Clean Text & Calculate Word Frequencies
    cleaned_words = clean_text(full_combined_text)
    word_counts = Counter(cleaned_words)
    top_frequencies = [{"term": term, "frequency": count} for term, count in word_counts.most_common(50)]

    # 4. Generate Base64 Word Cloud PNG
    freq_dict = {item["term"]: item["frequency"] for item in top_frequencies}
    wordcloud_b64 = generate_wordcloud_base64(freq_dict)

    # 5. Extract Topics via TF-IDF + NMF
    topics = extract_topics_tfidf(doc_texts, doc_names, num_topics=3)

    # 6. Source Document Summaries
    source_docs_info = []
    for d in docs:
        doc_c_count = len([c for c in chunks if c.document_id == d.id])
        source_docs_info.append({
            "document_id": d.id,
            "original_filename": d.original_filename,
            "type": d.type,
            "category": d.category,
            "chunk_count": doc_c_count
        })

    # 7. Persist Analysis Record in PostgreSQL
    new_analysis = TopicAnalysis(
        created_at=datetime.utcnow(),
        source_document_ids=json.dumps(target_doc_ids),
        word_frequencies=json.dumps(top_frequencies),
        topics=json.dumps(topics),
        wordcloud_image=wordcloud_b64,
        metadata_info=json.dumps({
            "documents_analyzed": len(docs),
            "chunk_count": len(chunks),
            "unique_terms_count": len(word_counts),
            "top_term": top_frequencies[0]["term"] if top_frequencies else None
        })
    )
    db.add(new_analysis)
    await db.commit()
    await db.refresh(new_analysis)

    return {
        "analysis_id": new_analysis.id,
        "documents_analyzed": len(docs),
        "word_frequencies": top_frequencies,
        "topics": topics,
        "wordcloud_image": wordcloud_b64,
        "generated_at": new_analysis.created_at.isoformat(),
        "source_documents": source_docs_info,
        "code": 200
    }
