import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

const ResponsiveNav = ({ open, setOpen}) => {
  const handleClick = () => {
    setOpen(!open);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y:-100 }}
          animate={{ opacity: 1, y:0 }}
          exit={{ opacity: 0 , y:-100}}
          className="absolute top-20 left-0 w-full h-screen z-20"
        >
          <div className="text-xl font-semibold uppercase bg-red-300 text-white py-10 m-6 rounded-3xl">
            <ul className="flex flex-col justify-center items-center gap-10">
                <Link to="/" onClick={handleClick}><li>Home</li></Link>
                <Link to="/how-it-works" onClick={handleClick}><li>How It Works</li></Link>
                <Link to="/events" onClick={handleClick}><li>Events</li></Link>
                <Link to="#" onClick={handleClick}><li>Contact Us</li></Link>
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResponsiveNav;
