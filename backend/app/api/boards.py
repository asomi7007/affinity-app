from fastapi import APIRouter, HTTPException
from app.schemas.board import Board, BoardCreate, NoteCreate
from app.services.boards import board_service

router = APIRouter()

@router.get("/", response_model=list[Board])
async def list_boards():
    return board_service.list()

@router.post("/", response_model=Board, status_code=201)
async def create_board(data: BoardCreate):
    return board_service.create(data)

@router.get("/{board_id}", response_model=Board)
async def get_board(board_id: str):
    board = board_service.get(board_id)
    if not board:
        raise HTTPException(404, detail="Board not found")
    return board

@router.post("/{board_id}/notes", status_code=201)
async def add_note(board_id: str, data: NoteCreate):
    note = board_service.add_note(board_id, data)
    if not note:
        raise HTTPException(404, detail="Board not found")
    return note
