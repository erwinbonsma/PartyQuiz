from BaseMessageHandler import BaseHandler
from QuizMessageHandler import QuizMessageHandler


class DisconnectionHandler(BaseHandler):
    async def handle_disconnect(self):
        try:
            self.logger.info("Handling disconnect of Connection %s", self.connection)
            quiz_id = self.db.quiz_for_connection(self.connection)

            if quiz_id:
                handler = QuizMessageHandler(self.db, self.comms, self.connection)
                handler.fetch_quiz(quiz_id)
                await handler.disconnect()

            self.logger.info("Handled disconnect of Connection %s", self.connection)
        except Exception as e:
            self.logger.warn("Exception while handling disconnect: %s", str(e))
