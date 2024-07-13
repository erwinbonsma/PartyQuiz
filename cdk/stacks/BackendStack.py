from aws_cdk import (
    # Duration,
    Stack,
    aws_dynamodb as dynamodb,
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
