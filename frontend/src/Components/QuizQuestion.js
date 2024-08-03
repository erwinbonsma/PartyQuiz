import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { labelForChoiceIndex } from '../utils';

import { AnswerChoice } from './AnswerChoice';
import { PlayerBadge } from './PlayerBadge';

export function QuizQuestion({
    websocket, quizId, players, poolQuestions, questions, questionId, isQuestionOpen, answers, observe
}) {

    console.info({ players, poolQuestions, questions, answers, observe });
    const questionAuthors = Object.fromEntries(Object.entries(questions).map(
        ([_, v]) => [v.author_id, true]
    ));
    const availableQuestions = Object.values(poolQuestions).filter((question) => (
        !questionAuthors[question.author_id] && players[question.author_id].online
    ));

    const closeQuestion = () => {
        websocket.send(JSON.stringify({
            action: "close-question",
            quiz_id: quizId
        }));
    };
    const gotoNextQuestion = () => {
        const nextQuestion = availableQuestions[0];

        websocket.send(JSON.stringify({
            action: "open-question",
            quiz_id: quizId,
            ...nextQuestion
        }));
    };

    const q = questions[questionId];
    const numPlayers = Object.keys(players).length;
    const a = answers[questionId] || {};
    const numAnswers = Object.keys(a).length;
    const nextQuestionLabel = questionId === 0 ? "Start Quiz" : "Next Question";

    return (<div className="QuizQuestion">
        { q && <>
            <Container className="p-3">
                <Row>
                    <Col md={4} lg={3}/>
                    <Col md={4} lg={6} ><h1>Question {questionId}</h1></Col>
                    <Col md={4} lg={3} ><PlayerBadge
                                  playerName={ players[q.author_id].name }
                                  avatar={ players[q.author_id].avatar } /></Col>
                </Row>
                <Row>
                    <div className="Question">{q.question}</div>
                </Row>
                { isQuestionOpen
                ? <>
                    <Row>{ q.choices.map((choice, idx) =>
                        <Col lg={6} key={idx} className="p-2">
                            <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}/>
                        </Col>
                    )}</Row>
                    <Row>
                        <Col>
                            <ProgressBar now={100 * numAnswers / numPlayers} label={`${numAnswers}/${numPlayers}`}/>
                        </Col>
                    </Row>
                </>
                : q.choices.map((choice, idx) => {
                    const n = Object.values(a).filter((answer) => (answer === idx + 1)).length;

                    return <Row key={idx}>
                        <Col lg={12} className="p-2">
                            <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}
                             isCorrect={ q.answer === idx + 1} />
                            { numAnswers > 0 && <ProgressBar now={100 * n / numAnswers} label={n} /> }
                        </Col>
                    </Row>
                })}
            </Container>
        </>}
        { !observe && ( isQuestionOpen
            ? <Button onClick={closeQuestion}>Close Question</Button>
            : <Button onClick={gotoNextQuestion} disabled={availableQuestions.length === 0}>
                {nextQuestionLabel}
            </Button>)}
    </div>);
}