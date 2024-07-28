import { useEffect, useState } from 'react';

import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';

import { QuizScores } from './QuizScores';
import { PlayerLobby } from './PlayerLobby';
import { QuizQuestion } from './QuizQuestion';

export function HostQuiz({ websocket, quizId }) {
    const [players, setPlayers] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});
    const [questions, setQuestions] = useState({});
    const [answers, setAnswers] = useState({});
    const [questionId, setQuestionId] = useState(0);
    const [isQuestionOpen, setIsQuestionOpen] = useState(false);

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

    const quizProps = {
        quizId, players, poolQuestions, questions, questionId, isQuestionOpen, answers
    };

    return (<Tab.Container className="HostQuiz" defaultActiveKey="lobby">
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