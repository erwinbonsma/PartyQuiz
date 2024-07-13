from dataclasses import dataclass
from enum import IntEnum

class Config:
	MAIN_TABLE = "PartyQuiz-dev"
	MIN_NAME_LENGTH = 2
	MAX_NAME_LENGTH = 20
	MAX_CLIENTS_PER_QUIZ = 40
	MAX_ATTEMPTS = 3

class ClientRole(IntEnum):
	Host = 1
	Player = 2
	Observer = 3

@dataclass
class Client:
	id: str
	role: ClientRole
