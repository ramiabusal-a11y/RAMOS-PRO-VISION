import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = "جاري المعالجة..." }) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
      <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-4" />
      <p className="text-lg font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default Loader;