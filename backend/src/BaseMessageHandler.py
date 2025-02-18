import json
import logging
import traceback
from enum import IntEnum

logger = logging.getLogger('backend.handlers')


class ErrorCode(IntEnum):
    UnspecifiedError = 0
    QuizNotFound = 1
    InvalidValue = 2
    PlayerLimitReached = 3
    NotAllowed = 4
    UnknownCommand = 5
    MissingField = 6
    NotConnected = 7
    AlreadyAnswered = 8
    EmptyResult = 9
    InternalServerError = 255


def error_message(error_code=ErrorCode.UnspecifiedError, details=None):
    msg = {
        "type": "response",
        "result": "error",
        "error_code": error_code,
    }
    if details:
        msg["details"] = details
    return json.dumps(msg)


def ok_message(info={}):
    return json.dumps({
        "type": "response",
        "result": "ok",
        **info
    })


class HandlerException(Exception):
    def __init__(self, message, error_code=ErrorCode.UnspecifiedError):
        self.message = message
        self.error_code = error_code


class BaseHandler:
    def __init__(self, db, comms, connection):
        self.db = db
        self.comms = comms
        self.connection = connection
        self.logger = logger


class BaseMessageHandler(BaseHandler):
    async def send_message(self, message, connection=None):
        if not connection:
            connection = self.connection
        return await self.comms.send(connection, message)

    async def _handle_message(self, message):
        pass

    async def handle_message(self, message):
        try:
            self.logger.info("Handling message %s from connection %s", message, self.connection)
            await self._handle_message(message)
            self.logger.info("Handled message")
        except HandlerException as e:
            self.logger.warn(e.message)
            return await self.send_message(error_message(error_code=e.error_code, details=e.message))
        except Exception as e:
            self.logger.warn(e)
            traceback.print_exc()
            raise e
