import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const Roome = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [videoStream, setVideoStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const videoRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize socket connection on join
  useEffect(() => {
    socketRef.current = io.connect("https://focusmate-bay5.onrender.com");

    // Handle joining the room
    socketRef.current.emit("join-room", { roomId });

    // Listen for incoming messages
    socketRef.current.on("receive-message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    });

    // Get local media stream
    const getMediaStream = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === "videoinput");
          
          // Choose default camera (or the first available)
          const constraints = {
            video: {
              deviceId: videoDevices[0]?.deviceId
            },
            audio: true
          };
      
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing media devices", err);
        }
      };
      

    getMediaStream();

    return () => {
      socketRef.current.disconnect();
      videoStream?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId]);

  // Send message to the room
  const sendMessage = () => {
    if (chatMessage.trim() !== "") {
      socketRef.current.emit("send-message", {
        roomId,
        message: chatMessage,
      });
      setChatMessage("");
    }
  };

  // Mute/unmute audio
  const toggleMute = () => {
    if (!videoStream) return;
    const audioTracks = videoStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !audioTracks[0].enabled;
      setIsMuted(!audioTracks[0].enabled);
    }
  };
  

  // Turn off/on the camera
  const toggleCamera = () => {
    const newCameraStatus = !isCameraOff;
    setIsCameraOff(newCameraStatus);
    videoStream.getTracks().forEach((track) => {
      if (track.kind === "video") {
        track.enabled = !newCameraStatus;
      }
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-1 flex flex-col-reverse md:flex-row p-4 space-x-4">
        {/* Video Section */}
        <div className="flex-1 bg-black relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          ></video>
          {/* Display Other Users' Video */}
          <div className="absolute top-4 left-4 bg-white p-2 rounded-md">
            <span className="text-black">Other Users' Videos</span>
            {/* Add other user video elements here */}
          </div>
        </div>

        {/* Controls Section */}
        <div className="w-full md:w-1/3 bg-white p-4 space-y-4 flex flex-col">
          <div className="flex justify-between items-center">
            <button
              onClick={toggleMute}
              className={`${
                isMuted ? "bg-red-500" : "bg-green-500"
              } text-white p-2 rounded-md`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={toggleCamera}
              className={`${
                isCameraOff ? "bg-gray-500" : "bg-blue-500"
              } text-white p-2 rounded-md`}
            >
              {isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            </button>
          </div>

          <div className="flex justify-between items-center">
            <button className="bg-red-500 text-white p-2 rounded-md">
              Leave Room
            </button>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-full bg-gray-800 p-4 text-white flex flex-col space-y-4">
        <div className="overflow-y-scroll max-h-72">
          {messages.map((msg, index) => (
            <div key={index} className="p-2">
              <strong>{msg.sender}:</strong> {msg.message}
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="flex-1 p-2 rounded-md"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white p-2 rounded-md ml-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Roome;
