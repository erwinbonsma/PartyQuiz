import asyncio
import boto3
import json
import logging
from DisconnectionHandler import DisconnectionHandler
from DynamoDbStorage import DynamoDbStorage
from QuizMessageHandler import QuizMessageHandler

db = DynamoDbStorage()
logging.getLogger('backend').setLevel(logging.INFO)

REQUEST_HANDLED = {"statusCode": 200}


class AwsWebsocketComms:
    def __init__(self, request_context):
        domain_name = request_context['domainName']
        stage = request_context['stage']
        url = f'https://{domain_name}/{stage}'
        self.gateway_client = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=url
        )

    async def send(self, connection_id, message):
        self.gateway_client.post_to_connection(
            ConnectionId=connection_id,
            Data=message
        )


def handle_message(event, context):
    request_context = event['requestContext']
    connection_id = request_context['connectionId']
    message = json.loads(event['body'])

    handler = QuizMessageHandler(db, AwsWebsocketComms(request_context), connection_id)
    asyncio.get_event_loop().run_until_complete(handler.handle_message(message))

    return REQUEST_HANDLED


def handle_disconnect(event, context):
    request_context = event['requestContext']
    connection_id = request_context['connectionId']

    handler = DisconnectionHandler(db, AwsWebsocketComms(request_context), connection_id)
    asyncio.get_event_loop().run_until_complete(handler.handle_disconnect())

    return REQUEST_HANDLED
