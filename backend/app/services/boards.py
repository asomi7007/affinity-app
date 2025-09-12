from typing import Dict
from app.schemas.board import Board, BoardCreate, NoteCreate, StickyNote

class BoardService:
    def __init__(self):
        self._boards: Dict[str, Board] = {}

    def list(self):
        return list(self._boards.values())

    def create(self, data: BoardCreate) -> Board:
        board = Board(title=data.title)
        self._boards[board.id] = board
        return board

    def get(self, board_id: str) -> Board | None:
        return self._boards.get(board_id)

    def add_note(self, board_id: str, data: NoteCreate) -> StickyNote | None:
        board = self.get(board_id)
        if not board:
            return None
        note = StickyNote(text=data.text, x=data.x, y=data.y, color=data.color or "yellow")
        board.notes.append(note)
        return note

    def update_note_position(self, board_id: str, note_id: str, x: int, y: int) -> StickyNote | None:
        board = self.get(board_id)
        if not board:
            return None
        for n in board.notes:
            if n.id == note_id:
                n.x, n.y = x, y
                return n
        return None

board_service = BoardService()
