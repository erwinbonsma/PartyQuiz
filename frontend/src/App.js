import './App.css';
import { useState, useEffect } from 'react';

import config from './utils/config';
import { handleResponse } from './utils';

import { JoinQuiz } from './Components/JoinQuiz';
import { Registration } from './Components/Registration';

function App() {
	const [playerName, setPlayerName] = useState();
	const [clientId, setClientId] = useState();
    const [joinedQuiz, setJoinedQuiz] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();

    // Set-up websocket connection once player entered details
	useEffect(() => {
		if (websocket || !playerName || errorMessage) {
			// Only set up websocket after registration
			return
		}

        // Create WebSocket connection.
		const socket = new WebSocket(config.SERVICE_ENDPOINT);

		// Connection opened
		socket.addEventListener('open', function (event) {
			console.log("Opened websocket");
			setWebsocket(socket);
		});

		const unsetSocket = () => {
			setErrorMessage("Disconnected from server");
			setWebsocket(undefined);
		}
		socket.addEventListener('close', unsetSocket);
		socket.addEventListener('error', unsetSocket);

		return function cleanup() {
			if (websocket) {
				console.log("Closing websocket");
				setWebsocket(undefined);
				websocket.close();
			}
		}
	}, [websocket, playerName]);

    // Auto-join quiz (or re-join after disconnect)
    useEffect(() => {
        if (!websocket || !clientId || joinedQuiz) {
            return;
        }

        handleResponse(websocket, () => setJoinedQuiz(true));

        websocket.send(JSON.stringify({
			action: "connect",
            quiz_id: config.QUIZ_ID,
            client_id: clientId
		}));
    }, [websocket, clientId, joinedQuiz]);

    const onRegistrationDone = (name) => {
        setPlayerName(name);
    }
    const onQuizJoined = (clientId) => {
        setClientId(clientId);
    }

    return (
    <div className="App">
        { joinedQuiz
        ? <p>Joined quiz!</p>
        : ( clientId
            ? <p>Connecting to quiz</p>
            : ( playerName
                ? <JoinQuiz websocket={websocket} playerName={playerName} quizId={config.QUIZ_ID} onQuizJoined={onQuizJoined} />
                : <Registration onRegistrationDone={onRegistrationDone} />))}
        { errorMessage
        && <p>Error: {errorMessage}</p> }
    </div>
  );
}

export default App;
