import './App.css';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';

import config from './utils/config';
import { handleResponse } from './utils';

import { PlayQuiz } from './Components/PlayQuiz';
import { QuizRegistration } from './Components/QuizRegisteration';
import { RegistrationForm } from './Components/RegistrationForm';
import { SubmitQuestion } from './Components/SubmitQuestion';

function App() {
    const [registrationFilled, setRegistrationFilled] = useState(false);
	const [playerName, setPlayerName] = useState();
	const [clientId, setClientId] = useState();
    const [quizId, setQuizId] = useState();
    const [joinedQuiz, setJoinedQuiz] = useState(false);
    const [submittedQuestion, setSubmittedQuestion] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();

    // Set-up websocket connection once player entered details
	useEffect(() => {
		if (websocket || !registrationFilled || errorMessage) {
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
            setJoinedQuiz(false);
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
	}, [websocket, playerName, errorMessage]);

    // Auto-join quiz (or re-join after disconnect)
    useEffect(() => {
        if (!websocket || !clientId || joinedQuiz) {
            return;
        }

        handleResponse(websocket, () => setJoinedQuiz(true));

        websocket.send(JSON.stringify({
			action: "connect",
            quiz_id: quizId,
            client_id: clientId
		}));
    }, [websocket, clientId, joinedQuiz]);

    const onRegistrationFilled = (name) => {
        setPlayerName(name);
        setRegistrationFilled(true);
    }
    const onRegistrationDone = (clientId, quizId) => {
        setClientId(clientId);
        setQuizId(quizId);
    }
    const onRegistrationCancelled = () => {
        setRegistrationFilled(false);
    }
    const onSubmittedQuestion = () => {
        setSubmittedQuestion(true);
    }

    return <div className="App">
        { joinedQuiz
        ? ( submittedQuestion
            ? (websocket && <PlayQuiz websocket={websocket} quizId={quizId} />)
            : (websocket && <SubmitQuestion websocket={websocket} quizId={quizId}
                             onDone={onSubmittedQuestion} />))
        : ( clientId
            ? <p>Registered for quiz</p>
            : ( registrationFilled
                ? (websocket && <QuizRegistration websocket={websocket} playerName={playerName}
                                onDone={onRegistrationDone}
                                onCancel={onRegistrationCancelled}/>)
                : <RegistrationForm playerName={playerName}
                  onDone={onRegistrationFilled} />))}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>;
}

export default App;
