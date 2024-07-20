import './App.css';
import { useState, useEffect } from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';

function App() {
	const [nameInput, setNameInput] = useState('');
	const [errorMessage, setErrorMessage] = useState();

	const handleInputChange = (event) => {
		setNameInput(event.target.value);
		setErrorMessage('');
	};

	const handleRegistration = (event) => {
		event.preventDefault();

		console.info(`Handle registration of ${nameInput}`);
	}

    return (
    <div className="App">
        <Container>
            <form onSubmit={handleRegistration} >
            <Row><Col><h4>Registration</h4></Col></Row>
            <Row><Col xs={12} sm={4}><p>Name:</p></Col>
                 <Col xs={12} sm={8}><input size={20} type="text" value={nameInput} onChange={handleInputChange} /></Col></Row>
            <Row className="justify-content-md-center">
                <Col xs={6} sm={4}><Button type="submit" disabled={nameInput === '' || nameInput.length > 12} >Join Quiz</Button></Col></Row>
            </form>
            { errorMessage &&
                <Row><Col><p className="Error">{errorMessage}</p></Col></Row>
            }
        </Container>
    </div>
  );
}

export default App;
