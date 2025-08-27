import React from 'react';

// Minimal Canvas for debugging

const Canvas: React.FC = () => {
  // ULTRA-MINIMAL CANVAS TO TEST RE-RENDER ISSUE
  
  return (
    <div className="canvas-wrapper h-full bg-gray-50 dark:bg-gray-900">
      <div className="text-sm p-4">
        ULTRA-MINIMAL Canvas - Testing for infinite re-render
      </div>
      
      <div className="canvas-content bg-white dark:bg-gray-900 m-4 border">
        <div className="p-4">Canvas placeholder</div>
      </div>
    </div>
  );
};

export default Canvas;
