import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';

import { QuizStats } from './QuizStats';

export function HostQuiz({ websocket, quizId }) {
    const [viewLobby, setViewLobby] = useState(false);
    const [players, setPlayers] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});
    const [questions, setQuestions] = useState({});

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
            }
            if (msg.type === "question-opened") {
                // Register newly added question
                // Note: This does not include the answer, but that is okay.
                setQuestions(
                    questions => ({ ...questions, [msg.question_id]: msg.question})
                );
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

    const quizStarted = (Object.keys(questions).length > 0);

    return (<div className="HostQuiz">
        { (quizStarted && !viewLobby)
        ? <>
            <p>Quiz started</p>
            <Button onClick={enterLobby}>View Lobby</Button>
        </>
        : <>
            <QuizStats websocket={websocket} quizId={quizId}
             players={players} poolQuestions={poolQuestions} questions={questions} />
            <Button onClick={enterQuiz}>{quizStarted ? "Resume Quiz" : "Start Quiz"}</Button>
        </>}
    </div>);
}