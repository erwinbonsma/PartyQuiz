import json
import logging
import traceback
from enum import IntEnum

logger = logging.getLogger('backend.handlers')

class ErrorCode(IntEnum):
	UnspecifiedError = 0
	QuizNotFound = 1
	InvalidClientName = 2
	PlayerLimitReached = 3
	InternalServerError = 255


def error_message(details, error_code = ErrorCode.UnspecifiedError):
	return json.dumps({
		"type": "response",
		"result": "error",
		"error_code": error_code,
		"details": details
	})

def ok_message(info = {}):
	return json.dumps({
		"type": "response",
		"result": "ok",
		**info
	})

def status_message(info = {}):
	return json.dumps({
		"type": "status",
		**info
	})

class HandlerException(Exception):
	def __init__(self, message, error_code = ErrorCode.UnspecifiedError):
		self.message = message
		self.error_code = error_code

class BaseHandler:
	def __init__(self, db, comms, connection):
		self.db = db
		self.comms = comms
		self.connection = connection
		self.logger = logger

class BaseMessageHandler(BaseHandler):
	async def send_message(self, message, dest_client = None):
		if dest_client:
			connection = [conn for conn, name in self.clients.items() if name == dest_client]
			if len(connection) == 0:
				self.logger.warn(f"No connection found for client {dest_client}")
				return
			destination = connection[0]
		else:
			destination = self.connection
		return await self.comms.send(destination, message)

	async def send_error_message(self, details, error_code = ErrorCode.UnspecifiedError):
		return await self.send_message(error_message(details, error_code))

	async def _handle_message(self, message):
		pass

	async def handle_message(self, message):
		try:
			self.logger.info("Handling message %s from connection %s", message, self.connection)
			await self._handle_message(message)
			self.logger.info("Handled message")
		except HandlerException as e:
			self.logger.warn(e.message)
			return await self.send_error_message(e.message, error_code = e.error_code)
		except Exception as e:
			self.logger.warn(e)
			traceback.print_exc()
			raise e
