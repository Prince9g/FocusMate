import axios from "axios";
import React, { useRef, useState } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

Modal.setAppElement("#root");

const JoinRoom = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();
  const roomId = useRef();
  const passcode = useRef();
  const name = useRef();
  const joinRoomhandler = async () => {
    try {
      const res = await axios.post("http://localhost:8080/api/rooms/join", {
        roomId: roomId.current.value,
        password: passcode.current.value,
        name: name.current.value,
      });
      if (res.data) {
        // const username = res.data.room.name;
        localStorage.setItem("focusRoomUser", name.current.value);
        setModalIsOpen(false);
        toast.success(res.data.message);
        const rome = roomId.current.value;
        setTimeout(()=>{
          console.log("navigating to room");
          navigate(`/room/${rome}`);
        }, 3000);
      }
    }
    catch (error) {
      toast.error(error.response.data.message);
      setModalIsOpen(false);
    }
  };
  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <button
        onClick={() => setModalIsOpen(true)}
        className="bg-red-300 text-white px-4 py-2 mx-auto w-48 rounded-full mt-4 md:mt-6 hover:bg-transparent hover:text-black dark:text-white hover:border-2 hover:border-red-500 transition duration-300"
      >
        Join Room via Code
      </button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-slate-100 dark:bg-slate-900 p-6 rounded-3xl shadow-lg w-[95%] md:w-1/3 max-w-lg mx-auto"
        overlayClassName="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="flex flex-col items-center gap-3 md:gap-5">
        <h2 className="text-xl font-serif md:text-3xl font-bold dark:text-white">Welcome to FocusMate</h2>
        <p className="text-lg md:text-xl font-semibold text-purple-400 shadow-sm">Join Room</p>
        <div className="w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold dark:text-white">Enter Your Name:</div>
            <input
              type="text"
              ref={name}
              placeholder="Your Name"
              className="border border-gray-300 p-2 rounded-md w-full "
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold dark:text-white">Enter Room Code:</div>
            <input
              type="text"
              ref={roomId}
              placeholder="Room Code"
              className="border border-gray-300 p-2 rounded-md w-full"
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="text-lg font-semibold dark:text-white">Enter Passcode:</div>
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
