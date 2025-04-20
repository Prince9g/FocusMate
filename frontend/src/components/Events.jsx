import React from "react";
import maintain from "../assets/Maintenance.gif";
const Events = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[90vh] gap-5">
      <div className="w[300px] h-[300px] dark:hidden">
        <img
          src={maintain}
          alt="maintain"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="text-4xl font-semibold dark:text-white dark:h-screen dark:flex dark:items-center">Coming Soon...</div>
    </div>
  );
};

export default Events;
