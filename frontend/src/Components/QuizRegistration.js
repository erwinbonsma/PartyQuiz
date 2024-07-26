import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { handleResponse } from '../utils';

export function QuizRegistration({ getWebsocket, playerName, quizId, onDone }) {
    const {register, handleSubmit, formState: { errors }} = useForm();

    const onSubmit = (data) => {
        console.info("data", data);

        const onRegister = (websocket) => {
            console.info("Registering");
            handleResponse(websocket, (msg) => {
                onDone(msg.client_id, msg.quiz_id);
            });

            websocket.send(JSON.stringify({
                action: "register",
                quiz_id: quizId,
                player_name: data.name,
                avatar: data.avatar,
            }));
        };

        getWebsocket(onRegister);
    };

    const avatarOptions = {
        "family": "Family",
        "high school": "R.S.G.",
        "university": "7-2",
        "ai": "Edinburgh",
        "tennis": "Tennis",
        "go": "Go",
        "board games": "Board games",
    };

    return <>
        <h1>Registration</h1>
        <Form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-2">
            <Form.Group as={Row}>
                <Form.Label column sm={5}>Name</Form.Label>
                <Col sm={7}>
                    <Form.Control type="input"
                     isInvalid={!!errors.name}
                     value={playerName}
                     {...register("name", { required: true, maxLength: 12 })}/>
                    {errors.name?.type === "required" && (
                        <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                    )}
                    {errors.name?.type === "maxLength" && (
                        <Form.Control.Feedback type="invalid">Max length exceeded</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            <br/>
            <Form.Group as={Row}>
                <Form.Label column sm={5}>Where do you know Erwin from?</Form.Label>
                <Col sm={7}>
                    <Form.Select defaultValue=""
                     {...register("avatar", { required: true, minLength: 1 })}>
                    <option disabled value="">Please select</option>
                    { Object.entries(avatarOptions).map(([k, v]) =>
                        <option value={k} key={k}>{v}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>
            <br/>
            <Button type="submit">Register</Button>
        </Form>
    </>;
}