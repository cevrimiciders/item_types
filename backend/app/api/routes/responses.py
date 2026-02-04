from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user_email
from app.models.response import Response
from app.models.session import Session as DbSession

router = APIRouter(prefix="/responses", tags=["responses"])

class ResponseIn(BaseModel):
    session_id: int
    task_id: str
    payload: dict

@router.post("")
def submit_response(data: ResponseIn, db: Session = Depends(get_db)):
    s = db.query(DbSession).filter(DbSession.id == data.session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    r = Response(session_id=data.session_id, task_id=data.task_id, payload=data.payload)
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "response_id": r.id}


from app.models.response import Response
from app.models.session import Session as DbSession

@router.get("/by-session/{session_id}")
def list_by_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    rows = db.query(Response).filter(Response.session_id == session_id).order_by(Response.id.asc()).all()
    return [{"id": r.id, "session_id": r.session_id, "task_id": r.task_id, "payload": r.payload} for r in rows]

@router.get("/by-instrument/{instrument_id}")
def list_by_instrument(instrument_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    rows = (
        db.query(Response)
        .join(DbSession, DbSession.id == Response.session_id)
        .filter(DbSession.instrument_id == instrument_id)
        .order_by(Response.id.asc())
        .all()
    )
    return [{"id": r.id, "session_id": r.session_id, "task_id": r.task_id, "payload": r.payload} for r in rows]


@router.get("/by-session/{session_id}")
def list_responses_for_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    rows = db.query(Response).filter(Response.session_id == session_id).order_by(Response.id.asc()).all()
    return [
        {"id": r.id, "session_id": r.session_id, "task_id": r.task_id, "payload": r.payload, "created_at": r.created_at}
        for r in rows
    ]

@router.get("/by-instrument/{instrument_id}")
def list_responses_for_instrument(instrument_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    rows = (
        db.query(Response)
        .join(DbSession, DbSession.id == Response.session_id)
        .filter(DbSession.instrument_id == instrument_id)
        .order_by(Response.id.asc())
        .all()
    )
    return [{"id": r.id, "session_id": r.session_id, "task_id": r.task_id, "payload": r.payload, "created_at": r.created_at} for r in rows]

