// components/Footer.jsx
import { motion } from "framer-motion";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";
export const Footer = () => {
  return (
    <footer className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 mt-10">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center border-t border-neutral-300 dark:border-neutral-700">
        
        {/* Brand */}
        <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 md:mb-0">
          FocusMate<span className="text-blue-500">.</span>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-6 text-sm">
          <a href="#" className="hover:text-blue-500 transition-colors">How it works</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Features</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Contact Us</a>
        </nav>

        {/* Social Icons */}
        <div className="mt-4 md:mt-0 flex space-x-4">
          <motion.a whileHover={{ scale: 1.1 }} href="https://github.com/Prince9g/FocusMate" target="_blank">
            <FaGithub className="text-xl hover:text-blue-500" />
          </motion.a>
          <motion.a whileHover={{ scale: 1.1 }} href="https://x.com/Prince03112002" target="_blank">
            <FaTwitter className="text-xl hover:text-blue-500" />
          </motion.a>
          <motion.a whileHover={{ scale: 1.1 }} href="https://www.linkedin.com/in/prince-sharma-a38a11254" target="_blank">
            <FaLinkedin className="text-xl hover:text-blue-500" />
          </motion.a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="text-center text-xs text-neutral-500 py-4 border-t border-neutral-200 dark:border-neutral-700">
        © {new Date().getFullYear()} FocusMate. All rights reserved.
      </div>
    </footer>
  );
};
