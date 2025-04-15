import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import React, { useRef, useEffect } from "react";

export const MovingText = () => {
  const targetRef = useRef(null);
  const selfScroll = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  // Update self-scroll animation
  useEffect(() => {
    const interval = setInterval(() => {
      const current = selfScroll.get();
      selfScroll.set(current + 0.002);
      if (current > 1) selfScroll.set(0);
    }, 16);
    return () => clearInterval(interval);
  }, [selfScroll]);

  // Left moving row (top)
  const leftXExternal = useTransform(scrollYProgress, [0, 1], [0, -2000]);
  const leftXInternal = useTransform(selfScroll, [0, 1], [0, -500]);
  const leftX = useSpring(
    useTransform(
      [leftXExternal, leftXInternal],
      ([external, internal]) => external + internal
    ),
    { stiffness: 300, damping: 30 }
  );

  // Right moving row (bottom)
  const rightXExternal = useTransform(scrollYProgress, [0, 1], [-2000, 2000]);
  const rightXInternal = useTransform(selfScroll, [0, 1], [0, 500]);
  const rightX = useSpring(
    useTransform(
      [rightXExternal, rightXInternal],
      ([external, internal]) => external + internal
    ),
    { stiffness: 300, damping: 30 }
  );

  const features = [
    {
      title: "Study Rooms",
      description: "Join focused study sessions with like-minded people",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Video Calls",
      description: "Study together with crystal clear video",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "bg-purple-100 text-purple-800",
    },
    {
      title: "Group Chat",
      description: "Collaborate and ask questions in real-time",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Focus Timer",
      description: "Pomodoro-style timer to maintain productivity",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "bg-red-100 text-red-800",
    },
    {
      title: "Task Lists",
      description: "Track your study goals and progress",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      title: "Screen Sharing",
      description: "Present your work to study partners",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "bg-indigo-100 text-indigo-800",
    },
  ];

  return (
    <section
      ref={targetRef}
      className="h-[120vh] bg-neutral-50 text-neutral-950 relative overflow-hidden"
    >
      <div className="sticky top-0 h-screen flex flex-col justify-center">
        {/* Top row - moves left */}
        <motion.div style={{ x: leftX }} className="flex gap-8 py-4 w-max">
          {[...features, ...features, ...features].map((feature, index) => (
            <div
              key={`top-${index}`}
              className={`flex-shrink-0 w-64 h-80 rounded-2xl p-6 flex flex-col items-center ${feature.color}`}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-center">
                  {feature.title}
                </h3>
                <p className="text-sm text-center">{feature.description}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Bottom row - moves right */}
        <motion.div
          style={{ x: rightX }}
          className="flex gap-8 py-4 w-max mt-8"
        >
          {[...features, ...features, ...features].map((feature, index) => (
            <div
              key={`bottom-${index}`}
              className={`flex-shrink-0 w-56 h-72 rounded-2xl p-4 flex flex-col items-center ${feature.color}`}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-center">
                  {feature.title}
                </h3>
                <p className="text-sm text-center">{feature.description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
