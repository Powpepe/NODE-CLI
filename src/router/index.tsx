import Home from '@/pages/Home';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
]);
function RouterProviders() {
  return <RouterProvider router={router} />;
}

export default RouterProviders;
