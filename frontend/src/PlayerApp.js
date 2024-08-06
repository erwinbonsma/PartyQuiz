import { useState, useEffect, useMemo } from 'react';
import Button from 'react-bootstrap/Button';

import config from './utils/config';
import { loadValue, storeValue } from './utils';
import { handleResponse } from './utils';

import { PlayQuiz } from './Components/PlayQuiz';
import { QuizRegistration } from './Components/QuizRegistration';
import { SubmitQuestion } from './Components/SubmitQuestion';

function loadClientId() {
    return loadValue("clientId");
}

function loadPlayerName() {
    return loadValue("playerName");
}

export function PlayerApp() {
	const [clientId, setClientId] = useState(useMemo(loadClientId, []));
    const [playerName, setPlayerName] = useState(useMemo(loadPlayerName, []));
    const [quizId, setQuizId] = useState();
    const [quizName, setQuizName] = useState();
    const [joinedQuiz, setJoinedQuiz] = useState(false);
    const [submittedQuestion, setSubmittedQuestion] = useState(false);
    const [reviseQuestion, setReviseQuestion] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();
    const [question, setQuestion] = useState();

    const createWebsocket = (onOpen) => {
        // Create WebSocket connection.
		const socket = new WebSocket(config.SERVICE_ENDPOINT);

		// Connection opened
		socket.addEventListener('open', () => {
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
        if (!websocket || !quizId || joinedQuiz) {
            return;
        }

        const fetchPoolQuestion = () => {
            handleResponse(websocket, (msg) => {
                setQuestion(msg.question);
                setSubmittedQuestion(true);
            });

            websocket.send(JSON.stringify({
                action: "get-pool-question",
                quiz_id: quizId,
            }));
        }

        handleResponse(websocket, (msg) => {
            setErrorMessage(undefined);
            setJoinedQuiz(true);
            setQuizName(msg.quiz_name);
            fetchPoolQuestion();
        });

        websocket.send(JSON.stringify({
			action: "connect",
            quiz_id: quizId,
            client_id: clientId
		}));
    }, [websocket, clientId, quizId, joinedQuiz, quizId]);

    const onRegistrationDone = ({ clientId, quizId, playerName }) => {
        setQuizId(quizId);
        setClientId(clientId);
        setPlayerName(playerName);

        storeValue("clientId", clientId);
        storeValue("playerName", playerName);
    }
    const onSubmittedQuestion = (question) => {
        setQuestion(question);

        setSubmittedQuestion(true);
        setReviseQuestion(false);
    }

    const getWebsocket = (onOpen) => {
        if (websocket) {
            onOpen(websocket);
        } else {
            createWebsocket(onOpen);
        }
    };

    return <div className="PlayerApp p-3">
        { joinedQuiz
        ? <>
            <h1 className="PageHeader">{quizName}</h1>
            { (submittedQuestion && !reviseQuestion)
            ? (websocket && <PlayQuiz websocket={websocket} quizId={quizId}
                             onReviseQuestion={() => setReviseQuestion(true)}/>)
            : (websocket && <SubmitQuestion websocket={websocket} quizId={quizId}
                             question={question}
                             onDone={onSubmittedQuestion}
                             enableCancel={reviseQuestion} />)}
        </>
        : ( quizId
            ? <p>Registered for quiz</p>
            : <QuizRegistration getWebsocket={getWebsocket} clientId={clientId} playerName={playerName}
               onDone={onRegistrationDone} />)}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>;
}
