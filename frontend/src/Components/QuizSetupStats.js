import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

export function QuizSetupStats({ websocket, quizId }) {
    const [players, setPlayers] = useState({});
    const [playersPresent, setPlayersPresent] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});

    console.info("players: ", players);
    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            console.info(msg);
            if (msg.type === "players") {
                setPlayers(
                    Object.fromEntries(Object.entries(msg.players).map((
                        [k, v]) => [k, v.name])))
            }
            if (msg.type === "player-registered") {
                setPlayers(
                    players => ({ ...players, [msg.client_id]: msg.player_name })
                );
            }
        };

        websocket.addEventListener('message', messageHandler);

        websocket.send(JSON.stringify({
			action: "get-players",
            quiz_id: quizId,
        }));
        // websocket.send(JSON.stringify({
		// 	action: "get-pool-questions",
        //     quiz_id: quizId,
        // }));

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    return (<div className="QuizSetupStats">
        <Container>
            <Row><Col lg={4}>Players</Col>
                 <Col lg={1}>{Object.keys(players).length}</Col>
                 <Col lg={4}>Questions</Col>
                 <Col lg={1}>{Object.keys(poolQuestions).length}</Col></Row>
            <Row>{ Object.entries(players).map(([k, v]) =>
                <Col lg={3} key={k}>{v}</Col>
            )}</Row>
        </Container>
    </div>);
}