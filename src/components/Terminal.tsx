
import React, { useState, useEffect, useRef } from 'react';
import { FileSystem } from '../models/fileSystem';
import { getNodePath, executeCommand, parseCommand } from '../utils/fileSystemUtils';

interface TerminalProps {
  fileSystem: FileSystem;
  onFileSystemChange: (newFileSystem: FileSystem) => void;
}

const Terminal: React.FC<TerminalProps> = ({ fileSystem, onFileSystemChange }) => {
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [outputHistory, setOutputHistory] = useState<string[]>([
    'Virtual File System Simulator v1.0',
    'Type "help" for a list of available commands.',
    ''
  ]);
  
  const [currentCommand, setCurrentCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when the terminal is clicked
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Auto-scroll to bottom when terminal content changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [outputHistory, commandHistory]);
  
  // Execute a command
  const handleCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    
    // Add command to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    
    // Special case for 'clear'
    if (cmd.trim() === 'clear') {
      setOutputHistory([]);
      setCurrentCommand('');
      return;
    }
    
    // Special case for 'help'
    if (cmd.trim() === 'help') {
      setOutputHistory(prev => [...prev, 
        `$ ${cmd}`,
        'Available commands:',
        '  ls       - List directory contents',
        '  cd       - Change directory',
        '  pwd      - Print working directory',
        '  mkdir    - Create a new directory',
        '  touch    - Create a new empty file',
        '  cat      - Display file contents',
        '  rm       - Remove files or directories',
        '  clear    - Clear terminal output',
        '  help     - Display this help message',
        ''
      ]);
      setCurrentCommand('');
      return;
    }
    
    // Execute the command
    const { output, newFileSystem } = executeCommand(fileSystem, cmd);
    
    // Update output history
    setOutputHistory(prev => [
      ...prev, 
      `$ ${cmd}`,
      ...(output ? output.split('\n') : []),
      ''
    ]);
    
    // Update file system
    onFileSystemChange(newFileSystem);
    
    setCurrentCommand('');
  };
  
  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(currentCommand);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      setCurrentCommand(
        newIndex >= 0 
          ? commandHistory[commandHistory.length - 1 - newIndex] 
          : ''
      );
    }
  };
  
  // Current directory path for prompt
  const currentDirPath = getNodePath(fileSystem, fileSystem.currentDirectory);
  const currentUser = fileSystem.users[fileSystem.currentUser]?.username || 'user';
  const prompt = `${currentUser}:${currentDirPath}$ `;

  return (
    <div 
      ref={terminalRef}
      className="bg-gray-900 text-gray-100 rounded-lg shadow-sm h-full overflow-y-auto font-mono text-sm p-2"
      onClick={focusInput}
    >
      <div className="whitespace-pre-wrap">
        {outputHistory.map((line, i) => (
          <div key={i} className="leading-6">
            {line.startsWith('$ ') ? <span><span className="text-green-400">{prompt}</span>{line.substring(2)}</span> : line}
          </div>
        ))}
        <div className="flex">
          <span className="text-green-400 flex-shrink-0">{prompt}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent outline-none border-none flex-grow"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
