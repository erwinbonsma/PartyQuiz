import { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';

export function SubmitQuestion({ websocket, quizId, onDone }) {
    const choices = Array(config.NUM_CHOICES).fill(0).map((_, idx) => idx + 1);

    return <>
        <h1>Your Question</h1>
        <Form>
            <Form.Group as={Row} controlId="formQuestion">
                <Col sm={0} lg={2} xl={3} />
                <Form.Label column sm={2} xl={1}>Question</Form.Label>
                <Col sm={9} lg={6} xl={5}>
                    <Form.Control as="textarea" rows={3} />
                </Col>
            </Form.Group>
            <br/>
            { choices.map((choice, _) => <>
                <Form.Group as={Row} controlId={`formAnswerGroup-${choice}`}>
                    <Col sm={0} lg={2} xl={3} />
                    <Form.Label column sm={2} xl={1}>Answer {choice}</Form.Label>
                    <Col sm={9} lg={6} xl={5}>
                        <Form.Control type="input" controlId={`formAnswer-${choice}`} />
                    </Col>
                </Form.Group>
                <br/>
            </>)}
            <Form.Group as={Row}>
                <Col sm={0} lg={2} xl={3} />
                <Form.Label column sm={2} xl={1}>Solution</Form.Label>
                <Col sm={9} lg={6} xl={5}>
                    <Form.Select>
                    { choices.map((choice, _) =>
                        <option value={choice}>Answer {choice}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>
            <br/>
            <Button onClick={onDone}>Submit Question</Button>
        </Form>
    </>;
}
