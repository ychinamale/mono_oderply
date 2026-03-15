import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './AppRoutes.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
