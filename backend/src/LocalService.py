import asyncio
import logging
import websockets
from LocalGateway import LocalGateway

logging.setLogRecordFactory(logging.LogRecord)
logging.getLogger('backend').setLevel(logging.INFO)
logging.getLogger('backend').addHandler(logging.StreamHandler())

gateway = LocalGateway()
start_server = websockets.serve(gateway.main, "", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
