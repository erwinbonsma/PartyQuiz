import asyncio
import json
import random
from BaseMessageHandler import (BaseMessageHandler, ErrorCode, HandlerException,
                                error_message, ok_message, status_message)
from Common import Config, ClientRole, Question, create_id


def check_int_value(name: str, value: int | str, value_range: tuple[int, int]):
    try:
        value = int(value)
    except ValueError:
        raise HandlerException(
            f"{name} is not an integer)", ErrorCode.InvalidValue)

    if value < value_range[0]:
        raise HandlerException(
            f"{name} is too small ({value} < {value_range[0]})",
            ErrorCode.InvalidValue)
    if value > value_range[1]:
        raise HandlerException(
            f"{name} is too big ({value} > {value_range[1]})",
            ErrorCode.InvalidValue)


def check_string_value(name: str, value: str, len_range: tuple[int, int]):
    if value != value.strip():
        raise HandlerException(
            f"{name} contains leading or trailing whitespace",
            ErrorCode.InvalidValue
        )

    if len(value) < len_range[0]:
        raise HandlerException(
            f"{name} is too short ({len(value)} < {len_range[0]})",
            ErrorCode.InvalidValue
        )
    if len(value) > len_range[1]:
        raise HandlerException(
            f"{name} is too long ({len(value)} > {len_range[1]})",
            ErrorCode.InvalidValue
        )


class MessageWrapper:
    """
    Wrapper to generate exception when a required field is missing
    """

    def __init__(self, msg):
        self.msg = msg

    def __getitem__(self, key):
        if (value := self.msg.get(key)) is None:
            raise HandlerException(f"Field '{key}' is missing", ErrorCode.MissingField)
        return value

    def get(self, key):
        return self.msg.get(key)


def create_question(author_id, question, choices, answer):
    check_string_value("question", question, Config.RANGE_QUESTION_LENGTH)
    check_int_value("number of choices", len(choices),
                    Config.RANGE_CHOICES_PER_QUESTION)
    for i, choice in enumerate(choices):
        check_string_value(f"answer {i + 1}", choice, Config.RANGE_CHOICE_LENGTH)
    check_int_value("answer", answer, (1, len(choices)))

    return Question(author_id, question, choices, answer)


class QuizMessageHandler(BaseMessageHandler):

    def fetch_quiz(self, quiz_id):
        self.quiz = self.db.quiz_access(quiz_id)

        if not self.quiz.exists():
            raise HandlerException(
                f"Quiz {quiz_id} not found", ErrorCode.QuizNotFound)

    def check_role(self, required_role: ClientRole):
        client_id = self.quiz.get_client_id(self.connection)
        if client_id is None:
            raise HandlerException(
                "Must join quiz first", ErrorCode.NotAllowed)

        if required_role == ClientRole.Host:
            if self.quiz.host_id != client_id:
                raise HandlerException(f"{client_id} is not the host", ErrorCode.NotAllowed)
        if required_role == ClientRole.Player:
            if not client_id in self.quiz.players:
                raise HandlerException(f"{client_id} is not a player", ErrorCode.NotAllowed)

        return client_id

    async def broadcast(self, message, skip_players=False):
        tasks = [asyncio.create_task(self.comms.send(ws, message))
                 for ws, client_id in self.quiz.clients.items()
                 if not skip_players or client_id not in self.quiz.players]
        if tasks:
            self.logger.info(
                "broadcasting %s to %d clients", message, len(tasks))
            await asyncio.wait(tasks)

    async def send_status_message(self):
        await self.broadcast(status_message({
            "host_present": any(client_id == self.quiz.host_id
                                for client_id in self.quiz.clients.values()),
            "num_players": len(self.quiz.players),
            "num_players_present": sum(1 for client_id in self.quiz.clients.values()
                                       if client_id in self.quiz.players),
            "question_pool_size": len(self.quiz.questions_pool()),
            "question_id": self.quiz.question_id,
            "is_question_open": self.quiz.is_question_open,
        }), skip_players=True)

    async def notify_host(self, message_type, fields):
        host_ws = [ws for ws, client_id in self.quiz.clients.items()
                   if client_id == self.quiz.host_id]

        if len(host_ws) == 0:
            return

        await self.send_message(json.dumps({
            "type": message_type,
            **fields
        }), host_ws[0])

    async def create_quiz(self, name, make_default=False):
        host_id = create_id()

        for _ in range(Config.MAX_ATTEMPTS):  # Multiple attempts to handle ID clash
            quiz_id = create_id()
            if self.db.create_quiz(quiz_id, host_id, name):
                break
        else:
            raise HandlerException(
                "Failed to create quiz", ErrorCode.InternalServerError)

        self.logger.info(f"Created Quiz {quiz_id} with Host {host_id}")

        if make_default and not self.db.set_default_quiz_id(quiz_id):
            raise HandlerException(
                "Failed to make quiz default", ErrorCode.InternalServerError)

        return await self.send_message(ok_message({
            "quiz_id": quiz_id,
            "host_id": host_id,
        }))

    async def connect(self, quiz_id, client_id):
        """
        Connect to quiz (as host, player or observer)
        """
        if not self.db.set_quiz_for_connection(self.connection, quiz_id):
            raise HandlerException(
                f"Failed to link connection to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        if not self.quiz.add_client(self.connection, client_id):
            raise HandlerException(
                f"Failed to add client {client_id} to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        await self.send_message(ok_message())

        if client_id != self.quiz.host_id:
            await self.notify_host("player-connected", {"client_id": client_id})

    async def disconnect(self):
        # Retry removal. It can fail if two (or more clients) disconnect at the same time. In that
        # case, CAS ensures that (at least) one update succeeded so removal should eventually
        # succeed. Note, in contrast to join_game, cannot make client responsible for retrying, as
        # it will typically have disconnected.
        client_id = self.quiz.clients[self.connection]
        if client_id is None:
            raise HandlerException(
                f"Client {client_id} not connected to Quiz {self.quiz.quiz_id}",
                ErrorCode.InternalServerError
            )

        for attempt in range(1, 1 + Config.MAX_ATTEMPTS):
            if self.quiz.remove_client(self.connection) is not None:
                break
            await asyncio.sleep(random.random() * attempt)
        else:
            return self.logger.error(
                f"Failed to remove {client_id} from Quiz {self.quiz.quiz_id}")

        self.db.clear_quiz_for_connection(self.connection)

        await self.notify_host("player-disconnected", {"client_id": client_id})

    async def register(self, player_name, avatar=None, quiz_id=None):
        """ Register for a quiz (as a player) """
        check_string_value("name", player_name, Config.RANGE_NAME_LENGTH)

        if quiz_id is None:
            if (quiz_id := self.db.get_default_quiz_id()) is None:
                raise HandlerException(
                    "Failed to get default quiz",
                    ErrorCode.InternalServerError)

        self.fetch_quiz(quiz_id)
        if len(self.quiz.players) >= Config.MAX_PLAYERS_PER_QUIZ:
            raise HandlerException(
                f"Player limit reached for Quiz {quiz_id}",
                ErrorCode.PlayerLimitReached)

        client_id = create_id()
        if not self.quiz.add_player(client_id, player_name, avatar):
            raise HandlerException(
                f"Failed to add player {player_name} as {client_id}",
                ErrorCode.InternalServerError)

        await self.send_message(ok_message({
            "quiz_id": quiz_id,
            "quiz_name": self.quiz.name,
            "client_id": client_id  # Return to enable client to rejoin
        }))

        await self.notify_host("player-registered", {
            "client_id": client_id,
            "player_name": player_name,
            "avatar": avatar
        })

    async def get_players(self):
        self.check_role(ClientRole.Host)

        client_ids = set(self.quiz.clients.values())

        return await self.send_message(json.dumps({
            "type": "players",
            "players": {id: {
                **player.asdict(),
                "online": id in client_ids
            }
                for id, player in self.quiz.players.items()}
        }))

    async def set_pool_question(self, question, choices, answer):
        """
        Adds a question to the question pool, or replaces/updates an existing one.

        Each player can have only one question in the pool. The host can use this a source of
        questions when running the quiz.

        The backend intentionally does not limit how the pool is used. The host controls the order
        in which to ask the questions, may filter out duplicates, and may ask questions from
        another source. Players may modify questions while the quiz is ongoing.
        """
        client_id = self.check_role(ClientRole.Player)

        if not self.quiz.set_pool_question(create_question(client_id, question, choices, answer)):
            raise HandlerException(
                "Failed to set question", ErrorCode.InternalServerError)

        await self.send_message(ok_message())

        await self.notify_host("question-updated", {
            "client_id": client_id,
            "question": question
        })

    async def get_pool_questions(self):
        self.check_role(ClientRole.Host)

        return await self.send_message(json.dumps({
            "type": "pool-questions",
            "questions": [q.asdict(strip_answer=False) for q in self.quiz.questions_pool()]
        }))

    async def open_question(self, author_id, question, choices, answer):
        """
        Sets a new (active) questions and accepts answers for it.
        """
        self.check_role(ClientRole.Host)

        question = create_question(author_id, question, choices, answer)
        if not (question_id := self.quiz.open_question(question)):
            raise HandlerException(
                "Failed to open question", ErrorCode.InternalServerError)

        await self.broadcast(json.dumps({
            "type": "question-opened",
            "question_id": question_id,
            "question": question.asdict(strip_answer=True),
        }))

    async def answer(self, question_id, answer):
        """
        Give an answer to the currently open question
        """
        client_id = self.check_role(ClientRole.Player)

        if question_id != self.quiz.question_id:
            raise HandlerException(
                f"Answer does not match current question: {question_id} != {self.quiz.question_id}",
                ErrorCode.InvalidValue)
        if not self.quiz.is_question_open:
            raise HandlerException(
                "Cannot answer question anymore", ErrorCode.NotAllowed)

        check_int_value("answer", answer, (1, self.quiz.num_choices))

        if not self.quiz.store_answer(question_id, client_id, answer):
            raise HandlerException(
                "Can only answer question once", ErrorCode.AlreadyAnswered)

        # Notify host that (another) answer has been received.
        # Note: not including total number of answers received for current question, as this is
        # relatively expensive to obtain (and host can keep local count).
        await self.broadcast(json.dumps({
            "type": "answer-received",
            "question_id": question_id
        }), skip_players=True)

        await self.send_message(ok_message())

    async def close_question(self):
        """
        Marks the active question closed so that no answers are accepted anymore.
        """
        self.check_role(ClientRole.Host)

        if not self.quiz.close_question():
            raise HandlerException(
                "Failed to open question", ErrorCode.InternalServerError)

        await self.broadcast(json.dumps({
            "type": "question-closed",
            "question_id": self.quiz.question_id
        }))

    async def get_question(self):
        self.check_role(ClientRole.Player)

        if self.quiz.is_question_open:
            # Enable client that (re-)joined an in-progress quiz answer current
            # question.
            #
            # Note: not checking if player already answered. That will be done
            # if/when player answers.
            question = self.quiz.get_question(self.quiz.question_id)

            await self.send_message(json.dumps({
                "type": "question-opened",
                "question_id": self.quiz.question_id,
                "question": question.asdict(strip_answer=True),
            }))
        else:
            await self.send_message(json.dumps({
                "type": "question-closed",
                "question_id": self.quiz.question_id
            }))

    async def get_questions(self):
        self.check_role(ClientRole.Host)

        return await self.send_message(json.dumps({
            "type": "questions",
            "questions": {id: q.asdict(strip_answer=False) for id, q in self.quiz.get_questions().items()},
        }))

    async def get_answers(self):
        self.check_role(ClientRole.Host)

        return await self.send_message(json.dumps({
            "type": "answers",
            "answers": self.quiz.get_answers(),
            "solutions": self.quiz.get_solutions(),
        }))

    async def _handle_message(self, msg):
        msg = MessageWrapper(msg)

        cmd = msg["action"]

        if cmd == "create-quiz":
            return await self.create_quiz(
                msg["quiz_name"], msg.get("make_default"))

        if cmd == "register":
            return await self.register(
                player_name=msg["player_name"],
                avatar=msg.get("avatar"),
                quiz_id=msg.get("quiz_id")
            )

        if (quiz_id := msg.get("quiz_id")) is None:
            # To avoid extra look-up, best if client provides quiz_id in
            # request. However, for manual testing (using wscat) it is
            # convenient to be able to omit quiz_id.
            if (quiz_id := self.db.quiz_for_connection(self.connection)) is None:
                raise HandlerException("Not connected to quiz yet",
                                       ErrorCode.NotConnected)
        self.fetch_quiz(quiz_id)

        if cmd == "get-players":
            return await self.get_players()

        if cmd == "connect":
            return await self.connect(quiz_id, msg["client_id"])

        if cmd == "get-status":
            return await self.send_status_message()

        if cmd == "set-pool-question":
            return await self.set_pool_question(msg["question"], msg["choices"], msg["answer"])
        if cmd == "get-pool-questions":
            return await self.get_pool_questions()

        if cmd == "open-question":
            return await self.open_question(msg["author_id"], msg["question"], msg["choices"],
                                            msg["answer"])
        if cmd == "get-question":
            return await self.get_question()
        if cmd == "answer":
            return await self.answer(msg["question_id"], msg["answer"])

        if cmd == "close-question":
            return await self.close_question()

        if cmd == "get-questions":
            return await self.get_questions()
        if cmd == "get-answers":
            return await self.get_answers()

        self.logger.warn("Unrecognized command %s", cmd)
        return await self.send_message(error_message(ErrorCode.UnknownCommand))
