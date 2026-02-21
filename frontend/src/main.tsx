import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.scss';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found. Make sure <div id="root"> exists in index.html');
}

ReactDOM.createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
