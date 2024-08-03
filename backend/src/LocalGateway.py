import boto3
import json
import logging
from Common import create_id
from DisconnectionHandler import DisconnectionHandler
from QuizMessageHandler import QuizMessageHandler
from DynamoDbStorage import DynamoDbStorage

logger = logging.getLogger('backend.gateway')


class LocalGateway:
    def __init__(self):
        self.db = DynamoDbStorage(
            client=boto3.client('dynamodb', endpoint_url="http://dynamodb:8000")
        )
        self.comms = self
        self.logger = logger

        self.sockets = {}

    async def send(self, socket_id, message):
        socket = self.sockets.get(socket_id, None)
        if socket:
            await socket.send(message)

    async def main(self, websocket, path):
        socket_id = create_id()
        self.sockets[socket_id] = websocket

        try:
            async for message in websocket:
                self.logger.info(f"Message received: {message}")
                cmd_message = json.loads(message)
                handler = QuizMessageHandler(self.db, self.comms, socket_id)

                await handler.handle_message(cmd_message)
        except Exception as e:
            self.logger.info(e)
            raise e
        finally:
            del self.sockets[socket_id]
            await DisconnectionHandler(self.db, self.comms, socket_id).handle_disconnect()
