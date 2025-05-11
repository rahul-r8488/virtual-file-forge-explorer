
import React, { useState } from 'react';
import { FileSystem as FileSystemType } from '../models/fileSystem';
import { initializeFileSystem } from '../utils/fileSystemUtils';
import FileExplorer from './FileExplorer';
import Terminal from './Terminal';
import DiskVisualizer from './DiskVisualizer';
import FileDetails from './FileDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FileSystem: React.FC = () => {
  // Initialize file system with 50 blocks of 1024 bytes each
  const [fileSystem, setFileSystem] = useState<FileSystemType>(initializeFileSystem(1024, 50));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(Object.values(fileSystem.nodes).find(node => node.parentId === null)?.id || null);
  
  const handleFileSystemChange = (newFileSystem: FileSystemType) => {
    setFileSystem(newFileSystem);
  };
  
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-120px)]">
      {/* Left Panel - File Explorer */}
      <div className="col-span-1 h-full">
        <FileExplorer 
          fileSystem={fileSystem} 
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      </div>
      
      {/* Middle & Right Panels */}
      <div className="col-span-2 flex flex-col gap-4 h-full">
        {/* Top Section - File Details */}
        <div className="h-1/2">
          <FileDetails fileSystem={fileSystem} selectedNodeId={selectedNodeId} />
        </div>
        
        {/* Bottom Section - Tabs for Terminal and Disk Visualizer */}
        <div className="h-1/2">
          <Tabs defaultValue="terminal" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
              <TabsTrigger value="disk">Disk Blocks</TabsTrigger>
            </TabsList>
            <TabsContent value="terminal" className="h-[calc(100%-40px)]">
              <Terminal 
                fileSystem={fileSystem}
                onFileSystemChange={handleFileSystemChange}
              />
            </TabsContent>
            <TabsContent value="disk" className="h-[calc(100%-40px)]">
              <DiskVisualizer fileSystem={fileSystem} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FileSystem;
