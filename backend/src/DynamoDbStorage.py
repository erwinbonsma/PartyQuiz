import boto3
import logging
from Common import Client, ClientRole, Config

logger = logging.getLogger('backend.dynamodb')

DEFAULT_CLIENT = boto3.client('dynamodb')

class DynamoDbStorage:

    def __init__(self, client = DEFAULT_CLIENT):
        self.client = client

    def quiz_access(self, quiz_id):
        return DynamoDbQuiz(quiz_id, self.client)

    def create_quiz(self, quiz_id, host):
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
                    "Host": { "S": host },
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
    def host(self):
        return self.__instance_item["Host"]["S"]

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
                        role = ClientRole(int(item["Role"]["S"]))
                    )

        return self.__clients

    def add_client(self, connection, client_id, role):
        try:
            self.client.put_item(
                TableName = Config.MAIN_TABLE,
                Item = {
                    "PKEY": { "S": f"Quiz#{self.quiz_id}" },
                    "SKEY": { "S": f"Conn#{connection}" },
                    "ClientId": { "S": client_id },
                    "Role": { "S": str(role) }
                }
            )

            clients = self.clients()
            clients[connection] = Client(client_id, role)

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
