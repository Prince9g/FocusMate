import React from "react";
import video from "../assets/video.mp4";
import Circle from "./Circle";
import Diamond from "./Diamond";
const HeroSection = () => {
  return (
    <div className="mx-4 relative">
        <div className="absolute z-[-1] opacity-20 top-2"><Circle/></div>
        <div className="absolute z-[-1] opacity-20 bottom-2 right-[650px]"> <Diamond/> </div>
      <div className="flex items-center justify-evenly h-[90vh]">
        {/* left section  */}
        <div className="flex w-1/2 flex-col justify-center">
            <h1 className="text-5xl font-bold text-center ">
            Boost your focus with real-time Pomodoro rooms
            </h1>
            <p className="text-xl mt-4 w-2/3 mx-auto text-start">
            Join distraction-free virtual rooms and stay productive with friends, classmates, or teammates. Track time, stay accountable, and get into your flow — together.
            </p>
            <button className="bg-red-300 text-white px-4 py-2 mx-auto w-1/4 rounded-full mt-6 hover:bg-transparent hover:text-black hover:border-2 hover:border-red-500 transition duration-300">
                Create Room
            </button>
            <button className="bg-red-300 text-white px-4 py-2 mx-auto w-1/4 rounded-full mt-6 hover:bg-transparent hover:text-black hover:border-2 hover:border-red-500 transition duration-300">
                Join Room via Code
            </button>
        </div>
        {/* right section  */}
        <div className="w-1/2 flex items-center justify-center">  
            <video
                src={video}
                autoPlay
                loop
                muted
                alt="FocusMate"
                className="mx-auto rounded-2xl shadow-lg"
            />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
