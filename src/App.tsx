import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { ConversationPage } from './pages/ConversationPage';
import { SearchPage } from './pages/SearchPage';
import { StatsPage } from './pages/StatsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/conversation/:id" element={<ConversationPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
