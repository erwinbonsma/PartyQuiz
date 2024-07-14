from typing import Optional
import boto3
import json
import logging
from Common import Client, ClientRole, Config, Question, QuizState

logger = logging.getLogger('backend.dynamodb')

DEFAULT_CLIENT = boto3.client('dynamodb')

def optional_str(item, name):
    return item[name]["S"] if name in item else None

class DynamoDbStorage:

    def __init__(self, client = DEFAULT_CLIENT):
        self.client = client

    def quiz_access(self, quiz_id):
        return DynamoDbQuiz(quiz_id, self.client)

    def create_quiz(self, quiz_id, host_id, name):
        """
        Tries to create a room with the given ID. On success, returns the room access wrapper.
        Returns None if creation failed.
        """
        try:
            self.client.put_item(
                TableName = Config.MAIN_TABLE,
                Item = {
                    "PKEY": { "S": f"Quiz#{quiz_id}" },
                    "SKEY": { "S": "Instance" },
                    "Host": { "S": host_id },
                    "Name": { "S": name },
                    "State": { "N": str(QuizState.Setup) },
                },
                ConditionExpression = "attribute_not_exists(PKEY)"
            )
            return DynamoDbQuiz(quiz_id, self.client)
        except Exception as e:
            logger.warn(f"Failed to create Quiz {quiz_id}: {e}")

    def set_quiz_for_connection(self, connection, quiz_id):
        try:
            response = self.client.put_item(
                TableName = Config.MAIN_TABLE,
                Item = {
                    "PKEY": { "S": f"Conn#{connection}" },
                    "SKEY": { "S": "Instance" },
                    "QuizId": { "S": quiz_id }
                },
                ReturnValues = "ALL_OLD"
            )

            if "Attributes" in response:
                old_quiz = response["Attributes"]["QuizId"]["S"]
                logger.warn(f"Replaced quiz {old_quiz} for Connection {connection} by {quiz_id}")
            return True
        except Exception as e:
            logger.warn(f"Failed to set quiz for connection {connection}: {e}")

    def quiz_for_connection(self, connection):
        try:
            response = self.client.get_item(
                TableName = Config.MAIN_TABLE,
                Key = {
                    "PKEY": { "S": f"Conn#{connection}" },
                    "SKEY": { "S": "Instance" }
                }
            )

            if "Item" in response:
                return response["Item"]["QuizId"]["S"]
        except Exception as e:
            logger.warn(f"Failed to get quiz for connection {connection}: {e}")

    def clear_quiz_for_connection(self, connection):
        try:
            response = self.client.delete_item(
                TableName = Config.MAIN_TABLE,
                Key = {
                    "PKEY": { "S": f"Conn#{connection}" },
                    "SKEY": { "S": "Instance" }
                },
            )
        except Exception as e:
            logger.warn(f"Failed to clear quiz for connection {connection}: {e}")

class DynamoDbQuiz:

    def __init__(self, quiz_id, client):
        self.quiz_id = quiz_id
        self.client = client

        self.__clients = None
        self.__items = None

    @property
    def host(self) -> str:
        return self.__instance_item["Host"]["S"]

    @property
    def name(self) -> str:
        return self.__instance_item["Name"]["S"]

    @property
    def state(self) -> QuizState:
        return QuizState(int(self.__instance_item["State"]["N"]))

    def exists(self):
        """
        Checks if the quiz exists. This should be invoked first. This access wrapper can only be
        used when it returns True
        """
        try:
            response = self.client.query(
                TableName = Config.MAIN_TABLE,
                KeyConditionExpression = "PKEY = :pkey",
                ExpressionAttributeValues = {
                    ":pkey": { "S": f"Quiz#{self.quiz_id}" }
                }
            )

            self.__items = response["Items"]
            logger.info("Data for quiz %s: %s", self.quiz_id, self.__items)
            self.__instance_item = next(item for item in self.__items if item["SKEY"]["S"] == "Instance")

            return self.__instance_item is not None
        except Exception as e:
            logger.warn(f"Failed to check existence of Quiz {self.quiz_id}: {e}")

    def clients(self):
        if self.__clients is None:
            self.__clients = {}
            for item in self.__items:
                skey = item["SKEY"]["S"]
                if skey.startswith("Conn#"):
                    self.__clients[skey[5:]] = Client(
                        id = item["ClientId"]["S"],
                        role = ClientRole(int(item["Role"]["N"])),
                        name = optional_str(item, "ClientName"),
                    )

        return self.__clients

    def add_client(self, connection, client_id, role, name = None):
        try:
            item = {
                "PKEY": { "S": f"Quiz#{self.quiz_id}" },
                "SKEY": { "S": f"Conn#{connection}" },
                "ClientId": { "S": client_id },
                "Role": { "N": str(role) }
            }
            if name:
                item["ClientName"] = { "S": name }

            self.client.put_item(TableName=Config.MAIN_TABLE, Item=item)

            clients = self.clients()
            clients[connection] = Client(client_id, role, name)

            return clients
        except Exception as e:
            logger.warn(f"Failed to add Client {client_id} to Quiz {self.quiz_id}: {e}")

    def remove_client(self, connection):
        try:
            response = self.client.delete_item(
                TableName = Config.MAIN_TABLE,
                Key = {
                    "PKEY": { "S": f"Quiz#{self.quiz_id}" },
                    "SKEY": { "S": f"Conn#{connection}" }
                }
            )

            clients = self.clients() # Ensure it is fetched
            del clients[connection]

            return clients
        except Exception as e:
            logger.warn(f"Failed to remove Connection {connection} from Room {self.quiz_id}: {e}")

    def get_client(self, connection) -> Optional[Client]:
        return self.clients().get(connection)

    def set_question(self, question: Question):
        try:
            self.client.put_item(
                TableName = Config.MAIN_TABLE,
                Item = {
                    "PKEY": { "S": f"Questions#{self.quiz_id}" },
                    "SKEY": { "S": f"ClientId#{question.author_id}" },
                    "Question": { "S": question.question },
                    "Choices": { "S": json.dumps(question.choices) },
                    "Answer": { "N" : str(question.answer) }
                }
            )

            return True
        except Exception as e:
            logger.warn(f"Failed to set question for Client {question.author_id} and Quiz {self.quiz_id}: {e}")

    def questions(self) -> list[Question]:
        try:
            response = self.client.query(
                TableName = Config.MAIN_TABLE,
                KeyConditionExpression = "PKEY = :pkey",
                ExpressionAttributeValues = { ":pkey": { "S": f"Questions#{self.quiz_id}" } }
            )

            return [
                Question(
                    author_id = skey[9:],
                    question = item["Question"]["S"],
                    choices = json.loads(item["Choices"]["S"]),
                    answer = int(item["Answer"]["N"])
                )
                for item in response["Items"]
                if (skey := item["SKEY"]["S"]).startswith("ClientId#")
            ]
        except Exception as e:
            logger.warn(f"Failed to get questions for Quiz {self.quiz_id}: {e}")

    def set_state(self, state: QuizState):
        try:
            self.client.update_item(
                TableName = Config.MAIN_TABLE,
                Key = {
                    "PKEY": { "S": f"Quiz#{self.quiz_id}" },
                    "SKEY": { "S": "Instance" }
                },
                UpdateExpression = "SET #State = :state",
                ExpressionAttributeNames = { "#State": "State" },
                ExpressionAttributeValues = { ":state": { "N": str(state) } },
            )

            return True
        except Exception as e:
            logger.warn(f"Failed to get update state for Quiz {self.quiz_id}: {e}")
