import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BooksPage from './pages/BooksPage';
import BookPage from './pages/BookPage';
import ReadPage from './pages/ReadPage';
import JobsPage from './pages/JobsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BooksPage />} />
        <Route path="/books/:id" element={<BookPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/books/:id/read/:n" element={<ReadPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
