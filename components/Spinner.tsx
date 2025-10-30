
import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-purple-500 border-t-transparent"></div>
      {text && <p className="text-purple-300 font-semibold">{text}</p>}
    </div>
  );
};

export default Spinner;
