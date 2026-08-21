import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Применяем сохранённую тему при старте
const savedTheme = localStorage.getItem('mlp:theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else {
  document.documentElement.setAttribute('data-theme', 'light');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);