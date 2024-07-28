from aws_cdk import (
    Aws,
    CfnOutput,
    Stack,
    aws_iam as iam,
    aws_apigatewayv2 as apigateway,
    aws_apigatewayv2_integrations as apigateway_integrations,
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
            table_name=f"PartyQuiz-{stage_name}",
            partition_key=dynamodb.Attribute(
                name="PKEY",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="SKEY",
                type=dynamodb.AttributeType.STRING
            ),
            time_to_live_attribute="TTL"
        )

        main_layer = _lambda.LayerVersion(
            self, 'MainLayer',
            code=_lambda.AssetCode('../backend/layers/main_layer'),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_11]
        )

        shared_lambda_cfg = {
            "runtime": _lambda.Runtime.PYTHON_3_11,
            "layers": [main_layer],
        }

        ws_message_handler = _lambda.Function(
            self, 'MessageHandlerLambda',
            **shared_lambda_cfg,
            code=_lambda.Code.from_asset('../backend/src'),
            handler='WebSocketHandler.handle_message',
        )
        main_table.grant_read_write_data(ws_message_handler)

        disconnect_handler = _lambda.Function(
            self, 'DisconnectLambda',
            **shared_lambda_cfg,
            code=_lambda.Code.from_asset('../backend/src'),
            handler='WebSocketHandlers.handle_disconnect',
        )
        main_table.grant_read_write_data(disconnect_handler)

        api = apigateway.WebSocketApi(
            self, 'PartyQuizApi',
            default_route_options=apigateway.WebSocketRouteOptions(
                integration=apigateway_integrations.WebSocketLambdaIntegration(
                    'MetaGameHandler',
                    handler=ws_message_handler
                )
            ),
            disconnect_route_options=apigateway.WebSocketRouteOptions(
                integration=apigateway_integrations.WebSocketLambdaIntegration(
                    'DisconnectHandler',
                    handler=disconnect_handler
                )
            ),
            # route_selection_expression = ‘request.body.action’
        )

        api_gateway_arn = f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{api.api_id}/{stage_name}/*"
        websocket_send_statement = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=["execute-api:ManageConnections"],
            resources=[api_gateway_arn],
        )

        for handler in [ws_message_handler, disconnect_handler]:
            handler.add_to_role_policy(websocket_send_statement)
            handler.add_permission(
                'LambdaInvokePermission',
                principal=iam.ServicePrincipal('apigateway.amazonaws.com'),
                source_arn=api_gateway_arn
            )

        api_stage = apigateway.WebSocketStage(
            self, 'dev-stage',
            web_socket_api=api,
            stage_name=stage_name,
            auto_deploy=True
        )

        CfnOutput(self, 'WebSocketEndpoint', value=api_stage.url)
