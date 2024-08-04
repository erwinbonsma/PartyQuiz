import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { handleResponse } from '../utils';

export function CreateQuizForm({ websocket, onCreatedQuiz }) {
    const {register, handleSubmit, formState: { errors }} = useForm();
    const [createError, setCreateError] = useState();

    const handleCreate = (data) => {
        handleResponse(websocket, (msg) => {
            onCreatedQuiz({
                quizId: msg.quiz_id,
                hostId: msg.host_id,
                isDefault: msg.is_default,
            })},
            (msg) => {
                setCreateError(msg.details || `Error code ${msg.error_code}`)
            });

        const msg = {
			action: "create-quiz",
            quiz_name: data.quizName,
            try_make_default: true,
		}
        if (data.hostId) {
            msg.host_id = data.hostId;
        }

        websocket.send(JSON.stringify(msg));
    };

    return <>
        <Form noValidate onSubmit={handleSubmit(handleCreate)} className="mx-2">
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>Quiz name</Form.Label>
                <Col sm={6}>
                    <Form.Control type="input"
                    isInvalid={!!errors.quizName}
                    {...register("quizName", { maxLength: 20 })}/>
                    {errors.quizName?.type === "maxLength" && (
                        <Form.Control.Feedback type="invalid">Name is too long</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>Host ID</Form.Label>
                <Col sm={6}>
                    <Form.Control type="input"
                    isInvalid={!!errors.hostId}
                    {...register("hostId", { maxLength: 12 })}/>
                    {errors.hostId?.type === "maxLength" && (
                        <Form.Control.Feedback type="invalid">ID is too long</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            <Button type="submit">Create Quiz</Button>
            { createError && <p>Error: {createError}</p>}
        </Form>
    </>;
}