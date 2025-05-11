
import React from 'react';
import FileSystem from '../components/FileSystem';

const Index = () => {
  return (
    <div className="container mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Virtual File System Simulator</h1>
        <p className="text-gray-600">
          Explore and interact with a simulated file system using Unix-like commands
        </p>
      </header>
      
      <FileSystem />
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>
          Available commands: ls, cd, pwd, mkdir, touch, cat, rm, clear, help
        </p>
        <p className="mt-2">
          Try creating files and directories to see the block allocation in action!
        </p>
      </footer>
    </div>
  );
};

export default Index;
