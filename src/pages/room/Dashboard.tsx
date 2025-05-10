import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  IconButton,
  AppBar,
  Toolbar,
  Grid,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { useTheme as useCustomTheme } from '../../context/ThemeContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useCustomTheme();

  const handleJoinRoom = () => {
    navigate(`/room/enter`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <VideoCallIcon sx={{ mr: 2, fontSize: 32 }} color="primary" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Video Call App
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Grid container spacing={4} alignItems="center" justifyContent="center">
          <Grid sx={{ 
            width: { xs: '100%', md: '50%' },
            mt: { xs: 4, md: 10 }
          }}>
            <Box sx={{ mb: 4, px: { xs: 2, md: 0 } }}>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  fontWeight: 'bold',
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  background: 'linear-gradient(45deg, #90caf9 30%, #f48fb1 90%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                One to One video meeting
              </Typography>
              <Typography 
                variant="h5" 
                component="h2" 
                sx={{ 
                  mb: 4,
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  color: 'text.secondary',
                  fontWeight: 'medium'
                }}
              >
                Connect, collaborate and celebrate
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleJoinRoom()}
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: { xs: '1rem', md: '1.1rem' }
                  }}
                >
                  Join Existing Room
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/room/create')}
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: { xs: '1rem', md: '1.1rem' }
                  }}
                >
                  Create New Room
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard; 