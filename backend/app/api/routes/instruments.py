from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user_email
from app.models.instrument import Instrument
from app.models.study import Study

router = APIRouter(prefix="/instruments", tags=["instruments"])


class InstrumentCreate(BaseModel):
    study_id: int
    name: str
    spec: dict


@router.get("")
def list_instruments(db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    items = db.query(Instrument).order_by(Instrument.id.desc()).all()
    return [{"id": i.id, "study_id": i.study_id, "name": i.name} for i in items]


@router.post("")
def create_instrument(
    data: InstrumentCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_email),
):
    st = db.query(Study).filter(Study.id == data.study_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Study not found")

    ins = Instrument(study_id=data.study_id, name=data.name, spec=data.spec)
    db.add(ins)
    db.commit()
    db.refresh(ins)
    return {"id": ins.id, "study_id": ins.study_id, "name": ins.name}


@router.get("/{instrument_id}")
def get_instrument(instrument_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    ins = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": ins.id, "study_id": ins.study_id, "name": ins.name, "spec": ins.spec}


@router.delete("/{instrument_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_instrument(instrument_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user_email)):
    ins = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Not found")

    # NOTE: Şimdilik “cascade yoksa” FK yüzünden patlayabilir.
    # O durumda önce sessions/responses silinir (bir sonraki adımda cascade ekleriz).
    db.delete(ins)
    db.commit()
    return None
