import './App.css';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';

import config from './utils/config';
import { handleResponse } from './utils';

import { PlayQuiz } from './Components/PlayQuiz';
import { QuizRegistration } from './Components/QuizRegistration';
import { SubmitQuestion } from './Components/SubmitQuestion';

function App() {
	const [clientId, setClientId] = useState();
    const [quizId, setQuizId] = useState();
    const [joinedQuiz, setJoinedQuiz] = useState(false);
    const [submittedQuestion, setSubmittedQuestion] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();

    const createWebsocket = (onOpen) => {
        // Create WebSocket connection.
		const socket = new WebSocket(config.SERVICE_ENDPOINT);

		// Connection opened
		socket.addEventListener('open', function (event) {
			console.log("Opened websocket");
            onOpen?.(socket);
			setWebsocket(socket);
		});

		const unsetSocket = () => {
			setErrorMessage("Disconnected from server");
			setWebsocket(undefined);
            setJoinedQuiz(false);
		}
		socket.addEventListener('close', unsetSocket);
		socket.addEventListener('error', unsetSocket);

        return socket;
    }

    const getWebsocket = (onOpen) => {
        if (websocket) {
            onOpen(websocket);
        } else {
            createWebsocket(onOpen);
        }
    };

	useEffect(() => {
		if (errorMessage || !quizId) {
			return
		}

        if (!websocket) {
            // Create websocket if needed. It is typically set-up during
            // registration, but done here to recover from disconnects.
            createWebsocket();
        }

        if (websocket) {
            return function cleanup() {
                console.log("Closing websocket");
                setWebsocket(undefined);
                websocket.close();
            }
        }
	}, [websocket, quizId, errorMessage]);

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

    const onRegistrationDone = (clientId, quizId) => {
        setClientId(clientId);
        setQuizId(quizId);
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
            : <QuizRegistration getWebsocket={getWebsocket}
                                onDone={onRegistrationDone} />)}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>;
}

export default App;
