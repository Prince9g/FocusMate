import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaSmile, FaPaperPlane, FaUserFriends, FaTimes, FaExpand } from 'react-icons/fa';
import { IoMdExit } from 'react-icons/io';
import io from 'socket.io-client';
import axios from 'axios';

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
  
  const videoRefs = useRef({});
  const pcRefs = useRef({});
  const userName = localStorage.getItem("focusRoomUser") || "Guest";
  const reactions = ['👍', '👎', '😊', '🎉', '❤️', '😂'];

  // Initialize socket and room
  useEffect(() => {
    // Connect to socket server
    socket.current = io('http://localhost:8080', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { roomId, name: userName }
    });

    // Connection handlers
    socket.current.on('connect', () => {
      console.log('Socket connected:', socket.current.id);
      setConnectionStatus('connected');
    });

    socket.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnectionStatus('error');
    });

    // Get room details
    const fetchRoomDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/rooms/${roomId}`);
        if (res.data) {
          setRoomDetails(res.data);
          setMessages(res.data.messages || []);
          updateTimeLeft(res.data.expiresAt);
          
          // Initialize participants with unique names
          const participants = res.data.participants
            .filter(p => !p.leftAt)
            .map((p, index) => ({
              id: p.socketId || `user_${index}_${Date.now()}`,
              name: p.name,
              isMuted: false,
              isCameraOff: false,
              isSpeaking: false
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
    socket.current.on('room-details', (room) => {
      setRoomDetails(room);
      setMessages(room.messages || []);
      updateTimeLeft(room.expiresAt);
    });

    socket.current.on('user-connected', ({ socketId, name }) => {
      setUsers(prev => {
        // Ensure unique names
        const nameExists = prev.some(user => user.name === name);
        return nameExists ? prev : [...prev, { 
          id: socketId, 
          name, 
          isMuted: false, 
          isCameraOff: false,
          isSpeaking: false 
        }];
      });
    });

    socket.current.on('user-disconnected', ({ socketId }) => {
      setUsers(prev => prev.filter(user => user.id !== socketId));
      if (pcRefs.current[socketId]) {
        pcRefs.current[socketId].close();
        delete pcRefs.current[socketId];
      }
    });

    socket.current.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.current.on('user-updated', ({ socketId, isMuted, isCameraOff }) => {
      setUsers(prev => prev.map(user => 
        user.id === socketId ? { 
          ...user, 
          isMuted: isMuted !== undefined ? isMuted : user.isMuted,
          isCameraOff: isCameraOff !== undefined ? isCameraOff : user.isCameraOff
        } : user
      ));
    });

    socket.current.on('signal', async ({ from, signal }) => {
      if (!pcRefs.current[from]) {
        await createPeerConnection(from);
      }
      
      if (signal.type === 'offer') {
        await pcRefs.current[from].setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pcRefs.current[from].createAnswer();
        await pcRefs.current[from].setLocalDescription(answer);
        socket.current.emit('signal', { to: from, from: socket.current.id, signal: answer });
      } else if (signal.type === 'answer') {
        await pcRefs.current[from].setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate') {
        await pcRefs.current[from].addIceCandidate(new RTCIceCandidate(signal));
      }
    });

    // Join the room after connection
    const joinRoom = () => {
      if (socket.current.connected) {
        socket.current.emit('join-room', { roomId, name: userName });
      } else {
        socket.current.once('connect', () => {
          socket.current.emit('join-room', { roomId, name: userName });
        });
      }
    };
    joinRoom();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
      Object.values(pcRefs.current).forEach(pc => pc.close());
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
      
      setTimeLeft({ hours, minutes, seconds });
    };
    
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  };

  // Initialize local media stream
  const initLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setLocalStream(stream);
      
      // Display local stream
      if (videoRefs.current['local']) {
        videoRefs.current['local'].srcObject = stream;
      }
      
      // Send stream to existing peers
      Object.keys(pcRefs.current).forEach(socketId => {
        stream.getTracks().forEach(track => {
          pcRefs.current[socketId].addTrack(track, stream);
        });
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  // Create peer connection
  const createPeerConnection = async (socketId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pcRefs.current[socketId] = pc;
    
    // Add local stream if available
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: event.streams[0]
      }));
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('signal', {
          to: socketId,
          from: socket.current.id,
          signal: event.candidate
        });
      }
    };
    
    // Create offer if this is a new connection
    if (!users.some(user => user.id === socketId)) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.current.emit('signal', {
        to: socketId,
        from: socket.current.id,
        signal: offer
      });
    }
  };

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        await axios.post(`http://localhost:8080/api/rooms/${roomId}/messages`, {
          sender: userName,
          content: message,
          isReaction: false
        });
        setMessages(prev => [...prev, { sender: userName, content: message, isReaction: false }]);
        setMessage('');
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    }
  };

  // Handle sending reactions
  const handleSendReaction = (reaction) => {
    socket.current.emit('send-message', {
      roomId,
      sender: userName,
      content: reaction,
      isReaction: true
    });
    setActiveReaction(reaction);
    setShowReactions(false);
    setTimeout(() => setActiveReaction(null), 2000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  // Toggle full screen for a user
  const toggleFullScreen = (user) => {
    setFullScreenUser(prev => prev?.id === user.id ? null : user);
  };

  // Initialize media on component mount
  useEffect(() => {
    initLocalMedia();
  }, []);

  // Format time display
  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with room info */}
      <div className="bg-purple-400 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Welcome to {roomDetails?.name || 'Room'}</h2>
          <p className="text-sm">Meeting ID: {roomId} | Participants: {users.length}</p>
        </div>
        <div className="bg-red-500 px-4 py-2 rounded-lg flex items-center">
          <span className="font-mono text-lg">
            {formatTime(timeLeft.hours)}:
            {formatTime(timeLeft.minutes)}:
            {formatTime(timeLeft.seconds)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video/User grid on the left */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Full screen view */}
          {fullScreenUser && (
            <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden h-3/4 relative">
              {fullScreenUser.isCameraOff ? (
                <div className="bg-gray-200 h-full flex items-center justify-center">
                  <span className="text-9xl font-bold text-gray-600">
                    {fullScreenUser.name.charAt(0)}
                  </span>
                </div>
              ) : (
                <div className="bg-gray-800 h-full flex items-center justify-center text-white text-xl">
                  {fullScreenUser.id === 'local' ? (
                    <video 
                      ref={el => videoRefs.current['local'] = el}
                      autoPlay 
                      muted 
                      className="h-full w-full object-cover"
                    />
                  ) : remoteStreams[fullScreenUser.id] ? (
                    <video
                      ref={el => videoRefs.current[fullScreenUser.id] = el}
                      autoPlay
                      className="h-full w-full object-cover"
                      srcObject={remoteStreams[fullScreenUser.id]}
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${fullScreenUser ? 'mt-4' : ''}`}>
            {/* Local user */}
            <div 
              className={`bg-white rounded-lg shadow-md overflow-hidden h-48 relative ${isMuted ? 'ring-2 ring-blue-500' : ''}`}
            >
              {isCameraOff ? (
                <div className="bg-gray-200 h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-600">
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
                <span className="font-medium truncate">
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
            {users.filter(user => user.id !== 'local').map(user => (
              <div 
                key={user.id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden h-48 relative ${user.isSpeaking ? 'ring-2 ring-purple-400' : ''}`}
              >
                {user.isCameraOff ? (
                  <div className="bg-gray-200 h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-600">
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
                        srcObject={remoteStreams[user.id]}
                      />
                    ) : (
                      <span>Connecting to {user.name}...</span>
                    )}
                  </div>
                )}
                <div className="p-2 flex justify-between items-center bg-gray-50 absolute bottom-0 left-0 right-0">
                  <span className="font-medium truncate">
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

        {/* Chat panel on the right */}
        <div className="w-80 border-l border-gray-300 flex flex-col bg-white">
          <div className="p-3 border-b border-gray-300 flex items-center">
            <FaUserFriends className="mr-2 text-red-400" />
            <h3 className="font-semibold">Chat</h3>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-3 ${msg.isReaction ? 'text-2xl text-center' : ''}`}
              >
                {!msg.isReaction && (
                  <div className="font-semibold text-red-400">{msg.sender}</div>
                )}
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-300">
            <div className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="bg-red-400 text-white px-3 py-2 rounded-r-lg hover:bg-red-600"
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-white border-t border-gray-300 p-3 flex justify-center items-center space-x-4 relative">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          {isCameraOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-3 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 ${activeReaction ? 'animate-bounce' : ''}`}
          >
            {activeReaction || <FaSmile />}
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
          onClick={() => {
            if (socket.current) socket.current.disconnect();
            navigate('/');
          }}
          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
        >
          <IoMdExit />
        </button>
      </div>
    </div>
  );
};

export default Room;