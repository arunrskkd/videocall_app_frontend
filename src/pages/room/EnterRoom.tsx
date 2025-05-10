import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme as useCustomTheme } from '../../context/ThemeContext';

// Define validation schema
const schema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  roomId: yup
    .string()
    .required('Room ID is required')
    .min(6, 'Room ID must be at least 6 characters')
    .max(8, 'Room ID must not exceed 8 characters')
    .matches(/^[a-zA-Z0-9]+$/, 'Room ID can only contain letters and numbers')
});

type FormInputs = {
  username: string;
  roomId: string;
};

const EnterRoom = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useCustomTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
    mode: 'onChange'
  });

  const onSubmit = (data: FormInputs) => {
    navigate(`/room/${data.roomId}?name=${data.username}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/room/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <VideoCallIcon sx={{ mr: 2, fontSize: 32 }} color="primary" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Video Call App
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
        <Grid container spacing={4} alignItems="center" justifyContent="center">
          <Grid sx={{ width: '100%' }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: { xs: 2, md: 4 },
                borderRadius: 4,
                background: isDarkMode 
                  ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                  : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1.8rem', md: '2.5rem' },
                    background: 'linear-gradient(45deg, #90caf9 30%, #f48fb1 90%)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Join Room
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary"
                  sx={{ 
                    mb: 4,
                    fontSize: { xs: '1rem', md: '1.1rem' }
                  }}
                >
                  Enter your name and room ID to join
                </Typography>
              </Box>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Your Name"
                    {...register('username')}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    variant="outlined"
                    placeholder="Enter your name"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Room ID"
                    {...register('roomId')}
                    error={!!errors.roomId}
                    helperText={errors.roomId?.message}
                    variant="outlined"
                    placeholder="Enter room ID"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    fullWidth
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      py: 1.5,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      textTransform: 'none',
                      boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
                      '&:hover': {
                        boxShadow: '0 6px 20px 0 rgba(0,118,255,0.23)',
                      }
                    }}
                  >
                    Join Room
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/room/dashboard')}
                    fullWidth
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      py: 1.5,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      textTransform: 'none'
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default EnterRoom; 