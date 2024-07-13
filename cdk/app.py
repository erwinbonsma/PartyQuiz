#!/usr/bin/env python3
import os

import aws_cdk as cdk

from stacks.BackendStack import BackendStack


app = cdk.App()
BackendStack(app, "PartyQuizStack")

app.synth()
