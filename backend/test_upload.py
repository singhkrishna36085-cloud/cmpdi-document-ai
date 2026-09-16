import asyncio, httpx, pathlib

async def test_upload():
    test_file = pathlib.Path("test_upload.pdf")
    test_file.write_bytes(b"%PDF-1.4 test document content")

    async with httpx.AsyncClient() as client:
        with open(test_file, "rb") as f:
            res = await client.post(
                "http://127.0.0.1:8000/api/documents/upload",
                files={"file": ("test_upload.pdf", f, "application/pdf")},
                data={
                    "name": "Test Geological Report",
                    "type": "Geological Report",
                    "source": "CMPDI HQ",
                    "category": "Exploration",
                    "date": "2026-09-16",
                    "description": "Automated smoke test upload",
                },
                timeout=30,
            )
    print("Status:", res.status_code)
    print("Response:", res.json())
    test_file.unlink()

asyncio.run(test_upload())
