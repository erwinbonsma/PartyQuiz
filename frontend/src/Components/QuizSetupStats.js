import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

export function QuizSetupStats({ websocket, quizId }) {
    const [numPlayers, setNumPlayers] = useState(0);
    const [numPlayersPresent, setNumPlayersPresent] = useState(0);
    const [numPoolQuestions, setNumPoolQuestions] = useState(0);

    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "status") {
                setNumPlayers(msg.num_players);
                setNumPlayersPresent(msg.num_players_present);
                setNumPoolQuestions(msg.question_pool_size);
            }
        };

        websocket.addEventListener('message', messageHandler);

        websocket.send(JSON.stringify({
			action: "get-status",
            quiz_id: quizId,
        }));

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    return (<div className="QuizSetupStats">
        <Container>
            <Row><Col lg={4}>Players</Col>
                 <Col lg={1}>{numPlayers}/{numPlayersPresent}</Col>
                 <Col lg={4}>Questions</Col>
                 <Col lg={1}>{numPoolQuestions}</Col></Row>
        </Container>
    </div>);
}