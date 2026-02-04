import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user_email
from app.models.session import Session as DbSession
from app.models.instrument import Instrument

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    instrument_id: int


@router.post("")
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    ins = db.query(Instrument).filter(Instrument.id == data.instrument_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Instrument not found")

    participant_id = secrets.token_hex(16)
    s = DbSession(instrument_id=data.instrument_id, participant_id=participant_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"session_id": s.id, "participant_id": s.participant_id}


@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    ins = db.query(Instrument).filter(Instrument.id == s.instrument_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Instrument not found")

    return {
        "session_id": s.id,
        "participant_id": s.participant_id,
        "instrument": {"id": ins.id, "name": ins.name, "spec": ins.spec},
    }


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    s = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return None
