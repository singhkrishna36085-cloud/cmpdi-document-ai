import asyncio
import asyncpg

async def main():
    c = await asyncpg.connect(user='postgres', password='Singh', database='cmpdi_document_ai', host='localhost')
    rows = await c.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    for r in rows:
        print(r['table_name'])
    await c.close()

if __name__ == '__main__':
    asyncio.run(main())
