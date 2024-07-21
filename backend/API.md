# Commands

The backend supports the following commands.
You can use `wscat` to interactively test.

## Registration

Creating a quiz. This makes you the host.
```
{ "action": "create-quiz", "quiz_name": "Test Quiz", "make_default": true }
```

Joining the quiz, as a player.
```
{ "action": "join-quiz", "player_name": "jane" }
```
When quiz_id is not set, will join the default quiz (if any)

Both host and players need to connect to the quiz
```
{ "action": "connect", "quiz_id": "XXXXXX", "client_id": "XXXXXX"}
```
The connect command can also be used to reconnect to a quiz when you lost connection.

The host can check which players have joined and who are currently connected.
```
{ "action": "get-players" }
```

Note: Once connected, clients can provide the `quiz_id` in their requests.
It is recommended that web clients do so, to avoid an extra database look-up.
It is, however, not needed nor does it grant extra powers.
Clients can only interact with the quiz that they are connected to.

## Question pool

Each player can set a poll question before the quiz starts.
```
{ "action": "set-pool-question", "question": "What is not a prime number?", "choices": ["2", "17", "29", "49"], "answer": 4 }
```

The host can view the pool questions (to use it as source for the quiz quztions):
```
{ "action": "get-pool-questions" }
```

## Running the quiz

The host can open a question:
```
{ "action": "open-question", "question": "What is 1 + 1?", "choices": ["0", "1", "2", "3"], "answer": 3, "author": "bob" }
```

When a question is opened, each player can answer it (but only once):
```
{ "action": "answer", "question_id": 1, "answer": 1 }
```

The host can close a question to stop acception answers:
```
{ "action": "close-question" }
```

## Scoring the quiz

At any moment, the host can retrieve the questions asked sofar:
```
{ "action": "get-questions" }
```

The host can also get for all questions the provided answers and their solution:
```
{ "action": "get-answers" }
```