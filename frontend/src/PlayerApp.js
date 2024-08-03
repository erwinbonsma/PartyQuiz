import { useState, useEffect, useMemo } from 'react';
import Button from 'react-bootstrap/Button';

import config from './utils/config';
import { loadValue, storeValue } from './utils';
import { handleResponse } from './utils';

import { PlayQuiz } from './Components/PlayQuiz';
import { QuizRegistration } from './Components/QuizRegistration';
import { SubmitQuestion } from './Components/SubmitQuestion';

export function PlayerApp() {
	const [clientId, setClientId] = useState(useMemo(() => loadValue("clientId"), []));
    const [quizId, setQuizId] = useState(useMemo(() => loadValue("quizId"), []));
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

    // Auto-join quiz (or re-join after disconnect)
    useEffect(() => {
        if (!websocket || !clientId || joinedQuiz) {
            return;
        }

        handleResponse(websocket, () => {
            setErrorMessage(undefined);
            setJoinedQuiz(true);
            fetchPoolQuestion();
        });

        websocket.send(JSON.stringify({
			action: "connect",
            quiz_id: quizId,
            client_id: clientId
		}));
    }, [websocket, clientId, joinedQuiz, quizId]);

    const onRegistrationDone = (clientId, quizId) => {
        setClientId(clientId);
        setQuizId(quizId);

        storeValue("clientId", clientId);
        storeValue("quizId", quizId);
    }
    const onSubmittedQuestion = (question) => {
        setQuestion(question);

        setSubmittedQuestion(true);
        setReviseQuestion(false);
    }

    return <div className="PlayerApp p-3">
        { joinedQuiz
        ? ( (submittedQuestion && !reviseQuestion)
            ? (websocket && <PlayQuiz websocket={websocket} quizId={quizId}
                             onReviseQuestion={() => setReviseQuestion(true)}/>)
            : (websocket && <SubmitQuestion websocket={websocket} quizId={quizId}
                             question={question}
                             onDone={onSubmittedQuestion}
                             enableCancel={reviseQuestion} />))
        : ( quizId
            ? <p>Registered for quiz</p>
            : <QuizRegistration getWebsocket={getWebsocket} clientId={clientId}
               onDone={onRegistrationDone} />)}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>;
}
