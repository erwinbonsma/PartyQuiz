from typing import Optional
import boto3
import json
import logging
from Common import Client, ClientRole, Config, Question

logger = logging.getLogger('backend.dynamodb')

DEFAULT_CLIENT = boto3.client('dynamodb')


def optional_str(item, name):
    return item[name]["S"] if name in item else None


class DynamoDbStorage:

    def __init__(self, client=DEFAULT_CLIENT):
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
                TableName=Config.MAIN_TABLE,
                Item={
                    "PKEY": {"S": f"Quiz#{quiz_id}"},
                    "SKEY": {"S": "Instance"},
                    "Host": {"S": host_id},
                    "Name": {"S": name},
                    "QuestionId": {"N": str(0)},
                    "IsQuestionOpen": {"BOOL": False},
                    "NumChoices": {"N": str(0)},
                },
                ConditionExpression="attribute_not_exists(PKEY)"
            )
            return DynamoDbQuiz(quiz_id, self.client)
        except Exception as e:
            logger.warn(f"Failed to create Quiz {quiz_id}: {e}")

    def set_quiz_for_connection(self, connection, quiz_id):
        try:
            response = self.client.put_item(
                TableName=Config.MAIN_TABLE,
                Item={
                    "PKEY": {"S": f"Conn#{connection}"},
                    "SKEY": {"S": "Instance"},
                    "QuizId": {"S": quiz_id}
                },
                ReturnValues="ALL_OLD"
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
                TableName=Config.MAIN_TABLE,
                Key={
                    "PKEY": {"S": f"Conn#{connection}"},
                    "SKEY": {"S": "Instance"}
                }
            )

            if "Item" in response:
                return response["Item"]["QuizId"]["S"]
        except Exception as e:
            logger.warn(f"Failed to get quiz for connection {connection}: {e}")

    def clear_quiz_for_connection(self, connection):
        try:
            response = self.client.delete_item(
                TableName=Config.MAIN_TABLE,
                Key={
                    "PKEY": {"S": f"Conn#{connection}"},
                    "SKEY": {"S": "Instance"}
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
    def question_id(self) -> int:
        return int(self.__instance_item["QuestionId"]["N"])

    @property
    def is_question_open(self) -> bool:
        return self.__instance_item["IsQuestionOpen"]["BOOL"]

    @property
    def num_choices(self) -> int:
        """
        Number of choices for current question
        """
        return int(self.__instance_item["NumChoices"]["N"])

    def exists(self):
        """
        Checks if the quiz exists. This should be invoked first. This access wrapper can only be
        used when it returns True
        """
        try:
            response = self.client.query(
                TableName=Config.MAIN_TABLE,
                KeyConditionExpression="PKEY = :pkey",
                ExpressionAttributeValues={
                    ":pkey": {"S": f"Quiz#{self.quiz_id}"}
                }
            )

            self.__items = response["Items"]
            logger.info("Data for quiz %s: %s", self.quiz_id, self.__items)
            self.__instance_item = next(item for item in self.__items
                                        if item["SKEY"]["S"] == "Instance")

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
                        id=item["ClientId"]["S"],
                        role=ClientRole(int(item["Role"]["N"])),
                        name=optional_str(item, "ClientName"),
                    )

        return self.__clients

    def add_client(self, connection, client_id, role, name=None):
        try:
            item = {
                "PKEY": {"S": f"Quiz#{self.quiz_id}"},
                "SKEY": {"S": f"Conn#{connection}"},
                "ClientId": {"S": client_id},
                "Role": {"N": str(role)}
            }
            if name:
                item["ClientName"] = {"S": name}

            self.client.put_item(TableName=Config.MAIN_TABLE, Item=item)

            clients = self.clients()
            clients[connection] = Client(client_id, role, name)

            return clients
        except Exception as e:
            logger.warn(f"Failed to add Client {client_id} to Quiz {self.quiz_id}: {e}")

    def remove_client(self, connection):
        try:
            response = self.client.delete_item(
                TableName=Config.MAIN_TABLE,
                Key={
                    "PKEY": {"S": f"Quiz#{self.quiz_id}"},
                    "SKEY": {"S": f"Conn#{connection}"}
                }
            )

            clients = self.clients()  # Ensure it is fetched
            del clients[connection]

            return clients
        except Exception as e:
            logger.warn(f"Failed to remove Connection {connection} from Room {self.quiz_id}: {e}")

    def get_client(self, connection) -> Optional[Client]:
        return self.clients().get(connection)

    def set_pool_question(self, question: Question):
        try:
            self.client.put_item(
                TableName=Config.MAIN_TABLE,
                Item={
                    "PKEY": {"S": f"Pool#{self.quiz_id}"},
                    "SKEY": {"S": f"ClientId#{question.author_id}"},
                    "Question": {"S": question.question},
                    "Choices": {"SS": question.choices},
                    "Answer": {"N": str(question.answer)}
                }
            )

            return True
        except Exception as e:
            logger.warn(
                f"Failed to set question for Client {question.author_id} and Quiz {self.quiz_id}: {e}")

    def questions_pool(self) -> list[Question]:
        try:
            response = self.client.query(
                TableName=Config.MAIN_TABLE,
                KeyConditionExpression="PKEY = :pkey",
                ExpressionAttributeValues={":pkey": {"S": f"Pool#{self.quiz_id}"}}
            )

            return [
                Question(
                    author_id=skey[9:],
                    question=item["Question"]["S"],
                    choices=item["Choices"]["SS"],
                    answer=int(item["Answer"]["N"])
                )
                for item in response["Items"]
                if (skey := item["SKEY"]["S"]).startswith("ClientId#")
            ]
        except Exception as e:
            logger.warn(f"Failed to get questions for Quiz {self.quiz_id}: {e}")

    def set_question(self, question: Question, question_id: int):
        try:
            # Note: Allow overwriting an existing question. This should only occur when a previous
            # invocation of open_question crashed midway and left the database in an inconsistent
            # state. It is needed to recover from this state.
            self.client.put_item(
                TableName=Config.MAIN_TABLE,
                Item={
                    "PKEY": {"S": f"Questions#{self.quiz_id}"},
                    "SKEY": {"S": str(question_id)},
                    "Question": {"S": question.question},
                    "Choices": {"SS": question.choices},
                    "Answer": {"N": str(question.answer)},
                    "Author": {"S": question.author_id},
                },
            )

            return True
        except Exception as e:
            logger.warn(
                f"Failed to set question {question_id} for Quiz {self.quiz_id}: {e}")

    def get_questions(self) -> list[Question]:
        try:
            response = self.client.query(
                TableName=Config.MAIN_TABLE,
                KeyConditionExpression="PKEY = :pkey",
                ExpressionAttributeValues={":pkey": {"S": f"Questions#{self.quiz_id}"}}
            )

            return {
                item["SKEY"]["S"]: Question(
                    author_id=item["Author"]["S"],
                    question=item["Question"]["S"],
                    choices=item["Choices"]["SS"],
                    answer=int(item["Answer"]["N"])
                )
                for item in response["Items"]
            }
        except Exception as e:
            logger.warn(f"Failed to get questions for Quiz {self.quiz_id}: {e}")

    def open_question(self, question: Question) -> int:
        try:
            old_id = self.question_id
            new_id = old_id + 1

            # First store the new question
            if not self.set_question(question, new_id):
                return

            # Next update the active question index
            response = self.client.update_item(
                TableName=Config.MAIN_TABLE,
                Key={
                    "PKEY": {"S": f"Quiz#{self.quiz_id}"},
                    "SKEY": {"S": "Instance"}
                },
                UpdateExpression="SET QuestionId = :new_id, IsQuestionOpen = :open, NumChoices = :nc",
                ExpressionAttributeValues={
                    ":old_id": {"N": str(old_id)},
                    ":new_id": {"N": str(new_id)},
                    ":nc": {"N": str(len(question.choices))},
                    ":open": {"BOOL": True}
                },
                ConditionExpression="QuestionId = :old_id",
                ReturnValues="UPDATED_NEW"
            )

            for key, value in response["Attributes"].items():
                self.__instance_item[key] = value

            return self.question_id
        except Exception as e:
            logger.warn(f"Failed to open new question: {e}")

    def store_answer(self, question_id, client_id, answer: int):
        try:
            self.client.put_item(
                TableName=Config.MAIN_TABLE,
                Item={
                    "PKEY": {"S": f"Answers#{self.quiz_id}"},
                    "SKEY": {"S": f"{question_id}#{client_id}"},
                    "Answer": {"N": str(answer)}
                },
                ConditionExpression="attribute_not_exists(PKEY)"
            )

            return True
        except Exception as e:
            logger.warn(
                f"Failed to store answer for client {client_id} for question {question_id}: {e}")

    def close_question(self):
        try:
            self.client.update_item(
                TableName=Config.MAIN_TABLE,
                Key={
                    "PKEY": {"S": f"Quiz#{self.quiz_id}"},
                    "SKEY": {"S": "Instance"}
                },
                UpdateExpression="SET IsQuestionOpen = :closed",
                ExpressionAttributeValues={":closed": {"BOOL": False}},
            )

            return True
        except Exception as e:
            logger.warn(f"Failed to get update state for Quiz {self.quiz_id}: {e}")
