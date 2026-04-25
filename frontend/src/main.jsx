import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/app.css';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { BranchProvider } from './features/branches/BranchContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          <App />
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
