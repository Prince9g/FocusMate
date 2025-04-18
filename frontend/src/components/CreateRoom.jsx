import React, { useRef, useState } from "react";
import Modal from "react-modal";
import axios from "axios";
import CreateRoomOpen from "./CreateRoomOpen";

Modal.setAppElement("#root");

const CreateRoom = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [roomDetails, setRoomDetails] = useState(null); 
  const name = useRef();
  const duration = useRef();

  const onCreateHandler = async () => {
    try {
      const userName = name.current.value;
      localStorage.setItem("focusRoomUser", userName);
      const res = await axios.post("http://localhost:8080/api/rooms/create", {
        duration: duration.current.value, name: name.current.value,
      });

      if (res.data) {
        console.log(res.data);
        setModalIsOpen(false); 
        setRoomDetails({ roomId: res.data.roomId, passcode: res.data.password });
      }
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  return (
    <div>
      <button
        onClick={() => setModalIsOpen(true)}
        className="bg-red-300 text-white px-4 py-2 mx-auto w-48 rounded-full mt-6 hover:bg-transparent hover:text-black hover:border-2 hover:border-red-500 transition duration-300"
      >
        Create Room
      </button>

      {/* Room Creation Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-slate-100 p-6 rounded-3xl shadow-lg w-1/3 max-w-lg mx-auto"
        overlayClassName="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="flex flex-col items-center gap-5">
          <h2 className="text-3xl font-bold">Welcome to FocusMate</h2>
          <p className="text-xl font-semibold text-purple-400 shadow-sm">
            Let's create your Room
          </p>
          <div className="w-full">
            <div className="flex flex-col gap-2 w-full">
              <div className="text-lg font-semibold">Enter Your Name:</div>
              <input
                type="text"
                required
                ref={name}
                placeholder="Your Name"
                className="border border-gray-300 p-2 rounded-md w-full"
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="text-lg font-semibold">Enter Duration For Room:</div>
              <input
                type="text"
                required
                ref={duration}
                placeholder="Duration in minutes"
                className="border border-gray-300 p-2 rounded-md w-full"
              />
            </div>
          </div>
          <button
            className="p-2 bg-red-300 rounded-lg text-white font-semibold"
            onClick={onCreateHandler}
          >
            Create Room Credentials
          </button>
        </div>
      </Modal>

      {/* Room Info Modal */}
      {roomDetails && (
        <CreateRoomOpen
          roomId={roomDetails.roomId}
          passcode={roomDetails.passcode}
        />
      )}
    </div>
  );
};

export default CreateRoom;
