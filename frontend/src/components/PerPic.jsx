import React from "react";

const PerPic = ({ title, description, imageUrl, link }) => {
  return (
    <div className="dark:text-white flex items-center justify-center">
      <a href={link} target="_blank" className="flex flex-col items-center justify-center">
        <div className="w-64 h-64 md:w-96 md:h-96 mb-4">
          <img
            src={imageUrl}
            alt="Image"
            className="w-full h-full object-cover rounded-full mb-4"
          />
        </div>
        <div className="flex flex-col items-center justify-center text-center">
        <div className="text-xl text-purple-400 md:text-3xl font-serif w-3/4">{title}</div>
        <div className="text-lg md:text-xl w-3/4">{description}</div>
        </div>
      </a>
    </div>
  );
};

export default PerPic;
