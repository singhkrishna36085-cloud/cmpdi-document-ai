import asyncio
from app.database import AsyncSessionLocal
from app.models import User
from app.core.security import hash_password
from sqlalchemy import select

async def seed_user():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.username == "normal_user"))
        u = res.scalar_one_or_none()
        pwd_hash = hash_password("CMPDI_Secure_Auth_2026!")
        if not u:
            u = User(
                username="normal_user",
                email="normal@cmpdi.co.in",
                full_name="Normal User",
                password_hash=pwd_hash,
                hashed_password=pwd_hash,
                role="NORMAL_USER",
                is_active=True
            )
            db.add(u)
            await db.commit()
            print("Created normal_user successfully.")
        else:
            u.password_hash = pwd_hash
            u.hashed_password = pwd_hash
            u.is_active = True
            await db.commit()
            print("Updated normal_user password and status successfully.")

if __name__ == "__main__":
    asyncio.run(seed_user())
