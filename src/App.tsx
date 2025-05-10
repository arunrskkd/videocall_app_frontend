import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

// Import pages
import Dashboard from './pages/room/Dashboard';
import CreateRoom from './pages/room/CreateRoom';
import EnterRoom from './pages/room/EnterRoom';
import RoomDetail from './pages/room/RoomDetail';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/room/dashboard" element={<Dashboard />} />
          <Route path="/room/create" element={<CreateRoom />} />
          <Route path="/room/enter" element={<EnterRoom />} />
          <Route path="/room/:roomId" element={<RoomDetail />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
