import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

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
                    players => ({ ...players, [msg.client_id]: {
                        name: msg.player_name, avatar: msg.avatar
                    }})
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
        <h1>Player Lobby</h1>
        <h4>{Object.keys(players).length} players, {Object.keys(poolQuestions).length} questions</h4>
        <Container>
            <Row>{ Object.entries(players).map(([k, v]) =>
                <Col lg={3} key={k} className="my-2"><PlayerBadge
                    playerName={v.name}
                    avatar={v.avatar}
                    isPresent={playersPresent[k]}
                    hasQuestion={poolQuestions[k]}/>
                </Col>
            )}</Row>
        </Container>
    </div>);
}