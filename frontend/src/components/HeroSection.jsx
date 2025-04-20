import React from "react";
import video from "../assets/video.mp4";
import Circle from "./Circle";
import Diamond from "./Diamond";
import CreateRoom from "./CreateRoom";
import JoinRoom from "./JoinRoom";
const HeroSection = () => {
  return (
    <div className="mx-4 dark:text-white relative">
        <div className="absolute z-[-1] dark:z-0 opacity-20 top-2"><Circle/></div>
        <div className="absolute z-[-1] opacity-20 bottom-2 right-2 md:bottom-2 md:right-[650px]"> <Diamond/> </div>
      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-evenly h-full md:h-[90vh]">
        {/* left section  */}
        <div className="flex md:w-1/2 flex-col justify-center items-center">
            <h1 className="text-3xl md:text-5xl font-bold text-center ">
            Boost your focus with real-time Pomodoro rooms
            </h1>
            <p className="text-xl mt-4 md:w-2/3 mx-auto text-justify md:text-start">
            Join distraction-free virtual rooms and stay productive with friends, classmates, or teammates. Track time, stay accountable, and get into your flow — together.
            </p>
            <CreateRoom/>
            <JoinRoom/>
        </div>
        {/* right section  */}
        <div className="md:w-1/2 my-4 md:my-0 flex items-center justify-center">  
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
