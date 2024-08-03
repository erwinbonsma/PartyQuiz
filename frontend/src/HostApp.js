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
    const [defaultQuizId, setDefaultQuizId] = useState();
    const [observe, setObserve] = useState(false);
    const [joinedQuiz, setJoinedQuiz] = useState(false);
	const [errorMessage, setErrorMessage] = useState();
	const [websocket, setWebsocket] = useState();

    useEffect(() => {
        // Create websocket when not yet set, and there is no error.
        // User can try to recreate socket after failure by clearing error.
        if (websocket || errorMessage) {
			return
		}

        console.log("Opening websocket");
        let cleanupInvoked = false;
        let socket = new WebSocket(config.SERVICE_ENDPOINT);

        const unsetSocket = () => {
            if (socket) {
                console.info("Disconnected from server");
                setWebsocket(undefined);
                setJoinedQuiz(false);
                // Clear (to avoid trigger by clean-up after error)
                socket = undefined;
            }
        }
        const closeSocket = (reason) => {
            console.log(`Closing websocket (${reason})`);
            socket?.close();
        }

        // Add this before socket is opened, as it also fires when there is a
        // failure to open the socket.
        socket.addEventListener('error', () => {
            if (!cleanupInvoked) {
                setErrorMessage("Disconnected from server");
                closeSocket("error");
            }
        });

        // Connection opened
        socket.addEventListener('open', () => {
            if (cleanupInvoked) {
                // Ignore open when this happened after cleanup.
                // This can happen in development, where useEffect is invoked twice.
            }

            console.log("Opened websocket");
            setWebsocket(socket);
            socket.addEventListener('close', unsetSocket);
        });

        return function cleanup() {
            cleanupInvoked = true;
            closeSocket("cleanup");
        }
    }, [errorMessage]);

    const onCreatedQuiz = ({ quizId, hostId, isDefault }) => {
        setQuizId(quizId);
        setHostId(hostId);
        if (isDefault) {
            setDefaultQuizId(quizId);
        }
    };

    const onJoinedQuiz = ({ quizId, clientId, observe }) => {
        console.info(`Joined quiz ${quizId} as host ${clientId} (observe=${observe})`);
        setQuizId(quizId);
        setHostId(clientId);
        setObserve(observe);
        setJoinedQuiz(true);
    }

    return (<div className="HostApp p-3">
        { joinedQuiz
        ? <HostQuiz websocket={websocket} quizId={quizId} hostId={hostId} observe={observe} />
        : <Stack gap={3} className="col-lg-9 col-xl-6 mx-auto">
            <CreateQuizForm websocket={websocket} onCreatedQuiz={onCreatedQuiz} />
            <JoinQuizForm websocket={websocket} quizId={quizId} clientId={hostId} defaultQuizId={defaultQuizId}
                onJoinedQuiz={onJoinedQuiz} />
        </Stack>}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>);
}