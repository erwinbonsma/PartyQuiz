import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

export function QuizSetupStats({ websocket, quizId, players, poolQuestions }) {
    const [latestQuestion, setLatestQuestion] = useState();

    console.info("players: ", players);
    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "question-updated") {
                setLatestQuestion(msg.question);
            }
        };

        websocket.addEventListener('message', messageHandler);

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    const numPlayers = Object.keys(players).length;
    const numQuestions = Object.keys(poolQuestions).length;

    return (<div className="QuizSetupStats">
        <h1>Player Lobby</h1>
        Quiz ID: {quizId}
        <Container className="mb-3">
            <Row>{ Object.entries(players).map(([k, v]) =>
                <Col lg={3} key={k} className="my-2"><PlayerBadge
                    playerName={v.name}
                    avatar={v.avatar}
                    isPresent={v.online}
                    hasQuestion={!!poolQuestions[k]}/>
                </Col>
            )}</Row>
        </Container>
        <Container className="mb-4">
        <h1>Question Pool</h1>
            { (numPlayers > 0)
            && <ProgressBar now={100 * numQuestions / numPlayers} label={`${numQuestions}/${numPlayers}`} />}
            { latestQuestion && <h4>Latest: {latestQuestion}</h4>}
            </Container>
    </div>);
}