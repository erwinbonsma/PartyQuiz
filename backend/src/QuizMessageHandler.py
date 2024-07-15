import asyncio
import random
from BaseMessageHandler import (BaseMessageHandler, ErrorCode, HandlerException,
                                error_message, ok_message, status_message)
from Common import Config, ClientRole, Question, QuizState, create_id


def check_int_value(name: str, value: int, value_range: tuple[int, int]):
    if value < value_range[0]:
        raise HandlerException(
            f"{name} is too short ({value} < {value_range[0]})",
            ErrorCode.InvalidValue
        )
    if value > value_range[1]:
        raise HandlerException(
            f"{name} is too long ({value} > {value_range[1]})",
            ErrorCode.InvalidValue
        )


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


class QuizMessageHandler(BaseMessageHandler):

    def fetch_quiz(self, quiz_id):
        self.quiz = self.db.quiz_access(quiz_id)

        if not self.quiz.exists():
            raise HandlerException(
                f"Quiz {quiz_id} not found", ErrorCode.QuizNotFound)

        self.clients = self.quiz.clients()
        # self.client_id = self.clients.get(self.connection, None)
        # if self.client_id is None:
        #     self.logger.warn(
        #         "No client ID for connection %s. #clients=%d",
        #         self.connection, len(self.clients)
        #     )

    def check_role(self, required_role: ClientRole):
        client = self.quiz.get_client(self.connection)
        if client is None:
            raise HandlerException(
                "Must join quiz first", ErrorCode.NotAllowed)
        if client.role != required_role:
            raise HandlerException("Invalid role", ErrorCode.NotAllowed)
        return client.id

    def check_state(self, required_state: QuizState):
        if self.quiz.state != required_state:
            raise HandlerException("Invalid state", ErrorCode.NotAllowed)

    async def broadcast(self, message, skip_players=False):
        if self.clients:
            tasks = [asyncio.create_task(self.comms.send(ws, message))
                     for ws, client in self.clients.items()
                     if not skip_players or client.role != ClientRole.Player]
            if tasks:
                self.logger.info(
                    "broadcasting %s to %d clients", message, len(tasks))
                await asyncio.wait(tasks)

    async def send_status_message(self):
        await self.broadcast(status_message({
            "host_present": any(client.id == self.quiz.host for client in self.clients.values()),
            "num_players": sum(1 for client in self.clients.values()
                               if client.role == ClientRole.Player),
            "question_pool_size": len(self.quiz.questions_pool())
        }), skip_players=True)

    async def create_quiz(self, name):
        host_id = create_id()

        for _ in range(Config.MAX_ATTEMPTS):  # Multiple attempts to handle ID clash
            quiz_id = create_id()
            if self.db.create_quiz(quiz_id, host_id, name):
                break
        else:
            raise RuntimeError("Failed to create quiz")

        self.logger.info(f"Created Quiz {quiz_id} with Host {host_id}")

        return await self.send_message(ok_message({
            "quiz_id": quiz_id,
            "host_id": host_id,
        }))

    async def host_quiz(self, quiz_id, host_id):
        """
        Join (or re-join) quiz as a host
        """
        if self.quiz.host != host_id:
            raise HandlerException("Invalid host ID", ErrorCode.NotAllowed)

        if not self.db.set_quiz_for_connection(self.connection, quiz_id):
            raise HandlerException(
                f"Failed to link connection to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        if not self.quiz.add_client(self.connection, host_id, ClientRole.Host):
            raise HandlerException(
                f"Failed to add host to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        return await self.send_message(ok_message())

    async def start_quiz(self):
        self.check_role(ClientRole.Host)
        self.check_state(QuizState.Setup)

        if not self.quiz.set_state(QuizState.Play):
            raise HandlerException(
                "Failed to start quiz", ErrorCode.InternalServerError)

        return await self.send_message(ok_message())

    async def join_quiz(self, quiz_id, player_name, client_id=None):
        """
        Join (or re-join) a quiz (as a player)
        """
        check_string_value("name", player_name, Config.RANGE_NAME_LENGTH)

        if len(self.clients) >= Config.MAX_CLIENTS_PER_QUIZ:
            raise HandlerException(
                f"Player limit reached for Quiz {quiz_id}",
                ErrorCode.PlayerLimitReached
            )

        if not self.db.set_quiz_for_connection(self.connection, quiz_id):
            raise HandlerException(
                f"Failed to link connection to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        if client_id:
            # Rejoin after an (accidental) disconnect.
            pass
        else:
            client_id = create_id()

        updated_clients = self.quiz.add_client(
            self.connection, client_id, ClientRole.Player, player_name
        )
        if updated_clients is None:
            raise HandlerException(
                "Failed to join quiz. Please try again",
                ErrorCode.InternalServerError
            )
        self.clients = updated_clients
        self.client_id = client_id

        await self.send_message(ok_message({
            "quiz_name": self.quiz.name,
            "client_id": client_id  # Return to enable client to rejoin
        }))

        await self.send_status_message()

    async def leave_quiz(self):
        # Retry removal. It can fail if two (or more clients) disconnect at the same time. In that
        # case, CAS ensures that (at least) one update succeeded so removal should eventually
        # succeed. Note, in contrast to join_game, cannot make client responsible for retrying, as
        # it will typically have disconnected.
        for attempt in range(1, 1 + Config.MAX_ATTEMPTS):
            updated_clients = self.quiz.remove_client(self.connection)
            if updated_clients is not None:
                break
            await asyncio.sleep(random.random() * attempt)

        if updated_clients is None:
            return self.logger.error(
                f"Failed to remove {self.client_id} from Quiz {self.quiz.quiz_id}")
        self.clients = updated_clients

        self.db.clear_quiz_for_connection(self.connection)

        await self.send_status_message()

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

        check_string_value("question", question, Config.RANGE_QUESTION_LENGTH)
        check_int_value("number of choices", len(choices),
                        Config.RANGE_CHOICES_PER_QUESTION)
        for i, choice in enumerate(choices):
            check_string_value(f"answer {i + 1}",
                               choice, Config.RANGE_CHOICE_LENGTH)
        check_int_value("answer", answer, (1, len(choices)))

        if not self.quiz.set_pool_question(Question(client_id, question, choices, answer)):
            raise HandlerException(
                "Failed to set question", ErrorCode.InternalServerError)

        await self.send_message(ok_message())
        await self.send_status_message()

    async def get_pool_questions(self):
        self.check_role(ClientRole.Host)

        return await self.send_message(ok_message({
            "pool_questions": [q.asdict() for q in self.quiz.questions_pool()]
        }))

    async def _handle_message(self, msg):
        cmd = msg["action"]

        if cmd == "create-quiz":
            return await self.create_quiz(msg["quiz_name"])

        quiz_id = msg["quiz_id"]
        self.fetch_quiz(quiz_id)

        if cmd == "host-quiz":
            return await self.host_quiz(quiz_id, msg["host_id"])
        if cmd == "join-quiz":
            return await self.join_quiz(
                quiz_id,
                player_name=msg["player_name"],
                client_id=msg.get("client_id")
            )

        if cmd == "set-pool-question":
            return await self.set_pool_question(msg["question"], msg["choices"], msg["answer"])
        if cmd == "get-pool-questions":
            return await self.get_pool_questions()

        if cmd == "start-quiz":
            return await self.start_quiz()

        self.logger.warn("Unrecognized command %s", cmd)
        return await self.send_message(error_message(ErrorCode.UnknownCommand))
