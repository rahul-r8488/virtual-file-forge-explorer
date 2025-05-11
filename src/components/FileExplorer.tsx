
import React, { useState } from 'react';
import { FileSystemNode, DirectoryNode, FileSystem } from '../models/fileSystem';
import { getDirectoryChildren, getNodePath, getFileIcon, hasPermission } from '../utils/fileSystemUtils';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

interface FileExplorerProps {
  fileSystem: FileSystem;
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
}

const FileExplorerItem: React.FC<{
  node: FileSystemNode;
  fileSystem: FileSystem;
  level: number;
  onNodeSelect: (nodeId: string) => void;
  isSelected: boolean;
  expandedDirs: Set<string>;
  toggleDir: (dirId: string) => void;
}> = ({ node, fileSystem, level, onNodeSelect, isSelected, expandedDirs, toggleDir }) => {
  const isExpanded = node.isDirectory && expandedDirs.has(node.id);
  const hasReadPermission = hasPermission(fileSystem, node.id, 'read');

  let children = [];
  if (node.isDirectory && isExpanded && hasReadPermission) {
    const dirNode = node as DirectoryNode;
    children = getDirectoryChildren(fileSystem, node.id);
  }

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 px-1 cursor-pointer hover:bg-gray-100 rounded ${
          isSelected ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => onNodeSelect(node.id)}
        onDoubleClick={() => {
          if (node.isDirectory) {
            toggleDir(node.id);
          }
        }}
      >
        <span className="w-5 flex-shrink-0">
          {node.isDirectory && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                toggleDir(node.id);
              }}
              className="cursor-pointer"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </span>
        <span className="w-5 flex-shrink-0 mr-1">
          {node.isDirectory ? <Folder size={16} className="text-blue-500" /> : <File size={16} className="text-gray-500" />}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {isExpanded && hasReadPermission && (
        <div>
          {children.map((child) => (
            <FileExplorerItem
              key={child.id}
              node={child}
              fileSystem={fileSystem}
              level={level + 1}
              onNodeSelect={onNodeSelect}
              isSelected={isSelected && child.id === fileSystem.currentDirectory}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
          {children.length === 0 && (
            <div 
              className="text-gray-400 italic text-sm py-1" 
              style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }}
            >
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ fileSystem, onNodeSelect, selectedNodeId }) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([fileSystem.currentDirectory]));

  const toggleDir = (dirId: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId);
    } else {
      newExpanded.add(dirId);
    }
    setExpandedDirs(newExpanded);
  };

  // Find root directory
  const rootNode = Object.values(fileSystem.nodes).find(node => node.parentId === null);

  if (!rootNode) {
    return <div className="p-4 text-red-500">Error: Root directory not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto h-full">
      <div className="p-2 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">
        File Explorer
      </div>
      <div className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
        <FileExplorerItem
          node={rootNode}
          fileSystem={fileSystem}
          level={0}
          onNodeSelect={onNodeSelect}
          isSelected={selectedNodeId === rootNode.id}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
        />
      </div>
    </div>
  );
};

export default FileExplorer;
