import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import AppRoutes from '../../AppRoutes.tsx';

describe('NotFound', () => {
  it('renders 404 page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/some/garbage/path']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument();
  });
});
