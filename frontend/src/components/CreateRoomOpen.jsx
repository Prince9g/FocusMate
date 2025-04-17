import React, { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
Modal.setAppElement("#root"); // Prevent accessibility issues

const CreateRoomOpen = ({roomId, passcode}) => {
  const [modalIsOpen, setModalIsOpen] = useState(true);
  const navigate = useNavigate();
  const onRoomClick = ()=> {
    setModalIsOpen(false);
    navigate(`/room/${roomId}`);
  }
  return (
    <div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-slate-100 p-6 rounded-3xl shadow-lg w-1/3 max-w-lg mx-auto"
        overlayClassName="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="flex flex-col items-center gap-5">
        <h2 className="text-3xl font-bold ">Room Credentials</h2>
        <p className="text-xl font-semibold text-purple-400 shadow-sm">Room Id: <span className="text-red-400">{roomId}</span></p>
        <p className="text-xl font-semibold text-purple-400 shadow-sm">Passcode: <span className="text-red-400">{passcode}</span></p>
          <button className="p-2 bg-red-300 rounded-2xl w-1/2 text-white font-semibold" onClick={onRoomClick}>Enter in the Room</button>
        </div>
      </Modal>
    </div>
  );
};

export default CreateRoomOpen;
