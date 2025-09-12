import { render, screen, fireEvent } from '@testing-library/react';
import { Hero } from './Hero';
import { before } from 'node:test';



describe('Basic test for Hero component', () => {

    beforeEach(() => {
        render(<Hero />);
    })

    it('Sing button should be in the document', () => {
        const signInButton = screen.getByRole('button', { name: /sign in/i });
        expect(signInButton).toBeInTheDocument();
    })



})