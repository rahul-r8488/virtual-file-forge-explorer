
import React from 'react';
import { FileSystem, FileNode } from '../models/fileSystem';

interface DiskVisualizerProps {
  fileSystem: FileSystem;
}

// Map of colors for different files
const getRandomColor = (fileId: string) => {
  // Generate a deterministic color based on the fileId
  let hash = 0;
  for (let i = 0; i < fileId.length; i++) {
    hash = fileId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 80%, 65%)`;
};

const DiskVisualizer: React.FC<DiskVisualizerProps> = ({ fileSystem }) => {
  // Group blocks by file ID
  const fileBlocks: Record<string, {
    fileId: string,
    fileName: string,
    blocks: number[],
    color: string
  }> = {};
  
  // Map blocks to files
  fileSystem.blocks.forEach((block, index) => {
    if (block.fileId) {
      if (!fileBlocks[block.fileId]) {
        const fileNode = Object.values(fileSystem.nodes)
          .find(node => node.id === block.fileId) as FileNode | undefined;
          
        fileBlocks[block.fileId] = {
          fileId: block.fileId,
          fileName: fileNode?.name || 'Unknown File',
          blocks: [],
          color: getRandomColor(block.fileId)
        };
      }
      
      fileBlocks[block.fileId].blocks.push(index);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full overflow-hidden flex flex-col">
      <div className="p-2 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">
        Disk Block Allocation ({fileSystem.allocationStrategy})
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="grid grid-cols-10 gap-1">
          {fileSystem.blocks.map((block, index) => (
            <div
              key={index}
              className="w-full aspect-square flex items-center justify-center text-xs rounded border"
              style={{
                backgroundColor: block.fileId ? fileBlocks[block.fileId].color : 'transparent',
                borderColor: block.fileId ? fileBlocks[block.fileId].color : '#e2e8f0'
              }}
              title={block.fileId 
                ? `Block ${index}: ${fileBlocks[block.fileId].fileName}`
                : `Block ${index}: Free`
              }
            >
              {index}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-sm">
          <h3 className="font-medium text-gray-700 mb-2">Legend</h3>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-4 h-4 border border-gray-300 mr-2"></div>
              <span>Free Block</span>
            </div>
            {Object.values(fileBlocks).map(file => (
              <div key={file.fileId} className="flex items-center">
                <div 
                  className="w-4 h-4 mr-2"
                  style={{ backgroundColor: file.color }}
                ></div>
                <span>{file.fileName} ({file.blocks.length} blocks)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiskVisualizer;
