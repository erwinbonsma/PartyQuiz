import { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';

import config from './utils/config';
import { handleResponse } from './utils';

import { HostQuiz } from './Components/HostQuiz';
import { JoinQuizForm } from './Components/JoinQuizForm';

export function HostApp() {
    const [hostId, setHostId] = useState();
    const [quizId, setQuizId] = useState();
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

    const createQuiz = () => {
        handleResponse(websocket, (msg) => {
            setQuizId(msg.quiz_id);
            setHostId(msg.host_id);
        });

        websocket.send(JSON.stringify({
			action: "create-quiz",
            quiz_name: config.QUIZ_NAME,
            make_default: true,
		}));
    };

    const onJoinedQuiz = ({ quizId, clientId }) => {
        console.info(`Joined quiz ${quizId} as host ${clientId}`);
        setQuizId(quizId);
        setHostId(clientId);
        setJoinedQuiz(true);
    }

    return (<div className="HostApp p-3">
        { joinedQuiz
        ? <HostQuiz websocket={websocket} quizId={quizId} />
        : <Stack gap={3} className="col-md-5 mx-auto">
            <Button className="mx-2" onClick={createQuiz}>Create Quiz</Button>
            <JoinQuizForm websocket={websocket} quizId={quizId} clientId={hostId}
                onJoinedQuiz={onJoinedQuiz} />
        </Stack>}
        { errorMessage
        && <><p>Error: {errorMessage}</p><Button onClick={() => setErrorMessage('')}>Retry</Button></> }
    </div>);
}