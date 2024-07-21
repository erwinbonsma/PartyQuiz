# Commands

The backend supports the following commands.
You can use `wscat` to interactively test.

## Registration

Create a quiz. This makes you the host.
```
{ "action": "create-quiz", "quiz_name": "Test Quiz", "make_default": true }
```

Register for a quiz, as a player.
```
{ "action": "register", "player_name": "jane" }
```
When quiz_id is not set, will join the default quiz (if any)

Both host and players need to connect to the quiz
```
{ "action": "connect", "quiz_id": "XXXXXX", "client_id": "XXXXXX"}
```
The connect command can also be used to reconnect to a quiz when you lost connection.

The host can check which players have registered and who are currently connected.
```
{ "action": "get-players" }
```

Note: Once connected, clients can provide the `quiz_id` in their requests.
It is recommended that web clients do so, to avoid an extra database look-up.
It is, however, not needed nor does it grant extra powers.
Clients can only interact with the quiz that they are connected to.

## Question pool

Each player add a question to the pool before the quiz starts.
```
{ "action": "set-pool-question", "question": "What is not a prime number?", "choices": ["2", "17", "29", "49"], "answer": 4 }
```
Actually, they can update/change this question at any time (also during the quiz).
This way, players could potentially adapt their question in response to other questions.

The host can view the pool questions (to use it as source for the quiz questions):
```
{ "action": "get-pool-questions" }
```

## Running the quiz

The host can open a question:
```
{ "action": "open-question", "question": "What is 1 + 1?", "choices": ["0", "1", "2", "3"], "answer": 3, "author_id": "XXXXXX" }
```

Players will receive a notification that a new question is available (but with the answer omitted):
```
{"type": "question-opened", "question_id": 7, "question": { ... }}
```

When a question is opened, each player can answer it (but only once):
```
{ "action": "answer", "question_id": 1, "answer": 1 }
```

The host can close a question to stop acception answers:
```
{ "action": "close-question" }
```

Players are notified via a `question-closed` message:
```
{"type": "question-closed", "question_id": 7 }
```

When players join a quiz midway they can query if a question is currently open.
```
{ "action": "get-question" }
```
In response they receive a `question-opened` or `question-closed` message.

## Scoring the quiz

At any moment, the host can retrieve the questions asked sofar:
```
{ "action": "get-questions" }
```

The host can also get for all questions the provided answers and their solution:
```
{ "action": "get-answers" }
```