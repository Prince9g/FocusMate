import React from "react";
import { HowList } from "./HowList";

const HowWorks = () => {
  return (
    <div>
        <div>
            <div className="text-3xl font-semibold text-center">Frequently Asked Question</div>
        </div>
      <div className="mx-4 mt-10 flex flex-col items-start justify-center gap-10">
        {HowList.map((item) => {
          return (
            <div key={item.ques}>
              <div className="text-xl font-semibold text-purple-500">
                {item.ques}
                </div>
              <div className="text-lg text-gray-700 mt-2">
                {item.ans}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HowWorks;
