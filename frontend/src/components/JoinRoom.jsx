import axios from "axios";
import React, { useRef, useState } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

const JoinRoom = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();
  const roomId = useRef();
  const passcode = useRef();
  const joinRoomhandler = async () => {
    try {
      const res = await axios.post("http://localhost:8080/api/rooms/join", {
        roomId: roomId.current.value,
        password: passcode.current.value,
      });
      if (res.data) {
        console.log(res.data);
        setModalIsOpen(false);
        navigate(`/room/${roomId.current.value}`);
      }
    }
    catch (error) {
      console.error("Error joining room:", error);
    }
  };
  return (
    <div>
      <button
        onClick={() => setModalIsOpen(true)}
        className="bg-red-300 text-white px-4 py-2 mx-auto w-48 rounded-full mt-6 hover:bg-transparent hover:text-black hover:border-2 hover:border-red-500 transition duration-300"
      >
        Join Room via Code
      </button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-slate-100 p-6 rounded-3xl shadow-lg w-1/3 max-w-lg mx-auto"
        overlayClassName="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="flex flex-col items-center gap-5">
        <h2 className="text-3xl font-bold ">Welcome to FocusMate</h2>
        <p className="text-xl font-semibold text-purple-400 shadow-sm">Join Room</p>
        <div className="w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold">Enter Your Name:</div>
            <input
              type="text"
              placeholder="Your Name"
              className="border border-gray-300 p-2 rounded-md w-full "
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold">Enter Room Code:</div>
            <input
              type="text"
              ref={roomId}
              placeholder="Room Code"
              className="border border-gray-300 p-2 rounded-md w-full"
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold">Enter Passcode:</div>
            <input
              type="password"
              ref={passcode}
              placeholder="Passcode"
              className="border border-gray-300 p-2 rounded-md w-full"
            />
          </div>
        </div>
          <button className="p-2 bg-red-300 rounded-lg text-white font-semibold" onClick={joinRoomhandler}>Join Campanion</button>
        </div>
      </Modal>
    </div>
  );
};

export default JoinRoom;
