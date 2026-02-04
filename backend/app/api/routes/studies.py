from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user_email
from app.models.study import Study
from app.models.instrument import Instrument
from app.models.session import Session as DbSession
from app.models.response import Response

router = APIRouter(prefix="/studies", tags=["studies"])


class StudyCreate(BaseModel):
    title: str


@router.post("")
def create_study(data: StudyCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    s = Study(title=data.title)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "title": s.title}


@router.get("")
def list_studies(db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    rows = db.query(Study).order_by(Study.id.desc()).all()
    return [{"id": r.id, "title": r.title} for r in rows]


@router.delete("/{study_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study(study_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    st = db.query(Study).filter(Study.id == study_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Not found")

    # MVP cascade: Study -> Instruments -> Sessions -> Responses
    instruments = db.query(Instrument).filter(Instrument.study_id == study_id).all()
    instrument_ids = [i.id for i in instruments]

    if instrument_ids:
        sessions = db.query(DbSession).filter(DbSession.instrument_id.in_(instrument_ids)).all()
        session_ids = [s.id for s in sessions]

        if session_ids:
            db.query(Response).filter(Response.session_id.in_(session_ids)).delete(synchronize_session=False)

        db.query(DbSession).filter(DbSession.instrument_id.in_(instrument_ids)).delete(synchronize_session=False)
        db.query(Instrument).filter(Instrument.study_id == study_id).delete(synchronize_session=False)

    db.delete(st)
    db.commit()
    return None
