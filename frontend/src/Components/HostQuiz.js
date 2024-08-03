import { useEffect, useState } from 'react';

import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';

import { removeFromSet, addToSet } from '../utils';

import { QuizScores } from './QuizScores';
import { PlayerLobby } from './PlayerLobby';
import { QuizQuestion } from './QuizQuestion';

export function HostQuiz({ websocket, quizId, hostId, observe }) {
    const [players, setPlayers] = useState({});
    const [hostConnections, setHostConnections] = useState([]);
    const [poolQuestions, setPoolQuestions] = useState({});
    const [questions, setQuestions] = useState({});
    const [answers, setAnswers] = useState({});
    const [questionId, setQuestionId] = useState(0);
    const [isQuestionOpen, setIsQuestionOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState("lobby");

    console.info({ players, poolQuestions, questions, answers, observe, hostConnections });

    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            console.info(msg);
            if (msg.type === "clients") {
                setPlayers(msg.players);
                setHostConnections(msg.host_connections);
            }
            if (msg.type === "pool-questions") {
                setPoolQuestions(msg.questions);
            }
            if (msg.type === "questions") {
                setQuestions(msg.questions);
                setQuestionId(msg.question_id);
                setIsQuestionOpen(msg.is_question_open);
            }
            if (msg.type === "answers") {
                setAnswers(msg.answers);
            }

            if (msg.type === "player-registered") {
                setPlayers(
                    players => ({ ...players, [msg.client_id]: {
                        name: msg.player_name, avatar: msg.avatar, connections: []
                    }})
                );
            }
            if (msg.type === "client-connected") {
                if (msg.client_id === hostId) {
                    setHostConnections(c => addToSet(c, msg.connection));
                } else {
                    setPlayers(
                        players => ({
                            ...players,
                            [msg.client_id]: {
                                ...players[msg.client_id],
                                connections: addToSet(players[msg.client_id].connections, msg.connection) }})
                    );
                }
            }
            if (msg.type === "client-disconnected") {
                if (msg.client_id === hostId) {
                    setHostConnections(c => removeFromSet(c, msg.connection));
                } else {
                    setPlayers(
                        players => ({
                            ...players,
                            [msg.client_id]: {
                                ...players[msg.client_id],
                                connections: removeFromSet(players[msg.client_id].connections, msg.connection) }})
                    );
                }
            }
            if (msg.type === "pool-question-updated") {
                setPoolQuestions(
                    questions => ({ ...questions, [msg.question.author_id]: msg.question})
                );
            }
            if (msg.type === "question-opened") {
                // Register newly added question
                // Note: This does not include the answer, but that is okay.
                setQuestions(
                    questions => ({ ...questions, [msg.question_id]: msg.question})
                );
                setQuestionId(msg.question_id);
                setIsQuestionOpen(true);
            }
            if (msg.type === "answer-received") {
                setAnswers(
                    answers => ({
                        ...answers, [msg.question_id]: {
                            ...answers[msg.question_id], [msg.player_id]: msg.answer
                        }
                    })
                )
            }
            if (msg.type === "question-closed") {
                setQuestionId(msg.question_id);  // Should not be needed, but no harm
                setIsQuestionOpen(false);
            }

            if (msg.type === "change-view") {
                setCurrentTab(msg.view);
            }
        };

        websocket.addEventListener('message', messageHandler);

        websocket.send(JSON.stringify({
			action: "get-clients",
            quiz_id: quizId,
        }));
        websocket.send(JSON.stringify({
			action: "get-pool-questions",
            quiz_id: quizId,
        }));
        websocket.send(JSON.stringify({
			action: "get-questions",
            quiz_id: quizId,
        }));
        websocket.send(JSON.stringify({
			action: "get-answers",
            quiz_id: quizId,
        }));

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    const onSelect = (key) => {
        if (hostConnections.size > 1) {
            // There are multiple host connections. Let all switch views via back-end
            websocket.send(JSON.stringify({
                action: "notify-hosts",
                message: {
                    type: "change-view",
                    view: key,
                }
            }));
        } else {
            setCurrentTab(key);
        }
    }

    const quizProps = {
        quizId, players, poolQuestions, questions, questionId, isQuestionOpen, answers, observe
    };

    return (<Tab.Container className="HostQuiz" defaultActiveKey="lobby" activeKey={currentTab} onSelect={onSelect}>
        <Row>
            <Col lg={9}>
                <Nav variant="tabs" defaultActiveKey="lobby">
                    <Nav.Item><Nav.Link eventKey="lobby">Lobby</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="question">Question</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="scores">Scores</Nav.Link></Nav.Item>
                </Nav>
            </Col>
            <Col lg={3}>Quiz ID: {quizId}</Col>
        </Row>
        <Row>
            <Tab.Content>
                <Tab.Pane eventKey="lobby">
                    <PlayerLobby websocket={websocket} {...quizProps}/>
                </Tab.Pane>
                <Tab.Pane eventKey="question">
                    <QuizQuestion websocket={websocket} {...quizProps} />
                </Tab.Pane>
                <Tab.Pane eventKey="scores">
                    <QuizScores {...quizProps} />
                </Tab.Pane>
            </Tab.Content>
        </Row>
    </Tab.Container>);
}