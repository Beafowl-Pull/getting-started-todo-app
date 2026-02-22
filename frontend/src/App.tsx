import type { JSX } from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Navbar from 'react-bootstrap/Navbar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { TodoListCard } from '@components/TodoListCard';
import { Greeting } from '@components/Greeting';
import { AuthScreen } from './components/auth/AuthScreen';
import { UserMenu } from './components/user/UserMenu';

function AppContent(): JSX.Element {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Container>
                <Row>
                    <Col className="text-center mt-5">
                        <p>Loading...</p>
                    </Col>
                </Row>
            </Container>
        );
    }

    if (!user) {
        return (
            <Container>
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        <AuthScreen />
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <>
            <Navbar bg="light" className="mb-3 px-3">
                <Navbar.Brand>Todo App</Navbar.Brand>
                <div className="ms-auto">
                    <UserMenu />
                </div>
            </Navbar>
            <Container>
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        <Greeting />
                        <TodoListCard />
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export function App(): JSX.Element {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
