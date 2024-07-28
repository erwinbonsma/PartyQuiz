import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

export function QuizStats({ websocket, quizId, players, poolQuestions, questions }) {
    const [latestQuestion, setLatestQuestion] = useState();

    console.info("players: ", players);
    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "pool-question-updated") {
                setLatestQuestion(msg.question);
            }
        };

        websocket.addEventListener('message', messageHandler);

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    const numPlayers = Object.keys(players).length;

    return (<div className="QuizSetupStats">
        { (numPlayers > 0) &&
            <Container className="mb-3">
                <Row>
                    <h2>Players</h2>
                </Row>
                <Row>{ Object.entries(players).map(([k, v]) =>
                    <Col lg={3} key={k} className="my-2"><PlayerBadge
                        playerName={v.name}
                        avatar={v.avatar}
                        status={{ isPresent: v.online, hasQuestion: !!poolQuestions[k] }} />
                    </Col>
                )}</Row>
            </Container>}
    </div>);
}