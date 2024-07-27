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
    const numPoolQuestions = Object.keys(poolQuestions).length;
    const numQuestions = Object.keys(questions).length;

    return (<div className="QuizSetupStats">
        <Container className="mb-3">
            <Row>
                <Col lg={2} />
                <Col lg={8}><h1>Player Lobby</h1></Col>
                <Col lg={2}>Quiz ID: {quizId}</Col>
            </Row>
            <Row>{ Object.entries(players).map(([k, v]) =>
                <Col lg={3} key={k} className="my-2"><PlayerBadge
                    playerName={v.name}
                    avatar={v.avatar}
                    status={{ isPresent: v.online, hasQuestion: !!poolQuestions[k] }} />
                </Col>
            )}</Row>
        </Container>
        { (numPoolQuestions > 0) &&
            <Container className="mb-4">
                <h2>Question Pool</h2>
                <ProgressBar now={100 * numPoolQuestions / numPlayers} label={`${numPoolQuestions}/${numPlayers}`} />
                { latestQuestion && <h4>Latest: {latestQuestion.question}</h4>}
            </Container>}
        { (numQuestions > 0) &&
            <Container className="mb-4">
                <h2>Quiz Progress</h2>
                <ProgressBar now={100 * numQuestions / numPoolQuestions} label={`${numQuestions}/${numPoolQuestions}`} />
            </Container>}
    </div>);
}