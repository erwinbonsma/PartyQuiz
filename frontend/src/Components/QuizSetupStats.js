import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

export function QuizSetupStats({ websocket, quizId }) {
    const [players, setPlayers] = useState({});
    const [playersPresent, setPlayersPresent] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});
    const [latestQuestion, setLatestQuestion] = useState();

    console.info("players: ", players);
    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            console.info(msg);
            if (msg.type === "players") {
                setPlayers(
                    Object.fromEntries(Object.entries(msg.players).map((
                        [k, v]) => [k, {name: v.name, avatar: v.avatar}])));
                setPlayersPresent(
                    Object.fromEntries(Object.entries(msg.players).map((
                        [k, v]) => [k, v.online])));
            }
            if (msg.type === "pool-questions") {
                setPoolQuestions(
                    Object.fromEntries(Object.entries(msg.questions).map((
                        [k, v]) => [k, v.question])));
            }

            if (msg.type === "player-registered") {
                setPlayers(
                    players => ({ ...players, [msg.client_id]: {
                        name: msg.player_name, avatar: msg.avatar
                    }})
                );
            }
            if (msg.type === "player-connected") {
                setPlayersPresent(
                    playersPresent => ({ ...playersPresent, [msg.client_id]: true })
                );
            }
            if (msg.type === "player-disconnected") {
                setPlayersPresent(
                    playersPresent => ({ ...playersPresent, [msg.client_id]: false })
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

    return (<div className="QuizSetupStats">
        <h1>Player Lobby</h1>
        {Object.keys(players).length} players
        <Container className="mb-3">
            <Row>{ Object.entries(players).map(([k, v]) =>
                <Col lg={3} key={k} className="my-2"><PlayerBadge
                    playerName={v.name}
                    avatar={v.avatar}
                    isPresent={playersPresent[k]}
                    hasQuestion={poolQuestions[k]}/>
                </Col>
            )}</Row>
        </Container>
        <Container className="mb-4">
        <h1>Question Pool</h1>
            <div className="mb-1">{Object.keys(poolQuestions).length} questions</div>
            <h4>Latest: {latestQuestion}</h4>
            </Container>
    </div>);
}