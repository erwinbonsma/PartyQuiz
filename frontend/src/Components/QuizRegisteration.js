import Button from 'react-bootstrap/Button';

import { handleResponse } from '../utils';

export function QuizRegistration({ websocket, playerName, quizId, onDone, onCancel }) {
    const registerForQuiz = () => {
        handleResponse(websocket, (msg) => {
            onDone(msg.client_id, msg.quiz_id);
        });

        websocket.send(JSON.stringify({
			action: "register",
            quiz_id: quizId,
            player_name: playerName,
		}));
    }

    return <>
        <p>Name: {playerName}</p>
        <Button onClick={registerForQuiz}>Register</Button>
        <Button onClick={onCancel}>Cancel</Button>
    </>;
}