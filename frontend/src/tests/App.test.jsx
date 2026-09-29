import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../components/common/Toast';
import React from 'react';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    );
    expect(document.body).toBeDefined();
  });
});
