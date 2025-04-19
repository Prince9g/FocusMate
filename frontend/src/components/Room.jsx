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
  const messageEndRef = useRef(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize socket and room
  useEffect(() => {
    // Connect to socket server with reconnection options
    socket.current = io('https://focusmate-bay5.onrender.com/', {
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
        const res = await axios.get(`https://focusmate-bay5.onrender.com/api/rooms/${roomId}`);
        if (res.data) {
          setRoomDetails(res.data);
          setMessages(res.data.messages || []);
          updateTimeLeft(res.data.expiresAt);
          
          const participants = res.data.participants
            .filter(p => !p.leftAt)
            .map((p) => ({
              id: p.socketId || `user-${p.name}`, // Handle null socketId
              name: p.name,
              isMuted: p.isMuted || false,
              isCameraOff: p.isCameraOff || false,
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
    const handleRoomDetails = (room) => {
      setRoomDetails(room);
      setMessages(room.messages || []);
      updateTimeLeft(room.expiresAt);
      
      const participants = room.participants
        .filter(p => !p.leftAt)
        .map((p) => ({
          id: p.socketId || `user-${p.name}`, // Handle null socketId
          name: p.name,
          isMuted: p.isMuted || false,
          isCameraOff: p.isCameraOff || false,
          isSpeaking: false
        }));
      setUsers(participants);
    };

    const handleUserConnected = ({ socketId, name, isMuted = false, isCameraOff = false }) => {
      setUsers(prev => {
        if (prev.some(user => user.id === socketId)) return prev;
        return [...prev, { 
          id: socketId, 
          name, 
          isMuted, 
          isCameraOff,
          isSpeaking: false 
        }];
      });
      
      if (socketId !== socket.current.id && localStream) {
        createPeerConnection(socketId);
      }
    };

    const handleUserDisconnected = ({ socketId }) => {
      setUsers(prev => prev.filter(user => user.id !== socketId));
      if (pcRefs.current[socketId]) {
        pcRefs.current[socketId].close();
        delete pcRefs.current[socketId];
      }
      setRemoteStreams(prev => {
        const newStreams = {...prev};
        delete newStreams[socketId];
        return newStreams;
      });
    };

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleSignal = async ({ from, signal }) => {
      try {
        if (!pcRefs.current[from]) {
          await createPeerConnection(from);
        }
        
        if (signal.type === 'offer') {
          await pcRefs.current[from].setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pcRefs.current[from].createAnswer();
          await pcRefs.current[from].setLocalDescription(answer);
          socket.current.emit('signal', { to: from, signal: answer });
        } else if (signal.type === 'answer') {
          await pcRefs.current[from].setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate') {
          await pcRefs.current[from].addIceCandidate(new RTCIceCandidate(signal));
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

    socket.current.on('room-details', handleRoomDetails);
    socket.current.on('user-connected', handleUserConnected);
    socket.current.on('user-disconnected', handleUserDisconnected);
    socket.current.on('new-message', handleNewMessage);
    socket.current.on('signal', handleSignal);
    socket.current.on('join-error', handleJoinError);
    socket.current.on('user-updated', handleUserUpdated);

    // Initialize media (commented out for now to focus on chat)
    // initLocalMedia();

    return () => {
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
      
      if (videoRefs.current['local']) {
        videoRefs.current['local'].srcObject = stream;
      }
      
      // Create peer connections for existing users
      users.forEach(user => {
        if (user.id !== socket.current?.id) {
          createPeerConnection(user.id);
        }
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      // Continue without media if access fails
      setIsCameraOff(true);
      setIsMuted(true);
    }
  };

  // Create peer connection
  const createPeerConnection = async (socketId) => {
    try {
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
            signal: event.candidate
          });
        }
      };
      
      // Create offer for new connections
      if (socketId !== socket.current?.id) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.current.emit('signal', {
          to: socketId,
          signal: offer
        });
      }
    } catch (err) {
      console.error('Error creating peer connection:', err);
    }
  };

  // Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket.current?.connected) {
      // Create the message object
      const newMessage = {
        sender: userName,
        content: message,
        isReaction: false,
        timestamp: new Date()
      };
      
      // Emit to socket server
      socket.current.emit('send-message', {
        roomId,
        sender: userName,
        content: message,
        isReaction: false
      });
      
      // Update local state
      // setMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  // Handle sending reactions
  const handleSendReaction = (reaction) => {
    if (socket.current?.connected) {
      // Create the reaction message
      const reactionMessage = {
        sender: userName,
        content: reaction,
        isReaction: true,
        timestamp: new Date()
      };
      
      // Emit to socket server
      socket.current.emit('send-message', {
        roomId,
        sender: userName,
        content: reaction,
        isReaction: true
      });
      
      // Update local state
      setMessages(prev => [...prev, reactionMessage]);
      setActiveReaction(reaction);
      setShowReactions(false);
      setTimeout(() => setActiveReaction(null), 2000);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      
      if (socket.current?.connected) {
        socket.current.emit('user-update', { 
          roomId, 
          isMuted: !isMuted 
        });
      }
    } else {
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
      
      if (socket.current?.connected) {
        socket.current.emit('user-update', { 
          roomId, 
          isCameraOff: !isCameraOff 
        });
      }
    } else {
      setIsCameraOff(!isCameraOff);
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

  useEffect(() => {
    // Initialize media once connection is established
    if (connectionStatus === 'connected') {
      initLocalMedia();
    }
  }, [connectionStatus]);

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
          <h2 className="text-xl font-bold">Welcome to {roomDetails?.name}'s Room</h2>
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
            <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden h-full relative">
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
            {users.filter(user => user.id !== 'local' && user.id !== socket.current?.id).map(user => (
              <div 
                key={user.id || `user-${user.name}-${Math.random().toString(36).substr(2, 9)}`}
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
                key={`msg-${index}-${msg.timestamp || Date.now()}-${msg.sender}`}
                className={`mb-3 ${msg.isReaction ? 'text-2xl text-center' : ''}`}
              >
                {!msg.isReaction && (
                  <div className="font-semibold text-red-400">{msg.sender}</div>
                )}
                <div>{msg.content}</div>
              </div>
            ))}
            <div ref={messageEndRef} />
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