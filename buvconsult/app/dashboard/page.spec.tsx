//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\dashboard\page.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardIndexPage from './page';
import { before } from 'node:test';



describe('Basic test for Hero component', () => {

    beforeEach(() => {
        render(<DashboardIndexPage />);
    })

    it('Sing button should be in the document', () => {
        const CreateProjectButton= screen.getByRole('button', { name: /Create project/i });
        expect(CreateProjectButton).toBeInTheDocument();
    })



})