import asyncio
import random
from BaseMessageHandler import ErrorCode, BaseMessageHandler, HandlerException, ok_message
from Common import Config

def create_quiz_id():
    return ''.join(chr(random.randint(ord('A'), ord('Z'))) for _ in range(4))

def check_name(name):
    if len(name) < Config.MIN_NAME_LENGTH or len(name) > Config.MAX_NAME_LENGTH:
        raise HandlerException(
            "Invalid name length",
            ErrorCode.InvalidClientName
        )

    if name != name.strip():
        raise HandlerException(
            "Name contains leading or trailing whitespace",
            ErrorCode.InvalidClientName
        )

class QuizMessageHandler(BaseMessageHandler):

    async def broadcast(self, message):
        if self.clients:
            self.logger.info("broadcasting %s to %d clients", message, len(self.clients))
            tasks = [asyncio.create_task(self.comms.send(ws, message)) for ws in self.clients]
            await asyncio.wait(tasks)

    async def create_quiz(self, host):
        check_name(host)

        for _ in range(3): # Multiple attempts to handle ID clash
            quiz_id = create_quiz_id()
            quiz_access = self.db.create_quiz(quiz_id, host)
            if quiz_access:
                return await self.send_message(ok_message({ "quiz_id": quiz_id }))

        raise RuntimeError("Failed to create quiz")

    async def join_quiz(self, quiz_id, client_id):
        check_name(client_id)

        if (len(self.clients) >= Config.MAX_CLIENTS_PER_QUIZ
            # The host can always join
            and client_id != self.quiz.host):
            raise HandlerException(
                f"Quiz {quiz_id} is at its capacity limit",
                ErrorCode.PlayerLimitReached
            )

        if not self.db.set_quiz_for_connection(self.connection, quiz_id):
            raise HandlerException(
                f"Failed to link connection to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        updated_clients = self.quiz.add_client(self.connection, client_id)
        if updated_clients is None:
            raise HandlerException(
                "Failed to join quiz. Please try again",
                ErrorCode.InternalServerError
            )
        self.clients = updated_clients
        self.client_id = client_id

        await self.send_clients_event()

    async def leave_quiz(self):
        # Retry removal. It can fail if two (or more clients) disconnect at the same time. In that
        # case, CAS ensures that (at least) one update succeeded so removal should eventually
        # succeed. Note, in contrast to join_game, cannot make client responsible for retrying, as
        # it will typically have disconnected.
        for attempts in range(1, 4):
            updated_clients = self.quiz.remove_client(self.connection)
            if updated_clients is not None:
                break
            await asyncio.sleep(random.random() * attempts)

        if updated_clients is None:
            return self.logger.error(f"Failed to remove {self.client_id} from Quiz {self.quiz.quiz_id}")
        self.clients = updated_clients

        self.db.clear_quiz_for_connection(self.connection)

    def fetch_quiz(self, quiz_id):
        self.quiz = self.db.quiz_access(quiz_id)

        if not self.quiz.exists():
            return False

        self.clients = self.quiz.clients()
        self.client_id = self.clients.get(self.connection, None)
        if self.client_id is None:
            self.logger.warn(
                "No client ID for connection %s. #clients=%d",
                self.connection, len(self.clients)
            )
        return True

    async def _handle_message(self, cmd_message):
        cmd = cmd_message["action"]

        if cmd == "create-quiz":
            return await self.create_quiz(cmd_message["client_id"])

        quiz_id = cmd_message["quiz_id"]
        if not self.fetch_quiz(quiz_id):
            raise HandlerException(
                f"Quiz {quiz_id} not found",
                ErrorCode.QuizNotFound
            )

        if cmd == "join-quiz":
            return await self.join_quiz(quiz_id, cmd_message["client_id"])

        self.logger.warn("Unrecognized command %s", cmd)
