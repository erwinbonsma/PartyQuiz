import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';

import { QuizStats } from './QuizStats';
import { QuizQuestion } from './QuizQuestion';

export function HostQuiz({ websocket, quizId }) {
    const [viewLobby, setViewLobby] = useState(true);
    const [players, setPlayers] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});
    const [questions, setQuestions] = useState({});
    const [questionId, setQuestionId] = useState(0);
    const [isQuestionOpen, setIsQuestionOpen] = useState(false);

    console.info({ poolQuestions });

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

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, []);

    const enterQuiz = () => {
        setViewLobby(false);
    }
    const enterLobby = () => {
        setViewLobby(true);
    }

    const quizStarted = questionId != 0;
    const quizProps = { quizId, players, poolQuestions, questions, questionId, isQuestionOpen };

    return (<div className="HostQuiz">
        { !viewLobby
        ? <>
            <QuizQuestion websocket={websocket} {...quizProps} />
            <Button onClick={enterLobby}>View Lobby</Button>
        </>
        : <>
            <QuizStats websocket={websocket} quizId={quizId}
             players={players} poolQuestions={poolQuestions} questions={questions} />
            <Button onClick={enterQuiz}>{quizStarted ? "Resume Quiz" : "Start Quiz"}</Button>
        </>}
    </div>);
}