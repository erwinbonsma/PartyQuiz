import { useState } from 'react';

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';

export function RegistrationForm({ playerName, onDone }) {
    const [nameInput, setNameInput] = useState(playerName || '');

	const handleInputChange = (event) => {
		setNameInput(event.target.value);
	};

	const handleRegistration = (event) => {
		event.preventDefault();

        onDone(nameInput);
	};

    return (
        <form onSubmit={handleRegistration} >
            <Container>
                <Row><Col><h4>Registration</h4></Col></Row>
                <Row><Col xs={12} sm={4}><p>Name:</p></Col>
                    <Col xs={12} sm={8}><input size={20} type="text" value={nameInput} onChange={handleInputChange} /></Col></Row>
                <Row className="justify-content-md-center">
                    <Col xs={6} sm={4}><Button type="submit" disabled={nameInput.length < 2 || nameInput.length > 20} >OK</Button></Col></Row>
            </Container>
        </form>
    );
}