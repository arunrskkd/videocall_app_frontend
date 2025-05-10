import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  AppBar,
  Toolbar,
  Grid,
  TextField,
  InputAdornment,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import { useTheme as useCustomTheme } from '../../context/ThemeContext';
import { io } from 'socket.io-client';

interface Participant {
  userId: string;
  userName: string;
}

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface RoomDetails {
  roomId: string;
  userId: string;
  userName: string;
  userCount: number;
  users: Participant[];
}

interface RoomJoinedData {
  roomId: string;
  userId: string;
  userName: string;
  userCount: number;
  users: Participant[];
}

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  iceCandidates: RTCIceCandidateInit[];
}

interface WebRTCOffer {
  from: string;
  offer: RTCSessionDescriptionInit;
}

interface WebRTCAnswer {
  from: string;
  answer: RTCSessionDescriptionInit;
}

interface WebRTCIceCandidate {
  from: string;
  candidate: RTCIceCandidateInit;
}

const RoomDetail = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useCustomTheme();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomDetails | null>(null);

  const params = new URLSearchParams(window.location.search);
  const username = params.get('name');
  const { roomId } = useParams<{ roomId: string }>();

  const socket = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [key: string]: PeerConnection }>({});
  const socketIdRef = useRef<string | null>(null);

  const createPeerConnection = (peerId: string) => {
    console.log(`creating peer connection` )
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`adding video stream to connection` )

        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Only send the candidate if we're still gathering
        if (peerConnection.iceGatheringState === 'gathering') {
          console.log(`Sending ICE candidate to ${peerId}`);
          socket.current.emit('ice-candidate', {
            target: peerId,
            candidate: event.candidate
          });
        }
      } else {
        // This is called when ICE gathering is complete
        console.log(`ICE gathering completed for ${peerId}`);
      }
    };

    // Add ICE gathering state change handler
    peerConnection.onicegatheringstatechange = () => {
      console.log(`ICE gathering state changed to: ${peerConnection.iceGatheringState}`);
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`outputs icoming  video to video box`)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Store the connection and initialize ICE candidate queue
    peerConnectionsRef.current[peerId] = {
      peerId,
      connection: peerConnection,
      iceCandidates: []
    };

    return peerConnection;
  };


  // offer video stream req to other client with peerId
  const createOffer = async (peerId: string) => {
    console.log(`creating offer to ${peerId} before that need connection to peer id` )
    const peerConnection = createPeerConnection(peerId);
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.current.emit('offer', {
        target: peerId,
        offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
    const peerData = peerConnectionsRef.current[peerId];
    if (peerData) {
      try {
        // Check if we're in the right state to set the remote description
        if (peerData.connection.signalingState === 'have-local-offer') {
          await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
          
          // Process any queued ICE candidates
          while (peerData.iceCandidates.length > 0) {
            const candidate = peerData.iceCandidates.shift();
            if (candidate) {
              try {
                await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (error) {
                console.warn('Error adding queued ICE candidate:', error);
              }
            }
          }
        } else {
          console.warn('Cannot set remote description: wrong signaling state', peerData.connection.signalingState);
        }
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  };

  const handleOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
    let peerData = peerConnectionsRef.current[peerId];
    
    // If we already have a connection, check its state
    if (peerData) {
      if (peerData.connection.signalingState !== 'stable') {
        console.warn('Connection exists but not in stable state:', peerData.connection.signalingState);
        return;
      }
    } else {
      const connection = createPeerConnection(peerId);
      peerData = peerConnectionsRef.current[peerId];
    }

    try {
      await peerData.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerData.connection.createAnswer();
      await peerData.connection.setLocalDescription(answer);
      socket.current.emit('answer', {
        target: peerId,
        answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleIceCandidate = async (peerId: string, candidate: RTCIceCandidateInit) => {
    const peerData = peerConnectionsRef.current[peerId];
    if (peerData) {
      try {
        // If remote description is not set, queue the candidate
        if (!peerData.connection.remoteDescription) {
          peerData.iceCandidates.push(candidate);
          return;
        }
        
        // Otherwise, add the candidate immediately
        console.log(`connecting with other candidate`);
        
        await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  useEffect(() => {
    const intFuc = async () => {
    socket.current = io(import.meta.env.VITE_SERVER_URL);
    
     socket.current.on('connect', async() => {
      await initializeLocalStream();

      socketIdRef.current = socket.current.id;
      
      console.log("socket server connected with id" + socket.current.id);
      // Join the room
      socket.current.emit('join-room', { room: roomId, name: username });
      console.log("sent req to join me to room");
    });

    socket.current.on('room-joined', (data: RoomJoinedData) => {
      console.log("server has addeded me to room");
      setRoomInfo(data);
      setIsConnected(true);
      setParticipants(data.users || []);
      
      // Create peer connections with existing participants
      data.users.forEach(user => {
        if (user.userId !== socketIdRef.current) {
          console.log("sent offer to all other members for video chat");
          createOffer(user.userId);
        }
      });
    });

    socket.current.on('user-joined', (user: Participant) => {
      console.log("one other member joined room");
      setParticipants(prev => [...prev, user]);
      // createOffer(user.userId);
    });

    socket.current.on('user-left', (user: Participant) => {
     
      setParticipants(prev => prev.filter(p => p.userId !== user.userId));
      
      // Close and remove peer connection
      if (peerConnectionsRef.current[user.userId]) {
        peerConnectionsRef.current[user.userId].connection.close();
        delete peerConnectionsRef.current[user.userId];
      }
    });

    socket.current.on('offer', ({ from, offer }: WebRTCOffer) => {
      console.log(`got an offer for video chat from ${from} offer${offer}` );
      handleOffer(from, offer);
    });

    socket.current.on('answer', ({ from, answer }: WebRTCAnswer) => {
      handleAnswer(from, answer);
    });

    socket.current.on('ice-candidate', ({ from, candidate }: WebRTCIceCandidate) => {
      console.log(`got an ip of other  for video  from ${from} offer${candidate}` );
      handleIceCandidate(from, candidate);
    });

    socket.current.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

   
  };

  if(!localStreamRef.current){
    intFuc();
  }


  return () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      
      });
    }
    
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(peerData => {
      peerData.connection.close();
   
    });
  };
  }, []);

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const initializeLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2
        }
      });
      

      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await new Promise((res) => {
        setTimeout(() => {
          res('true')
        }, 1000);
      })

    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Failed to access camera and microphone. Please check permissions.');
    }
  };

  const handleLeaveRoom = () => {
    socket.current.emit('leave-call');
    navigate('/room/dashboard');
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      socket.current.emit('chat-message', { room: roomId, message:chatMessage.trim()});
      setChatMessage('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="static" 
        color="transparent" 
        elevation={0}
        sx={{
          background: isDarkMode 
            ? 'linear-gradient(90deg, rgba(30,30,30,0.95) 0%, rgba(45,45,45,0.95) 100%)'
            : 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(245,245,245,0.95) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar>
          <VideoCallIcon sx={{ mr: 2, fontSize: 32 }} color="primary" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Video Call App
          </Typography>
          <IconButton 
            onClick={toggleDarkMode} 
            color="inherit"
            sx={{
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.1)' }
            }}
          >
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left Sidebar - Participants */}
        <Paper 
          elevation={3}
          sx={{ 
            width: { xs: '100%', md: 280 },
            height: { xs: 'auto', md: '100%' },
            borderRadius: { xs: 2, md: 0 },
            background: isDarkMode 
              ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            borderRight: { xs: 'none', md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            mb: { xs: 2, md: 0 },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                color: isDarkMode ? 'primary.light' : 'primary.main',
                fontWeight: 600,
              }}
            >
              Participants ({participants?.length})
            </Typography>
            <List>
              {participants?.map((user:Participant) => (
                <ListItem 
                  key={user.userId}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: isDarkMode ? 'primary.dark' : 'primary.main',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.1)' }
                      }}
                    >
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.userName === username ? 'You' : user.userName}
                    // secondary={`Joined: ${new Date(participant.joinedAt).toLocaleString()}`}
                    primaryTypographyProps={{
                      sx: { fontWeight: 500 }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>

        <Box sx={{ flexGrow: 1, p: { xs: 1, md: 3 }, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={{ xs: 1, md: 2 }} flexGrow={1}>
            <Grid sx={{ 
              m: { xs: 1, md: 2 }, 
              width: '200px',
              mb: { xs: 2, md: 0 }
            }}>
              <Paper 
                elevation={3}
                sx={{ 
                  width:  '200px',
                  height:  'auto',
                  display:'flex',
                  borderRadius: 4,
                  overflow:'hidden',
                  position:'relative',
                  background: isDarkMode 
                    ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',

                }}
              >
                  <Typography sx={{position:'absolute', top:10 , left:10}} fontSize='12px'>You</Typography>
                  <video ref={localVideoRef} autoPlay muted playsInline width={"100%"}/>
              
              </Paper>
            </Grid>
            <Grid sx={{ 
              m: { xs: 1, md: 2 }, 
              width: '200px',
            }}>
              <Paper 
                elevation={3}
                sx={{ 
                  width:  '200px',
                  height: 'auto',
                  display:'flex',
                  overflow:'hidden',
                  borderRadius: 4,
                  background: isDarkMode 
                    ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',

                }}
              >
                {/* <Typography>You</Typography> */}
                <video ref={remoteVideoRef} autoPlay playsInline width={"100%"}/>
              </Paper>
            </Grid>
          </Grid>

          {/* Control Bar */}
          <Box 
            sx={{ 
              mt: 3,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              p: 2,
              borderRadius: 4,
              background: isDarkMode 
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.02)',
            }}
          >
            <IconButton 
              onClick={handleToggleAudio}
              sx={{ 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <IconButton 
              onClick={handleToggleVideo}
              sx={{ 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
            </IconButton>
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={handleLeaveRoom}
              sx={{ 
                borderRadius: 2,
                px: 4,
                textTransform: 'none',
                fontWeight: 600,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 20px rgba(211,47,47,0.3)',
                }
              }}
            >
              End Call
            </Button>
          </Box>
        </Box>

        {/* Chat Sidebar */}
        <Paper 
          elevation={3}
          sx={{ 
            width: { xs: '100%', md: 320 },
            height: { xs: 'auto', md: '100%' },
            borderRadius: { xs: 2, md: 0 },
            background: isDarkMode 
              ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            borderLeft: { xs: 'none', md: '1px solid' },
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            mt: { xs: 2, md: 0 },
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: isDarkMode ? 'primary.light' : 'primary.main',
                fontWeight: 600,
              }}
            >
              Chat
            </Typography>
          </Box>

          {/* Chat Messages */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {chatMessages.map((message:ChatMessage) => (
              <Box
                key={`${message.userId}-${message.timestamp}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.userName === username ? 'flex-end' : 'flex-start',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  {message.userName  === username ? 'You' : message.userName} • {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    borderRadius: 2,
                    background: message.userName === 'You'
                      ? (isDarkMode ? 'primary.dark' : 'primary.light')
                      : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                    color: message.userName === username ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body2">
                    {message.message}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Chat Input */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={handleSendMessage}
                      color="primary"
                      disabled={!chatMessage.trim()}
                      sx={{
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.1)' }
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                }
              }}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default RoomDetail; 