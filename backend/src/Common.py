from dataclasses import asdict, dataclass
from enum import IntEnum
import random
from typing import Optional

class Config:
    MAIN_TABLE = "PartyQuiz-dev"
    MAX_CLIENTS_PER_QUIZ = 40
    MAX_ATTEMPTS = 3
    RANGE_NAME_LENGTH = (2, 20)
    RANGE_CHOICES_PER_QUESTION = (4, 4)
    RANGE_QUESTION_LENGTH = (10, 200)
    RANGE_CHOICE_LENGTH = (1, 20)

class ClientRole(IntEnum):
    Host = 1
    Player = 2
    Observer = 3

@dataclass
class Client:
    id: str
    role: ClientRole
    name: Optional[str]

@dataclass
class Question:
    author_id: str
    question: str
    choices: list[str]
    answer: int

    def asdict(self):
        return asdict(self)

def create_id():
    return ''.join(chr(random.randint(ord('A'), ord('Z'))) for _ in range(6))
