import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { addToSet, labelForChoiceIndex, isNotEmpty } from '../utils';

import { AnswerChoice } from './AnswerChoice';
import { PlayerBadge } from './PlayerBadge';

export function QuizQuestion({
    websocket, quizId, players, poolQuestions, questions, questionId, isQuestionOpen, answers, observe
}) {
    const [skippedAuthors, setSkippedAuthors] = useState(new Set());
    const [quarantinedQuestion, setQuarantinedQuestion] = useState();

    const questionAuthors = new Set(Object.entries(questions).map(([_, v]) => v.author_id));
    const availableQuestions = Object.values(poolQuestions).filter((question) => (
        // Question by author should not already have been asked
        !questionAuthors.has(question.author_id)
        // Author should not have failed quarantine check
        && !skippedAuthors.has(question.author_id)
    ));

    const closeQuestion = () => {
        websocket.send(JSON.stringify({
            action: "close-question",
            quiz_id: quizId
        }));
    };
    const openQuestion = (question) => {
        websocket.send(JSON.stringify({
            action: "open-question",
            quiz_id: quizId,
            ...question
        }));
    }
    const gotoNextQuestion = () => {
        const nextQuestion = availableQuestions[0];
        const isAuthorOnline = isNotEmpty(players[nextQuestion.author_id].connections);

        if (isAuthorOnline) {
            openQuestion(nextQuestion);
        } else {
            setQuarantinedQuestion(nextQuestion);
        }
    };

    const onQuarantinePass = () => {
        openQuestion(quarantinedQuestion);

        // Note: only unsetting quarantine question on confirmation from backend.
        // This avoids temporary flicker to previous question.
    };
    const onQuarantineSkip = () => {
        setSkippedAuthors(c => addToSet(c, quarantinedQuestion.author_id));
        setQuarantinedQuestion(undefined);
    };

    useEffect(() => {
        if (isQuestionOpen && quarantinedQuestion) {
            setQuarantinedQuestion(undefined);
        }
    }, [isQuestionOpen, quarantinedQuestion]);

    const q = quarantinedQuestion || questions[questionId];
    const numPlayers = Object.keys(players).length;
    const a = answers[questionId] || {};
    const numAnswers = Object.keys(a).length;
    const nextQuestionLabel = questionId === 0 ? "Start Quiz" : "Next Question";

    return (<div className="QuizQuestion">
        { q && <>
            <Container className="p-3">
                <Row>
                    <Col md={4} lg={3}/>
                    <Col md={4} lg={6} >
                        { quarantinedQuestion
                        ? <h2>Candidate Question</h2>
                        : <h2>Question {questionId}</h2>}</Col>
                    { players[q.author_id] && <Col md={4} lg={3} >
                        <PlayerBadge playerName={ players[q.author_id].name }
                         avatar={ players[q.author_id].avatar }
                         status={ quarantinedQuestion ? { isPresent: false } : undefined }/>
                    </Col>}
                </Row>
                <Row>
                    <div className="Question">{q.question}</div>
                </Row>
                { isQuestionOpen || quarantinedQuestion
                ? <>
                    <Row>{ q.choices.map((choice, idx) =>
                        <Col lg={6} key={idx} className="p-2">
                            <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}/>
                        </Col>
                    )}</Row>
                    { isQuestionOpen &&
                        <Row>
                            <Col>
                                <ProgressBar now={100 * numAnswers / numPlayers} label={`${numAnswers}/${numPlayers}`}/>
                            </Col>
                        </Row>}
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
        { !observe && (
            quarantinedQuestion
            ? <Row className="justify-content-md-center">
                <Col md="auto">
                    <Button onClick={onQuarantinePass}>Open Question</Button>
                </Col>
                <Col md="auto">
                    <Button onClick={onQuarantineSkip}>Skip Question</Button>
                </Col>
            </Row>
            : ( isQuestionOpen
                ? <Button onClick={closeQuestion}>Close Question</Button>
                : <Button onClick={gotoNextQuestion} disabled={availableQuestions.length === 0}>
                    {nextQuestionLabel}
                </Button>))}
    </div>);
}