from aws_cdk import (
    Stack,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda
)
from constructs import Construct

class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        stage_name = 'dev'

        main_table = dynamodb.Table(
            self, "MainTable",
            table_name = f"PartyQuiz-{stage_name}",
            partition_key = dynamodb.Attribute(
                name = "PKEY",
                type = dynamodb.AttributeType.STRING
            ),
            sort_key = dynamodb.Attribute(
                name = "SKEY",
                type = dynamodb.AttributeType.STRING
            ),
            time_to_live_attribute = "TTL"
        )

        main_layer = _lambda.LayerVersion(
            self, 'MainLayer',
            code = _lambda.AssetCode('../backend/layers/main_layer'),
            compatible_runtimes = [_lambda.Runtime.PYTHON_3_11]
        )

        shared_lambda_cfg = {
            "runtime": _lambda.Runtime.PYTHON_3_11,
            "layers": [main_layer],
        }

        ws_message_handler = _lambda.Function(
            self, 'MessageHandlerLambda',
            **shared_lambda_cfg,
            code = _lambda.Code.from_asset('../backend/src'),
            handler = 'WebsocketHandler.handle_message',
        )
        main_table.grant_read_write_data(ws_message_handler)

