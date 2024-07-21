import { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

import { handleResponse } from '../utils';

export function QuizRegistration({ getWebsocket, playerName, quizId, onDone }) {
    const [nameInput, setNameInput] = useState(playerName || '');

	const handleInputChange = (event) => {
		setNameInput(event.target.value);
	};

	const handleRegistration = (event) => {
		event.preventDefault();

        const ws = getWebsocket(register);
    };

    const register = (websocket) => {
        handleResponse(websocket, (msg) => {
            onDone(msg.client_id, msg.quiz_id);
        });

        websocket.send(JSON.stringify({
			action: "register",
            quiz_id: quizId,
            player_name: nameInput,
		}));
    };

    const isFormDataValid = () => {
        return (nameInput.length >= 2 && nameInput.length <= 20);
    };

    return (
        <form onSubmit={handleRegistration} >
            <Container>
                <Row><Col><h1>Registration</h1></Col></Row>
                <Row><Col xs={12} sm={4}><p>Name:</p></Col>
                    <Col xs={12} sm={8}><input size={20} type="text" value={nameInput} onChange={handleInputChange} /></Col></Row>
                <Row className="justify-content-md-center">
                    <Col xs={6} sm={4}><Button type="submit" disabled={!isFormDataValid()} >Register</Button></Col></Row>
            </Container>
        </form>
    );
}