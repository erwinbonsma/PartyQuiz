import Button from 'react-bootstrap/Button';

import { handleResponse } from '../utils';

export function JoinQuiz({ websocket, playerName, quizId, onQuizJoined }) {
    const joinQuiz = () => {
        handleResponse(websocket, (msg) => {
            onQuizJoined(msg.client_id);
        });

        websocket.send(JSON.stringify({
			action: "join-quiz",
            quiz_id: quizId,
            player_name: playerName,
		}));
    }

    return (
        <Button onClick={joinQuiz}>Join Quiz</Button>
    );
}