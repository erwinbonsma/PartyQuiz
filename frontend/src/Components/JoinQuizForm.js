import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { handleResponse } from '../utils';

export function JoinQuizForm({ websocket, clientId, quizId, defaultQuizId, onJoinedQuiz }) {
    const {register, handleSubmit, setValue, watch, formState: { errors }} = useForm();
    const [joinError, setJoinError] = useState();

    useEffect(() => {
        setValue("clientId", clientId);
        setValue("quizId", quizId);
    }, [clientId, quizId]);

    const watchedQuizId = watch("quizId");
    const isDefault = defaultQuizId && (watchedQuizId === defaultQuizId);

    const handleJoin = (asObserver) => ((data) => {
        console.info("Joining quiz");
        handleResponse(websocket, (msg) => {
            onJoinedQuiz({
                quizId: data.quizId,
                quizName: msg.quiz_name,
                clientId: data.clientId,
                observe: asObserver,
            });
        }, (msg) => {
            setJoinError(msg.details || `Error code ${msg.error_code}`)
        });

        setJoinError(undefined);
        websocket.send(JSON.stringify({
            action: "connect",
            quiz_id: data.quizId,
            client_id: data.clientId,
		}));
    });

    return <>
        <Form noValidate className="mx-2">
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>Client ID</Form.Label>
                <Col sm={6}>
                    <Form.Control type="input"
                    isInvalid={!!errors.clientId}
                    {...register("clientId", { required: true })}/>
                    {errors.clientId && (
                        <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3 align-items-center">
                <Form.Label column sm={3}>Quiz ID</Form.Label>
                <Col sm={6}>
                    <Form.Control type="input"
                    isInvalid={!!errors.quizId}
                    {...register("quizId", { required: true })}/>
                    {errors.quizId && (
                        <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                    )}
                </Col>
                { isDefault && <Col sm={2}>(default)</Col> }
            </Form.Group>
            <Row className="justify-content-md-center">
                <Col md="auto">
                    <Button onClick={handleSubmit(handleJoin(false))}>Host Quiz</Button>
                </Col>
                <Col md="auto">
                    <Button onClick={handleSubmit(handleJoin(true))}>Observe Quiz</Button>
                </Col>
            </Row>
            { joinError && <p>Error: {joinError}</p>}
        </Form>
    </>;
}