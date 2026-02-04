from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.api.deps import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == data.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")
    u = User(email=data.email, password_hash=hash_password(data.password))
    db.add(u)
    db.commit()
    return {"ok": True}

@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == data.email).first()
    if not u or not verify_password(data.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")
    token = create_access_token(subject=u.email)
    return {"access_token": token, "token_type": "bearer"}
