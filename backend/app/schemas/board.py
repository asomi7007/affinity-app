from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class StickyNote(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    text: str
    x: int = 0
    y: int = 0
    color: str = "yellow"

class Board(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    title: str
    notes: List[StickyNote] = []

class BoardCreate(BaseModel):
    title: str

class NoteCreate(BaseModel):
    text: str
    x: int = 0
    y: int = 0
    color: Optional[str] = "yellow"
