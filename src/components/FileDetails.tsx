
import React from 'react';
import { FileSystem, FileSystemNode, FileNode, DirectoryNode } from '../models/fileSystem';
import { formatSize, formatDate, getNodePath } from '../utils/fileSystemUtils';
import { File, Folder, Clock, Calendar, User, Lock, HardDrive } from 'lucide-react';

interface FileDetailsProps {
  fileSystem: FileSystem;
  selectedNodeId: string | null;
}

const FileDetails: React.FC<FileDetailsProps> = ({ fileSystem, selectedNodeId }) => {
  if (!selectedNodeId || !fileSystem.nodes[selectedNodeId]) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full p-4 flex flex-col items-center justify-center text-gray-500">
        <File size={48} className="mb-2 opacity-30" />
        <p>No file selected</p>
      </div>
    );
  }

  const node = fileSystem.nodes[selectedNodeId];
  const isDirectory = node.isDirectory;
  const path = getNodePath(fileSystem, selectedNodeId);
  
  // Get owner name
  const owner = fileSystem.users[node.owner]?.username || 'Unknown';
  
  // Get permission string
  const permissions: string[] = [];
  const nodePermission = node.permissions[node.owner];
  if (nodePermission) {
    if (nodePermission.read) permissions.push('Read');
    if (nodePermission.write) permissions.push('Write');
    if (nodePermission.execute) permissions.push('Execute');
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full overflow-hidden flex flex-col">
      <div className="p-2 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">
        Properties
      </div>
      
      <div className="p-4 overflow-y-auto">
        <div className="flex items-center mb-4">
          {isDirectory ? (
            <Folder size={40} className="text-blue-500 mr-3" />
          ) : (
            <File size={40} className="text-gray-500 mr-3" />
          )}
          <div>
            <h2 className="text-lg font-medium">{node.name}</h2>
            <p className="text-sm text-gray-500">{path}</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 text-gray-500" />
            <span className="text-gray-700 w-32">Created:</span>
            <span>{formatDate(node.metadata.createdAt)}</span>
          </div>
          
          <div className="flex items-center">
            <Clock size={16} className="mr-2 text-gray-500" />
            <span className="text-gray-700 w-32">Modified:</span>
            <span>{formatDate(node.metadata.modifiedAt)}</span>
          </div>
          
          <div className="flex items-center">
            <HardDrive size={16} className="mr-2 text-gray-500" />
            <span className="text-gray-700 w-32">Size:</span>
            <span>{formatSize(node.metadata.size)}</span>
          </div>
          
          <div className="flex items-center">
            <User size={16} className="mr-2 text-gray-500" />
            <span className="text-gray-700 w-32">Owner:</span>
            <span>{owner}</span>
          </div>
          
          <div className="flex items-center">
            <Lock size={16} className="mr-2 text-gray-500" />
            <span className="text-gray-700 w-32">Permissions:</span>
            <span>{permissions.join(', ') || 'None'}</span>
          </div>
        </div>
        
        {!isDirectory && (node as FileNode).blockAllocation && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">Block Allocation</h3>
            <p><span className="text-gray-700">Strategy:</span> {(node as FileNode).blockAllocation.strategy}</p>
            <p>
              <span className="text-gray-700">Blocks:</span> {(node as FileNode).blockAllocation.blocks.length} 
              {(node as FileNode).blockAllocation.strategy === 'contiguous' && (
                <span className="text-gray-500 text-xs ml-2">
                  ({(node as FileNode).blockAllocation.startBlock} - {
                    (node as FileNode).blockAllocation.startBlock! + 
                    (node as FileNode).blockAllocation.blocks.length - 1
                  })
                </span>
              )}
            </p>
          </div>
        )}
        
        {isDirectory && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">Directory Contents</h3>
            <p><span className="text-gray-700">Items:</span> {(node as DirectoryNode).children.length}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDetails;
