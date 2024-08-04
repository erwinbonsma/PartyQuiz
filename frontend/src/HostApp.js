import { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';

import config from './utils/config';

import { CreateQuizForm } from './Components/CreateQuizForm';
import { HostQuiz } from './Components/HostQuiz';
import { JoinQuizForm } from './Components/JoinQuizForm';

export function HostApp() {
    const [hostId, setHostId] = useState();
    const [quizId, setQuizId] = useState();
    const [quizName, setQuizName] = useState();
    const [defaultQuizId, setDefaultQuizId] = useState();
    const [observe, setObserve] = useState(false);
    const [joinedQuiz, setJoinedQuiz] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();

    const createWebsocket = () => {
        // Create WebSocket connection.
		const socket = new WebSocket(config.SERVICE_ENDPOINT);

		// Connection opened
		socket.addEventListener('open', () => {
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

        return socket;
    }

    useEffect(() => {
        // Create websocket when not yet set, and there is no error.
        // User can try to recreate socket after failure by clearing error.
        if (errorMessage) {
			return
		}

        if (!websocket) {
            createWebsocket();
        } else {
            return function cleanup() {
                console.log("Closing websocket");
                setWebsocket(undefined);
                websocket.close();
            }
        }
    }, [websocket, errorMessage])

    const onCreatedQuiz = ({ quizId, hostId, isDefault }) => {
        setQuizId(quizId);
        setHostId(hostId);
        if (isDefault) {
            setDefaultQuizId(quizId);
        }
    };

    const onJoinedQuiz = ({ quizId, quizName, clientId, observe }) => {
        console.info(`Joined quiz ${quizId} as host ${clientId} (observe=${observe})`);
        setQuizId(quizId);
        setQuizName(quizName);
        setHostId(clientId);
        setObserve(observe);
        setJoinedQuiz(true);
    }

    return (<div className="HostApp p-3">
        { websocket &&
            ( joinedQuiz
            ? <HostQuiz websocket={websocket} quizId={quizId} quizName={quizName} hostId={hostId} observe={observe} />
            : <Stack gap={4} className="col-lg-9 col-xl-6 mx-auto">
                <h1>Quiz Host Control Center</h1>
                <CreateQuizForm websocket={websocket} onCreatedQuiz={onCreatedQuiz} />
                <JoinQuizForm websocket={websocket} quizId={quizId} clientId={hostId} defaultQuizId={defaultQuizId}
                    onJoinedQuiz={onJoinedQuiz} />
            </Stack>)}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>);
}