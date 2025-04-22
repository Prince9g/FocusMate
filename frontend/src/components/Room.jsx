import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaSmile, FaPaperPlane, FaUserFriends, FaTimes, FaExpand } from 'react-icons/fa';
import { IoMdExit } from 'react-icons/io';
import io from 'socket.io-client';
import axios from 'axios';
import { useMediaQuery } from 'react-responsive';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useRef(null);
  
  const [roomDetails, setRoomDetails] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  const [fullScreenUser, setFullScreenUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [password, setPassword] = useState(null);
  const [pomodoro, setPomodoro] = useState({minutes:25, seconds: 0}); // 25 minutes in seconds
  const [fiveMint, setFiveMint] = useState({minutes:5, seconds: 0}); // 5 minutes in seconds
  const [isPomodoroActive, setIsPomodoroActive] = useState(true);
  const [isThereLeft, setIsThereLeft] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  
  const videoRefs = useRef({});
  const pcRefs = useRef({});
  const pendingCandidates = useRef({});
  const userName = localStorage.getItem("focusRoomUser") || "Guest";
  const reactions = ['👍', '👎', '😊', '🎉', '❤️', '😂'];
  const messageEndRef = useRef(null);
  const timersRef = useRef({});
  const mediaConstraints = {
    audio: true,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    }
  };

  // Helper to determine if peer connection exists and is connected
  const isPeerConnected = (userId) => {
    return pcRefs.current[userId] && 
           ['connected', 'completed'].includes(pcRefs.current[userId].iceConnectionState);
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up WebRTC peer connection
  const setupPeerConnection = (userId) => {
    console.log(`Setting up peer connection for ${userId}`);
    
    // Close existing connection if any
    if (pcRefs.current[userId]) {
      console.log(`Closing existing connection for ${userId}`);
      pcRefs.current[userId].close();
      delete pcRefs.current[userId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pcRefs.current[userId] = pc;

    // Initialize pending candidates array if not exists
    if (!pendingCandidates.current[userId]) {
      pendingCandidates.current[userId] = [];
    }

    // Add local tracks to the connection
    if (localStream) {
      console.log(`Adding ${localStream.getTracks().length} local tracks to connection with ${userId}`);
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${userId}`);
        socket.current.emit('signal', {
          to: userId,
          signal: {
            type: 'candidate',
            candidate: event.candidate
          }
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Attempt to reconnect
        setTimeout(() => {
          if (pc.connectionState !== 'connected' && pc.connectionState !== 'connecting') {
            console.log(`Attempting to reconnect to ${userId}`);
            setupPeerConnection(userId);
          }
        }, 2000);
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}: ${pc.iceConnectionState}`);
      
      // Update UI when connection is established or lost
      if (['connected', 'completed'].includes(pc.iceConnectionState)) {
        setUsers(prev => prev.map(user => {
          if (user.id === userId) {
            return { ...user, connected: true };
          }
          return user;
        }));
      } else if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        setUsers(prev => prev.map(user => {
          if (user.id === userId) {
            return { ...user, connected: false };
          }
          return user;
        }));
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`Received tracks from ${userId}`, event.streams);
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log(`Setting remote stream for ${userId}`);
        
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          newStreams[userId] = stream;
          return newStreams;
        });
      }
    };

    // Process any pending ICE candidates
    if (pendingCandidates.current[userId].length > 0) {
      console.log(`Processing ${pendingCandidates.current[userId].length} pending candidates for ${userId}`);
      
      const processPendingCandidates = async () => {
        if (pc.remoteDescription) {
          for (const candidate of pendingCandidates.current[userId]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log(`Added pending ICE candidate for ${userId}`);
            } catch (err) {
              console.error(`Error adding pending ICE candidate for ${userId}:`, err);
            }
          }
          pendingCandidates.current[userId] = [];
        }
      };
      
      processPendingCandidates();
    }

    return pc;
  };

  // Initialize socket and room
  useEffect(() => {
    // Connect to socket server with reconnection options
    socket.current = io('http://localhost:8080', {
      auth: { roomId, name: userName },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Connection handlers
    const handleConnect = () => {
      setConnectionStatus('connected');
      socket.current.emit('join-room', { roomId, name: userName });
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (err) => {
      console.error('Connection error:', err);
      setConnectionStatus('error');
    };

    socket.current.on('connect', handleConnect);
    socket.current.on('disconnect', handleDisconnect);
    socket.current.on('connect_error', handleConnectError);

    // Get room details
    const fetchRoomDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/rooms/${roomId}`);
        if (res.data) {
          setRoomDetails(res.data);
          setPassword(res.data.password);
          setMessages(res.data.messages || []);
          updateTimeLeft(res.data.expiresAt);
          
          const participants = res.data.participants
            .filter(p => !p.leftAt)
            .map((p) => ({
              id: p.socketId || `user-${p.name}`,
              name: p.name,
              isMuted: p.isMuted || false,
              isCameraOff: p.isCameraOff || false,
              isSpeaking: false,
              connected: false
            }));
          setUsers(participants);
        }
      } catch (err) {
        console.error("Failed to fetch room details:", err);
        navigate('/');
      }
    };

    fetchRoomDetails();

    // Socket event listeners
    const handleRoomDetails = (room) => {
      setRoomDetails(room);
      setMessages(room.messages || []);
      updateTimeLeft(room.expiresAt);
      
      const participants = room.participants
        .filter(p => !p.leftAt)
        .map((p) => ({
          id: p.socketId || `user-${p.name}`,
          name: p.name,
          isMuted: p.isMuted || false,
          isCameraOff: p.isCameraOff || false,
          isSpeaking: false,
          connected: false
        }));
      setUsers(participants);
    };

    const handleUserConnected = async ({ socketId, name, isMuted = false, isCameraOff = false }) => {
      console.log('User connected:', socketId, name);
      
      // Add user to users state if not already present
      setUsers(prev => {
        if (prev.some(user => user.id === socketId)) return prev;
        return [...prev, { 
          id: socketId, 
          name, 
          isMuted, 
          isCameraOff,
          isSpeaking: false,
          connected: false
        }];
      });

      // Only initiate connection if we're the "lower" ID to avoid duplicate connections
      if (socket.current.id < socketId && localStream) {
        console.log(`Initiating connection with new user ${socketId}`);
        const pc = setupPeerConnection(socketId);
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.current.emit('signal', {
            to: socketId,
            signal: pc.localDescription
          });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      }
    };

    const handleUserDisconnected = ({ socketId }) => {
      console.log('User disconnected:', socketId);
      
      setUsers(prev => prev.filter(user => user.id !== socketId));
      
      // Close and clean up peer connection
      if (pcRefs.current[socketId]) {
        pcRefs.current[socketId].close();
        delete pcRefs.current[socketId];
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newStreams = {...prev};
        delete newStreams[socketId];
        return newStreams;
      });
      
      // Clean up pending candidates
      if (pendingCandidates.current[socketId]) {
        delete pendingCandidates.current[socketId];
      }
    };

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleSignal = async ({ from, signal }) => {
      if (!from) {
        console.warn("Signal missing sender ID");
        return;
      }
      
      console.log(`Received ${signal.type} signal from ${from}`);
      
      try {
        // Ensure we have a peer connection for this user
        if (!pcRefs.current[from]) {
          console.log('Creating new peer connection for', from);
          setupPeerConnection(from);
        }
        
        const pc = pcRefs.current[from];
        
        if (signal.type === 'offer') {
          console.log('Processing offer from', from);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          
          // Process any pending ICE candidates
          if (pendingCandidates.current[from] && pendingCandidates.current[from].length > 0) {
            console.log(`Processing ${pendingCandidates.current[from].length} pending candidates after offer`);
            
            for (const candidate of pendingCandidates.current[from]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current[from] = [];
          }
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.current.emit('signal', {
            to: from,
            signal: answer
          });
        } 
        else if (signal.type === 'answer') {
          console.log('Processing answer from', from);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          
          // Process any pending ICE candidates
          if (pendingCandidates.current[from] && pendingCandidates.current[from].length > 0) {
            console.log(`Processing ${pendingCandidates.current[from].length} pending candidates after answer`);
            
            for (const candidate of pendingCandidates.current[from]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current[from] = [];
          }
        } 
        else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription) {
            console.log('Adding ICE candidate from', from);
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            console.log('Queuing ICE candidate from', from);
            if (!pendingCandidates.current[from]) {
              pendingCandidates.current[from] = [];
            }
            pendingCandidates.current[from].push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('Error handling signal:', err);
      }
    };

    const handleJoinError = (error) => {
      console.error("Join error:", error);
      alert(`Error joining room: ${error}`);
      navigate('/');
    };

    const handleUserUpdated = ({ socketId, isMuted, isCameraOff }) => {
      setUsers(prev => prev.map(user => {
        if (user.id === socketId) {
          return {
            ...user, 
            isMuted: isMuted !== undefined ? isMuted : user.isMuted,
            isCameraOff: isCameraOff !== undefined ? isCameraOff : user.isCameraOff
          };
        }
        return user;
      }));
    };

    const handleUserSpeaking = ({ socketId, isSpeaking }) => {
      setUsers(prev => prev.map(user => {
        if (user.id === socketId) {
          return {
            ...user,
            isSpeaking
          };
        }
        return user;
      }));
    };

    socket.current.on('room-details', handleRoomDetails);
    socket.current.on('user-connected', handleUserConnected);
    socket.current.on('user-disconnected', handleUserDisconnected);
    socket.current.on('new-message', handleNewMessage);
    socket.current.on('signal', handleSignal);
    socket.current.on('join-error', handleJoinError);
    socket.current.on('user-updated', handleUserUpdated);
    socket.current.on('user-speaking', handleUserSpeaking);

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socket.current?.connected) {
        socket.current.emit('heartbeat');
      }
    }, 30000);

    return () => {
      // Clean up all timers
      Object.values(timersRef.current).forEach(timers => {
        timers.forEach(timer => clearTimeout(timer));
      });
      
      clearInterval(heartbeatInterval);
      
      socket.current.off('connect', handleConnect);
      socket.current.off('disconnect', handleDisconnect);
      socket.current.off('connect_error', handleConnectError);
      socket.current.off('room-details', handleRoomDetails);
      socket.current.off('user-connected', handleUserConnected);
      socket.current.off('user-disconnected', handleUserDisconnected);
      socket.current.off('new-message', handleNewMessage);
      socket.current.off('signal', handleSignal);
      socket.current.off('join-error', handleJoinError);
      socket.current.off('user-updated', handleUserUpdated);
      socket.current.off('user-speaking', handleUserSpeaking);
      
      if (socket.current) {
        socket.current.disconnect();
      }
      
      // Clean up all peer connections
      Object.values(pcRefs.current).forEach(pc => {
        if (pc && pc.close) pc.close();
      });
      
      // Stop local media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, userName, navigate]);

  // Update time left countdown
  const updateTimeLeft = (expiresAt) => {
    const update = () => {
      const now = new Date();
      const diff = new Date(expiresAt) - now;
      
      if (diff <= 0) {
        clearInterval(timer);
        navigate('/');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if(minutes > 25) {
        setIsThereLeft(true);
      }
      // const timeInSeconds = Math.floor(diff / 1000);
      
      // setPomodoro({minutes, seconds});
      
      setTimeLeft({ hours, minutes, seconds });
    };
    
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  };

  useEffect(() => {
    let timer;
    
    if (isPomodoroActive) {
      timer = setInterval(() => {
        setPomodoro(prevTime => {
          const { minutes, seconds } = prevTime;
          
          if (minutes === 0 && seconds === 0) {
            clearInterval(timer);
            setIsPomodoroActive(false);
            setFiveMint({minutes: 5, seconds: 0}); // Reset to 5 minutes
            return { minutes: 0, seconds: 0 };
          }
          
          if (seconds === 0) {
            return { minutes: minutes - 1, seconds: 59 };
          }
          
          return { minutes, seconds: seconds - 1 };
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [isPomodoroActive]);
  useEffect(() => {
    let timer;
    
    if (!isPomodoroActive) {
      timer = setInterval(() => {
        setFiveMint(prevTime => {
          const { minutes, seconds } = prevTime;
          
          if (minutes === 0 && seconds === 0) {
            clearInterval(timer);
            setIsPomodoroActive(true);
            setPomodoro({minutes: 25, seconds: 0}); // Reset to 25 minutes
            return { minutes: 0, seconds: 0 };
          }
          
          if (seconds === 0) {
            return { minutes: minutes - 1, seconds: 59 };
          }
          
          return { minutes, seconds: seconds - 1 };
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [!isPomodoroActive]);


  // Set up volume analyzer for speaking detection
  const setupVolumeDetection = (stream) => {
    if (!stream) return null;
    
    try {
      const audioContext = new AudioContext();
      const analyzer = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      
      analyzer.smoothingTimeConstant = 0.8;
      analyzer.fftSize = 1024;
      
      microphone.connect(analyzer);
      analyzer.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      const speakingThreshold = -50;
      let speaking = false;
      let speakingTimer = null;
      
      scriptProcessor.onaudioprocess = function() {
        const array = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(array);
        
        const average = array.reduce((a, b) => a + b) / array.length;
        const volume = 20 * Math.log10(average / 255);
        
        const isSpeakingNow = volume > speakingThreshold;
        
        if (isSpeakingNow !== speaking) {
          clearTimeout(speakingTimer);
          
          speakingTimer = setTimeout(() => {
            if (isSpeakingNow !== speaking) {
              speaking = isSpeakingNow;
              
              if (socket.current?.connected) {
                socket.current.emit('speaking', {
                  roomId,
                  isSpeaking: speaking
                });
              }
            }
          }, isSpeakingNow ? 100 : 500);
        }
      };
      
      return () => {
        scriptProcessor.disconnect();
        analyzer.disconnect();
        microphone.disconnect();
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
    } catch (err) {
      console.error("Error setting up volume detection:", err);
      return null;
    }
  };

  // Initialize local media stream
  const initLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      console.log('Got local media stream');
      
      setLocalStream(stream);
      
      // Set up volume detection for speaking indication
      const cleanupVolumeDetection = setupVolumeDetection(stream);
      
      return () => {
        if (cleanupVolumeDetection) cleanupVolumeDetection();
      };
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setIsCameraOff(true);
      setIsMuted(true);
      alert(`Media access error: ${err.message}. You'll join in text-only mode.`);
      return null;
    }
  };

  // Create peer connections for each user after local media is initialized
  useEffect(() => {
    if (!localStream || !socket.current || !socket.current.connected) return;
    
    console.log(`Local stream acquired, setting up peer connections with ${users.length} users`);
    
    // Create peer connections for each user
    users.forEach(user => {
      if (user.id !== socket.current.id && !pcRefs.current[user.id]) {
        console.log(`Initializing connection with user ${user.id}`);
        const pc = setupPeerConnection(user.id);
        
        // Create offer from our side if our ID is "smaller"
        if (socket.current.id < user.id) {
          console.log(`Creating offer for ${user.id} because our ID is lower`);
          
          pc.createOffer()
            .then(offer => {
              console.log(`Setting local description for ${user.id}`);
              return pc.setLocalDescription(offer);
            })
            .then(() => {
              console.log(`Sending offer to ${user.id}`);
              socket.current.emit('signal', {
                to: user.id,
                signal: pc.localDescription
              });
            })
            .catch(err => console.error(`Error creating offer for ${user.id}:`, err));
        } else {
          console.log(`Waiting for offer from ${user.id} because our ID is higher`);
        }
      }
    });
  }, [localStream, socket.current?.connected, users]);

  // Update video elements when streams change
  useEffect(() => {
    // Set local video
    if (localStream && videoRefs.current['local']) {
      console.log('Updating local video ref');
      videoRefs.current['local'].srcObject = localStream;
    }
    
    // Set remote videos
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (videoRefs.current[userId]) {
        console.log(`Updating video ref for ${userId}`);
        videoRefs.current[userId].srcObject = stream;
      }
    });
  }, [localStream, remoteStreams]);

  // Initialize media once connection is established
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('Connection established, initializing media');
      initLocalMedia();
    }
  }, [connectionStatus]);

  // Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket.current?.connected) {
      const newMessage = {
        sender: userName,
        content: message,
        isReaction: false,
        timestamp: new Date()
      };
      
      socket.current.emit('send-message', {
        roomId,
        sender: userName,
        content: message,
        isReaction: false
      });
      
      setMessage('');
    }
  };

  // Handle sending reactions
  const handleSendReaction = (reaction) => {
    if (socket.current?.connected) {
      const reactionMessage = {
        sender: userName,
        content: reaction,
        isReaction: true,
        timestamp: new Date()
      };
      
      socket.current.emit('send-message', {
        roomId,
        sender: userName,
        content: reaction,
        isReaction: true
      });
      
      setActiveReaction(reaction);
      setShowReactions(false);
      
      setTimeout(() => setActiveReaction(null), 2000);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
    }
    
    if (socket.current?.connected) {
      socket.current.emit('user-update', { 
        roomId, 
        isMuted: newMuteState 
      });
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    const newCameraState = !isCameraOff;
    setIsCameraOff(newCameraState);
    
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !newCameraState;
      });
    }
    
    if (socket.current?.connected) {
      socket.current.emit('user-update', { 
        roomId, 
        isCameraOff: newCameraState 
      });
    }
  };

  // Toggle full screen for a user
  const toggleFullScreen = (user) => {
    setFullScreenUser(prev => prev?.id === user.id ? null : user);
  };

  // Format time display
  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };
  
  // Add this to your existing useEffect for video elements to handle mobile resize
  useEffect(() => {
    const handleResize = () => {
      // Update video element sizes on resize
      if (localStream && videoRefs.current['local']) {
        videoRefs.current['local'].srcObject = localStream;
      }
      
      Object.entries(remoteStreams).forEach(([userId, stream]) => {
        if (videoRefs.current[userId]) {
          videoRefs.current[userId].srcObject = stream;
        }
      });
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [localStream, remoteStreams]);

  // Leave room gracefully
  const leaveRoom = () => {
    console.log('Leaving room');
    
    if (socket.current) {
      socket.current.emit('leave-room', { roomId });
      socket.current.disconnect();
    }
    
    // Clean up media
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up peer connections
    Object.values(pcRefs.current).forEach(pc => {
      if (pc && pc.close) pc.close();
    });
    
    navigate('/');
  };

  if (connectionStatus !== 'connected') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Error'}
          </h2>
          {connectionStatus === 'error' && (
            <button 
              onClick={() => window.location.reload()}
              className="bg-purple-400 text-white px-4 py-2 rounded"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-slate-900 relative">
      {/* Header */}
      <div className="bg-purple-400 dark:bg-slate-700 text-white p-2 sm:p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg sm:text-xl font-bold truncate max-w-[180px] sm:max-w-none">
            {roomDetails?.name}'s Room
          </h2>
          <p className="text-xs sm:text-sm">
            ID: {roomId} | password: {password} | {users.length} users
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row-reverse justify-center gap-2 items-center">
        <div className="bg-red-500 px-3 py-1 sm:px-4 sm:py-2 rounded-lg flex items-center">
          <span className="font-mono text-sm sm:text-lg">
            {formatTime(timeLeft.hours)}:
            {formatTime(timeLeft.minutes)}:
            {formatTime(timeLeft.seconds)}
          </span>
        </div>
        {
          isPomodoroActive && isThereLeft && (
            <div className="flex flex-col md:flex-row items-center md:gap-2 bg-gray-700 rounded-3xl p-1 md:p-2 w-full md:w-auto">
              <span className="text-sm sm:text-lg hidden md:block">Pomodoro Timer:</span>
              <span className="font-mono text-sm sm:text-lg">
                {formatTime(pomodoro.minutes)}:{formatTime(pomodoro.seconds)}
              </span>
            </div>
          )
        }
        </div>
        
      </div>
  
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden`}>
        {/* Video/User grid */}
        <div className={`${isMobile ? 'order-2' : ''} ${isMobile ? 'h-1/2' : 'flex-1'} overflow-y-auto p-2 sm:p-4`}>
          {/* Full screen view */}
          {fullScreenUser && (
            <div className="mb-2 sm:mb-4 bg-white rounded-lg shadow-md overflow-hidden h-full relative">
              {fullScreenUser.isCameraOff ? (
                <div className="bg-gray-200 h-full flex items-center justify-center">
                  <span className="text-6xl sm:text-9xl font-bold text-gray-600">
                    {fullScreenUser.name.charAt(0)}
                  </span>
                </div>
              ) : (
                <div className="bg-gray-800 h-full flex items-center justify-center text-white text-xl">
                  {fullScreenUser.id === 'local' ? (
                    <video 
                      ref={el => {
                        videoRefs.current['local'] = el;
                        if (el && localStream) {
                          el.srcObject = localStream;
                        }
                      }}
                      autoPlay 
                      muted 
                      className="h-full w-full object-cover"
                    />
                  ) : remoteStreams[fullScreenUser.id] ? (
                    <video
                      ref={el => {
                        videoRefs.current[fullScreenUser.id] = el;
                        if (el && remoteStreams[fullScreenUser.id]) {
                          el.srcObject = remoteStreams[fullScreenUser.id];
                        }
                      }}
                      autoPlay
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>Loading {fullScreenUser.name}'s video...</span>
                  )}
                </div>
              )}
              <div className="p-2 flex justify-between items-center bg-gray-50 absolute bottom-0 left-0 right-0">
                <span className="font-medium truncate">
                  {fullScreenUser.name} {fullScreenUser.id === 'local' && '(You)'}
                </span>
                <button 
                  onClick={() => toggleFullScreen(fullScreenUser)}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}
  
          {/* Grid view */}
          <div className={`grid ${
            isMobile ? 'grid-cols-2' : 
            isTablet ? 'grid-cols-3' : 
            'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          } gap-2 sm:gap-4 ${fullScreenUser ? 'mt-2 sm:mt-4' : ''}`}>
            {/* Local user */}
            <div 
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                isMobile ? 'h-32' : 'h-48'
              } relative ${isMuted ? 'ring-2 ring-blue-500' : ''}`}
            >
              {isCameraOff ? (
                <div className="bg-gray-200 h-full flex items-center justify-center">
                  <span className="text-2xl sm:text-4xl font-bold text-gray-600">
                    {userName.charAt(0)}
                  </span>
                </div>
              ) : (
                <div className="bg-gray-800 h-full flex items-center justify-center text-white">
                  <video 
                    ref={el => videoRefs.current['local'] = el}
                    autoPlay 
                    muted 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-2 flex justify-between items-center bg-gray-50 absolute bottom-0 left-0 right-0">
                <span className="font-medium truncate text-xs sm:text-sm">
                  {userName} (You)
                </span>
                <div className="flex space-x-1">
                  {isMuted && <span className="text-red-500">🔇</span>}
                  <button 
                    onClick={() => toggleFullScreen({ id: 'local', name: userName, isCameraOff })}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                  >
                    <FaExpand className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
  
            {/* Remote users */}
            {users.filter(user => user.id !== 'local' && user.id !== socket.current?.id).map(user => (
              <div 
                key={user.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  isMobile ? 'h-32' : 'h-48'
                } relative ${user.isSpeaking ? 'ring-2 ring-purple-400' : ''}`}
              >
                {user.isCameraOff ? (
                  <div className="bg-gray-200 h-full flex items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-bold text-gray-600">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-800 h-full flex items-center justify-center text-white">
                    {remoteStreams[user.id] ? (
                      <video
                        ref={el => videoRefs.current[user.id] = el}
                        autoPlay
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs sm:text-base">Connecting to {user.name}...</span>
                    )}
                  </div>
                )}
                <div className="p-2 flex justify-between items-center bg-gray-50 absolute bottom-0 left-0 right-0">
                  <span className="font-medium truncate text-xs sm:text-sm">
                    {user.name}
                  </span>
                  <div className="flex space-x-1">
                    {user.isMuted && <span className="text-red-500">🔇</span>}
                    <button 
                      onClick={() => toggleFullScreen(user)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <FaExpand className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Chat panel */}
        <div className={`${
          isMobile ? 'order-1 border-b' : 'border-l'
        } border-gray-300 dark:bg-slate-900 flex flex-col bg-white  ${
          isMobile ? 'h-1/2' : 'w-80'
        }`}>
          <div className="p-2 sm:p-3 border-b border-gray-300 flex items-center">
            <FaUserFriends className="mr-2 text-red-400" />
            <h3 className="font-semibold dark:text-white">Chat</h3>
          </div>
          <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
            {messages.map((msg, index) => (
              <div 
                key={`msg-${index}-${msg.timestamp || Date.now()}-${msg.sender}`}
                className={`mb-2 sm:mb-3 ${msg.isReaction ? 'text-2xl text-center' : ''}`}
              >
                {!msg.isReaction && (
                  <div className="font-semibold text-red-400 text-sm sm:text-base">{msg.sender}</div>
                )}
                <div className="text-xs sm:text-sm dark:text-white">{msg.content}</div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-2 sm:p-3 border-t border-gray-300">
            <div className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-l-lg px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="bg-red-400 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-r-lg hover:bg-red-600"
              >
                <FaPaperPlane size={isMobile ? 14 : 16} />
              </button>
            </div>
          </form>
        </div>
      </div>
  
      {/* Controls bar */}
      <div className="bg-white dark:bg-gray-700 border-t border-gray-300  p-2 sm:p-3 flex justify-center items-center space-x-2 sm:space-x-4 relative">
        <button
          onClick={toggleMute}
          className={`p-2 sm:p-3 rounded-full ${
            isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isMuted ? <FaMicrophoneSlash size={isMobile ? 16 : 20} /> : <FaMicrophone size={isMobile ? 16 : 20} />}
        </button>
        
        <button
          onClick={toggleCamera}
          className={`p-2 sm:p-3 rounded-full ${
            isCameraOff ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isCameraOff ? <FaVideoSlash size={isMobile ? 16 : 20} /> : <FaVideo size={isMobile ? 16 : 20} />}
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-2 sm:p-3 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 ${
              activeReaction ? 'animate-bounce' : ''
            }`}
          >
            {activeReaction || <FaSmile size={isMobile ? 16 : 20} />}
          </button>
          
          {showReactions && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white p-2 rounded-lg shadow-lg flex space-x-2 z-10">
              {reactions.map((reaction, i) => (
                <button 
                  key={i} 
                  type="button"
                  className="hover:scale-125 transform transition text-xl"
                  onClick={() => handleSendReaction(reaction)}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button 
          onClick={leaveRoom}
          className="p-2 sm:p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
        >
          <IoMdExit size={isMobile ? 18 : 20} />
        </button>
      </div>
      {
        !isPomodoroActive && (
          <div>
            <div className="absolute bottom-0 left-0 right-0 bg-transparent dark:text-white p-2 sm:p-3 flex h-screen justify-center items-center space-x-2 sm:space-x-4">
              <div className="flex w-full md:w-auto flex-col justify-center items-center border rounded-xl border-black p-4 dark:border-gray-300 bg-red-200 dark:bg-slate-700 shadow-lg">
              <span className="text-3xl md:text-6xl font-bold">Break Timer:</span>
              <span className="font-mono mt-4 font-medium border border-black p-4 dark:border-gray-200 rounded-3xl text-5xl md:text-9xl w-3/4 md:w-auto text-center">
                {formatTime(fiveMint.minutes)}:{formatTime(fiveMint.seconds)}
              </span>
              <div className="text-3xl mt-4 font-semibold">Screen Disabled 🔇</div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default Room;