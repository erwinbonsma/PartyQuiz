import { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';
import { handleResponse } from '../utils';

export function SubmitQuestion({ websocket, quizId, onDone }) {
    const [validated, setValidated] = useState(false);
	const [errorMessage, setErrorMessage] = useState();

    const choices = Array(config.NUM_CHOICES).fill(0).map((_, idx) => idx + 1);

    const handleSubmit = (event) => {
        const form = event.currentTarget;
        event.preventDefault();
        event.stopPropagation();

        if (form.checkValidity()) {
            setErrorMessage(undefined);

            handleResponse(websocket,
                () => { onDone(); },
                (msg) => { setErrorMessage(msg.details); }
            );

            websocket.send(JSON.stringify({
                action: "set-pool-question",
                quiz_id: quizId,
                question: form.question.value,
                // TODO: Get dynamically
                choices: [form.choice_1.value, form.choice_2.value, form.choice_3.value, form.choice_4.value],
                answer: parseInt(form.answer.value)
            }));
        }

        setValidated(true);
    };

    return <>
        <h1>Your Question</h1>
        <Form onSubmit={handleSubmit} noValidate validated={validated}>
            <Form.Group as={Row}>
                <Col sm={0} lg={2} xl={3} />
                <Form.Label column sm={2} xl={1}>Question</Form.Label>
                <Col sm={9} lg={6} xl={5}>
                    <Form.Control as="textarea" rows={3} required name="question" />
                    <Form.Control.Feedback type="invalid">Question must be non-empty</Form.Control.Feedback>
                </Col>
            </Form.Group>
            <br/>
            { choices.map((choice, _) => <div key={choice}>
                <Form.Group as={Row}>
                    <Col sm={0} lg={2} xl={3} />
                    <Form.Label column sm={2} xl={1}>Answer {choice}</Form.Label>
                    <Col sm={9} lg={6} xl={5}>
                        <Form.Control type="input" name={`choice_${choice}`} required />
                        <Form.Control.Feedback type="invalid">Answer must be non-empty</Form.Control.Feedback>
                    </Col>
                </Form.Group>
                <br/>
            </div>)}
            <Form.Group as={Row}>
                <Col sm={0} lg={2} xl={3} />
                <Form.Label column sm={2} xl={1}>Solution</Form.Label>
                <Col sm={9} lg={6} xl={5}>
                    <Form.Select name="answer">
                    { choices.map((choice, _) =>
                        <option value={choice} key={choice}>Answer {choice}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>
            <br/>
            <Button type="submit">Submit Question</Button>
        </Form>
        { errorMessage
        && <p>Error in question: {errorMessage}</p> }
    </>;
}
