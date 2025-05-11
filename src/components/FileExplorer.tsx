
import React, { useState } from 'react';
import { FileSystemNode, DirectoryNode, FileSystem } from '../models/fileSystem';
import { getDirectoryChildren, getNodePath, getFileIcon, hasPermission, moveNode } from '../utils/fileSystemUtils';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

interface FileExplorerProps {
  fileSystem: FileSystem;
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
  onFileSystemChange?: (newFileSystem: FileSystem) => void;
}

const FileExplorerItem: React.FC<{
  node: FileSystemNode;
  fileSystem: FileSystem;
  level: number;
  onNodeSelect: (nodeId: string) => void;
  isSelected: boolean;
  expandedDirs: Set<string>;
  toggleDir: (dirId: string) => void;
  onFileSystemChange?: (newFileSystem: FileSystem) => void;
}> = ({ node, fileSystem, level, onNodeSelect, isSelected, expandedDirs, toggleDir, onFileSystemChange }) => {
  const isExpanded = node.isDirectory && expandedDirs.has(node.id);
  const hasReadPermission = hasPermission(fileSystem, node.id, 'read');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Get children if directory is expanded
  let children = [];
  if (node.isDirectory && isExpanded && hasReadPermission) {
    const dirNode = node as DirectoryNode;
    children = getDirectoryChildren(fileSystem, node.id);
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('nodeId', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.isDirectory) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (!node.isDirectory) return;
    
    const sourceNodeId = e.dataTransfer.getData('nodeId');
    if (sourceNodeId === node.id) return; // Can't drop onto itself
    
    try {
      // Attempt to move the node
      const newFileSystem = moveNode(fileSystem, sourceNodeId, node.id);
      onFileSystemChange && onFileSystemChange(newFileSystem);
      
      // Success message
      const sourceName = fileSystem.nodes[sourceNodeId].name;
      toast({
        title: "Item moved",
        description: `Moved "${sourceName}" to ${node.name}`,
      });
      
      // Expand the target directory to show the moved item
      if (!expandedDirs.has(node.id)) {
        toggleDir(node.id);
      }
    } catch (error: any) {
      // Error message
      toast({
        title: "Move failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 px-1 cursor-pointer hover:bg-gray-100 rounded ${
          isSelected ? 'bg-blue-100' : ''
        } ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-blue-50 border-2 border-blue-300' : ''}`}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => onNodeSelect(node.id)}
        onDoubleClick={() => {
          if (node.isDirectory) {
            toggleDir(node.id);
          }
        }}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
              onFileSystemChange={onFileSystemChange}
            />
          ))}
          {children.length === 0 && (
            <div 
              className="text-gray-400 italic text-sm py-1" 
              style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
              }}
            >
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ fileSystem, onNodeSelect, selectedNodeId, onFileSystemChange }) => {
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
      <div className="p-2 border-b border-gray-200 bg-gray-50 font-medium text-gray-700 flex items-center justify-between">
        <span>File Explorer</span>
        <span className="text-xs text-gray-500">Drag files to move them</span>
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
          onFileSystemChange={onFileSystemChange}
        />
      </div>
    </div>
  );
};

export default FileExplorer;
