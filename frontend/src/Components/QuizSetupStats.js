import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

export function QuizSetupStats({ websocket, quizId }) {
    const [players, setPlayers] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});
    const [latestQuestion, setLatestQuestion] = useState();

    console.info("players: ", players);
    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            console.info(msg);
            if (msg.type === "players") {
                setPlayers(msg.players);
            }
            if (msg.type === "pool-questions") {
                setPoolQuestions(msg.questions);
            }

            if (msg.type === "player-registered") {
                setPlayers(
                    players => ({ ...players, [msg.client_id]: {
                        name: msg.player_name, avatar: msg.avatar, online: false
                    }})
                );
            }
            if (msg.type === "player-connected") {
                setPlayers(
                    players => ({
                        ...players,
                        [msg.client_id]: { ...players[msg.client_id], online: true }})
                );
            }
            if (msg.type === "player-disconnected") {
                setPlayers(
                    players => ({
                        ...players,
                        [msg.client_id]: { ...players[msg.client_id], online: false }})
                );
            }
            if (msg.type === "question-updated") {
                setPoolQuestions(
                    questions => ({ ...questions, [msg.client_id]: msg.question})
                );
                setLatestQuestion(msg.question);
            }
        };

        websocket.addEventListener('message', messageHandler);

        websocket.send(JSON.stringify({
			action: "get-players",
            quiz_id: quizId,
        }));
        websocket.send(JSON.stringify({
			action: "get-pool-questions",
            quiz_id: quizId,
        }));

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