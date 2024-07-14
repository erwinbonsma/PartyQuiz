import asyncio
import random
from BaseMessageHandler import ErrorCode, BaseMessageHandler, HandlerException, ok_message, status_message
from Common import Config, ClientRole

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

    async def broadcast(self, message, skip_players = False):
        if self.clients:
            tasks = [asyncio.create_task(self.comms.send(ws, message))
                     for ws, client in self.clients.items()
                     if not skip_players or client.role != ClientRole.Player]
            if tasks:
                self.logger.info("broadcasting %s to %d clients", message, len(tasks))
                await asyncio.wait(tasks)

    async def send_status_message(self):
        await self.broadcast(status_message({
            "host_present": any(client.id == self.quiz.host for client in self.clients.values()),
            "num_players": sum(1 for client in self.clients.values()
                               if client.role == ClientRole.Player),
        }), skip_players=True)

    async def create_quiz(self, host, name):
        check_name(host)

        for _ in range(Config.MAX_ATTEMPTS): # Multiple attempts to handle ID clash
            quiz_id = create_quiz_id()
            quiz_access = self.db.create_quiz(quiz_id, host, name)
            if quiz_access:
                return await self.send_message(ok_message({ "quiz_id": quiz_id }))

        raise RuntimeError("Failed to create quiz")

    async def join_quiz(self, quiz_id, client_id, role):
        check_name(client_id)

        if (len(self.clients) >= Config.MAX_CLIENTS_PER_QUIZ
            # The host can always join
            and role != ClientRole.Host):
            raise HandlerException(
                f"Player limit reached for Quiz {quiz_id}",
                ErrorCode.PlayerLimitReached
            )

        if not self.db.set_quiz_for_connection(self.connection, quiz_id):
            raise HandlerException(
                f"Failed to link connection to Quiz {quiz_id}",
                ErrorCode.InternalServerError
            )

        updated_clients = self.quiz.add_client(self.connection, client_id, role)
        if updated_clients is None:
            raise HandlerException(
                "Failed to join quiz. Please try again",
                ErrorCode.InternalServerError
            )
        self.clients = updated_clients
        self.client_id = client_id

        await self.send_message(ok_message({
            "quiz_name": self.quiz.name
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
            return self.logger.error(f"Failed to remove {self.client_id} from Quiz {self.quiz.quiz_id}")
        self.clients = updated_clients

        self.db.clear_quiz_for_connection(self.connection)

        await self.send_status_message()

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
            return await self.create_quiz(
                host=cmd_message["client_id"],
                name=cmd_message["quiz_name"]
            )

        quiz_id = cmd_message["quiz_id"]
        if not self.fetch_quiz(quiz_id):
            raise HandlerException(
                f"Quiz {quiz_id} not found",
                ErrorCode.QuizNotFound
            )

        if cmd == "join-quiz":
            client_id = cmd_message["client_id"]
            if client_id == self.quiz.host:
                role = ClientRole.Host
            elif "observer" in cmd_message:
                role = ClientRole.Observer
            else:
                role = ClientRole.Player
            return await self.join_quiz(quiz_id, client_id, role)

        self.logger.warn("Unrecognized command %s", cmd)
