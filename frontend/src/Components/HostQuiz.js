import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';

import { QuizSetupStats } from './QuizSetupStats';

export function HostQuiz({ websocket, quizId }) {
    const [quizStarted, setQuizStarted] = useState(false);
    const [viewLobby, setViewLobby] = useState(false);
    const [players, setPlayers] = useState({});
    const [poolQuestions, setPoolQuestions] = useState({});

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

    const startQuiz = () => {
        setQuizStarted(true);
        setViewLobby(false);
    }
    const enterLobby = () => {
        setViewLobby(true);
    }

    return (<div className="HostQuiz">
        { (quizStarted && !viewLobby)
        ? <>
            <p>Quiz started</p>
            <Button onClick={enterLobby}>View Lobby</Button>
        </>
        : <>
            <QuizSetupStats websocket={websocket} quizId={quizId} players={players} poolQuestions={poolQuestions} />
            <Button onClick={startQuiz}>{quizStarted ? "Resume Quiz" : "Start Quiz"}</Button>
        </>}
    </div>);
}