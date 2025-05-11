import { v4 as uuidv4 } from 'uuid';
import { 
  FileSystem, 
  FileSystemNode, 
  DirectoryNode, 
  FileNode, 
  User, 
  Permission,
  UserPermissions
} from '../models/fileSystem';

// Initialize a new file system
export const initializeFileSystem = (blockSize: number = 1024, totalBlocks: number = 100): FileSystem => {
  const rootId = uuidv4();
  const adminId = uuidv4();
  
  const rootPermissions: UserPermissions = {
    [adminId]: { read: true, write: true, execute: true }
  };
  
  const rootNode: DirectoryNode = {
    id: rootId,
    name: '/',
    isDirectory: true,
    parentId: null,
    owner: adminId,
    permissions: rootPermissions,
    children: [],
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      size: 0,
      type: 'directory'
    }
  };

  const admin: User = {
    id: adminId,
    username: 'admin',
    isAdmin: true
  };

  const blocks = Array(totalBlocks).fill(null).map((_, index) => ({
    id: index,
    fileId: null,
    nextBlock: null,
    content: ''
  }));

  return {
    nodes: { [rootId]: rootNode },
    users: { [adminId]: admin },
    currentUser: adminId,
    currentDirectory: rootId,
    blocks,
    blockSize,
    totalBlocks,
    allocationStrategy: 'contiguous'
  };
};

// Move a node from one directory to another
export const moveNode = (fs: FileSystem, nodeId: string, newParentId: string): FileSystem => {
  const node = fs.nodes[nodeId];
  const newParent = fs.nodes[newParentId];
  
  // Check if nodes exist
  if (!node) {
    throw new Error('Source node not found');
  }
  
  if (!newParent || !newParent.isDirectory) {
    throw new Error('Target is not a valid directory');
  }
  
  // Check permissions
  if (!hasPermission(fs, node.parentId!, 'write') || !hasPermission(fs, newParentId, 'write')) {
    throw new Error('Permission denied');
  }
  
  // Check if target directory is not a child of the source (if source is a directory)
  if (node.isDirectory) {
    let current = newParent;
    while (current.parentId !== null) {
      if (current.id === node.id) {
        throw new Error('Cannot move a directory into its own subdirectory');
      }
      current = fs.nodes[current.parentId];
    }
  }
  
  // Check if a node with the same name exists in the destination
  const exists = (newParent as DirectoryNode).children.some(childId => {
    const child = fs.nodes[childId];
    return child && child.name === node.name;
  });
  
  if (exists) {
    throw new Error(`A file or directory named "${node.name}" already exists in the destination`);
  }
  
  // Remove from old parent
  const oldParent = fs.nodes[node.parentId!] as DirectoryNode;
  const updatedOldParent: DirectoryNode = {
    ...oldParent,
    children: oldParent.children.filter(id => id !== nodeId),
    metadata: {
      ...oldParent.metadata,
      modifiedAt: new Date()
    }
  };
  
  // Add to new parent
  const updatedNewParent: DirectoryNode = {
    ...newParent as DirectoryNode,
    children: [...(newParent as DirectoryNode).children, nodeId],
    metadata: {
      ...newParent.metadata,
      modifiedAt: new Date()
    }
  };
  
  // Update node
  const updatedNode = {
    ...node,
    parentId: newParentId
  };
  
  return {
    ...fs,
    nodes: {
      ...fs.nodes,
      [nodeId]: updatedNode,
      [node.parentId!]: updatedOldParent,
      [newParentId]: updatedNewParent
    }
  };
};

// Get a node by path
export const getNodeByPath = (fs: FileSystem, path: string): FileSystemNode | null => {
  if (path === '/') {
    // Find the root node
    return Object.values(fs.nodes).find(node => node.parentId === null) || null;
  }

  const parts = path.split('/').filter(Boolean);
  let currentNode = Object.values(fs.nodes).find(node => node.parentId === null);

  if (!currentNode) return null;

  for (const part of parts) {
    if (!currentNode.isDirectory) return null;
    
    const dirNode = currentNode as DirectoryNode;
    const childId = dirNode.children.find(childId => {
      const child = fs.nodes[childId];
      return child && child.name === part;
    });
    
    if (!childId) return null;
    
    currentNode = fs.nodes[childId];
  }

  return currentNode;
};

// Check if user has permission
export const hasPermission = (
  fs: FileSystem, 
  nodeId: string, 
  permissionType: keyof Permission
): boolean => {
  const node = fs.nodes[nodeId];
  const user = fs.users[fs.currentUser];
  
  if (!node || !user) return false;
  
  // Admin always has all permissions
  if (user.isAdmin) return true;
  
  // Check if user has explicit permission
  const userPermission = node.permissions[user.id];
  if (userPermission && userPermission[permissionType]) return true;
  
  // No permission
  return false;
};

// Create a new directory
export const createDirectory = (
  fs: FileSystem,
  parentId: string,
  name: string
): FileSystem => {
  if (!hasPermission(fs, parentId, 'write')) {
    throw new Error('Permission denied');
  }
  
  const parent = fs.nodes[parentId];
  if (!parent || !parent.isDirectory) {
    throw new Error('Parent is not a directory');
  }
  
  const parentDir = parent as DirectoryNode;
  
  // Check if name already exists
  const exists = parentDir.children.some(childId => {
    const child = fs.nodes[childId];
    return child && child.name === name;
  });
  
  if (exists) {
    throw new Error(`A file or directory named "${name}" already exists`);
  }
  
  const newDirId = uuidv4();
  
  // Default permissions: owner has all permissions
  const permissions: UserPermissions = {
    [fs.currentUser]: { read: true, write: true, execute: true }
  };
  
  const newDir: DirectoryNode = {
    id: newDirId,
    name,
    isDirectory: true,
    parentId,
    owner: fs.currentUser,
    permissions,
    children: [],
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      size: 0,
      type: 'directory'
    }
  };
  
  // Update parent directory
  const updatedParentDir: DirectoryNode = {
    ...parentDir,
    children: [...parentDir.children, newDirId],
    metadata: {
      ...parentDir.metadata,
      modifiedAt: new Date()
    }
  };
  
  return {
    ...fs,
    nodes: {
      ...fs.nodes,
      [newDirId]: newDir,
      [parentId]: updatedParentDir
    }
  };
};

// Allocate blocks for a file using contiguous allocation
export const allocateBlocksContiguous = (
  fs: FileSystem,
  contentSize: number
): number[] | null => {
  const neededBlocks = Math.ceil(contentSize / fs.blockSize);
  
  // Find a contiguous sequence of free blocks
  for (let startBlock = 0; startBlock <= fs.totalBlocks - neededBlocks; startBlock++) {
    let contiguousFree = true;
    
    for (let i = 0; i < neededBlocks; i++) {
      if (fs.blocks[startBlock + i].fileId !== null) {
        contiguousFree = false;
        break;
      }
    }
    
    if (contiguousFree) {
      return Array.from({ length: neededBlocks }, (_, i) => startBlock + i);
    }
  }
  
  return null; // Not enough contiguous blocks
};

// Create a new file
export const createFile = (
  fs: FileSystem,
  parentId: string,
  name: string,
  content: string = '',
  type: string = 'text/plain'
): FileSystem => {
  if (!hasPermission(fs, parentId, 'write')) {
    throw new Error('Permission denied');
  }
  
  const parent = fs.nodes[parentId];
  if (!parent || !parent.isDirectory) {
    throw new Error('Parent is not a directory');
  }
  
  const parentDir = parent as DirectoryNode;
  
  // Check if name already exists
  const exists = parentDir.children.some(childId => {
    const child = fs.nodes[childId];
    return child && child.name === name;
  });
  
  if (exists) {
    throw new Error(`A file or directory named "${name}" already exists`);
  }
  
  const newFileId = uuidv4();
  const contentSize = new TextEncoder().encode(content).length;
  
  // Allocate blocks based on strategy
  let allocatedBlocks: number[] | null = null;
  
  if (fs.allocationStrategy === 'contiguous') {
    allocatedBlocks = allocateBlocksContiguous(fs, contentSize);
  }
  
  if (!allocatedBlocks) {
    throw new Error('Not enough disk space');
  }
  
  // Default permissions: owner has all permissions
  const permissions: UserPermissions = {
    [fs.currentUser]: { read: true, write: true, execute: false }
  };
  
  const newFile: FileNode = {
    id: newFileId,
    name,
    isDirectory: false,
    parentId,
    owner: fs.currentUser,
    permissions,
    content,
    blockAllocation: {
      strategy: fs.allocationStrategy,
      startBlock: allocatedBlocks[0],
      blocks: allocatedBlocks
    },
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      size: contentSize,
      type
    }
  };
  
  // Update parent directory
  const updatedParentDir: DirectoryNode = {
    ...parentDir,
    children: [...parentDir.children, newFileId],
    metadata: {
      ...parentDir.metadata,
      modifiedAt: new Date()
    }
  };
  
  // Update blocks
  const updatedBlocks = [...fs.blocks];
  allocatedBlocks.forEach((blockId, index) => {
    const blockContent = content.substring(
      index * fs.blockSize, 
      (index + 1) * fs.blockSize
    );
    
    updatedBlocks[blockId] = {
      ...updatedBlocks[blockId],
      fileId: newFileId,
      content: blockContent
    };
  });
  
  return {
    ...fs,
    nodes: {
      ...fs.nodes,
      [newFileId]: newFile,
      [parentId]: updatedParentDir
    },
    blocks: updatedBlocks
  };
};

// Get absolute path of a node
export const getNodePath = (fs: FileSystem, nodeId: string): string => {
  const node = fs.nodes[nodeId];
  if (!node) return '';
  
  if (node.parentId === null) return '/';
  
  const parts = [];
  let currentNode: FileSystemNode | undefined = node;
  
  while (currentNode && currentNode.parentId !== null) {
    parts.unshift(currentNode.name);
    currentNode = fs.nodes[currentNode.parentId];
  }
  
  return '/' + parts.join('/');
};

// Get children of a directory
export const getDirectoryChildren = (fs: FileSystem, dirId: string): FileSystemNode[] => {
  const dir = fs.nodes[dirId];
  if (!dir || !dir.isDirectory) return [];
  
  const dirNode = dir as DirectoryNode;
  return dirNode.children
    .map(childId => fs.nodes[childId])
    .filter(Boolean);
};

// Command execution helpers
export const parseCommand = (commandLine: string): { command: string, args: string[] } => {
  const parts = commandLine.trim().split(/\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);
  return { command, args };
};

// Commands
export const executeCommand = (fs: FileSystem, commandLine: string): { output: string; newFileSystem: FileSystem } => {
  const { command, args } = parseCommand(commandLine);
  
  switch (command) {
    case 'ls':
      return cmdLs(args, fs);
    case 'cd':
      return cmdCd(args, fs);
    case 'mkdir':
      return cmdMkdir(args, fs);
    case 'touch':
      return cmdTouch(args, fs);
    case 'cat':
      return cmdCat(args, fs);
    case 'pwd':
      return cmdPwd(args, fs);
    case 'rm':
      return cmdRm(args, fs);
    default:
      return { 
        output: `Command not found: ${command}`, 
        newFileSystem: fs 
      };
  }
};

// Command implementations
const cmdLs = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  let dirId = fs.currentDirectory;
  
  if (args.length > 0) {
    const node = getNodeByPath(fs, args[0]);
    if (!node) {
      return { output: `ls: ${args[0]}: No such file or directory`, newFileSystem: fs };
    }
    if (!node.isDirectory) {
      return { output: node.name, newFileSystem: fs };
    }
    dirId = node.id;
  }
  
  if (!hasPermission(fs, dirId, 'read')) {
    return { output: 'ls: Permission denied', newFileSystem: fs };
  }
  
  const children = getDirectoryChildren(fs, dirId);
  const output = children
    .map(child => {
      const permissions = getPermissionString(child);
      const size = child.metadata.size.toString().padStart(6, ' ');
      const date = child.metadata.modifiedAt.toLocaleString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const name = child.name + (child.isDirectory ? '/' : '');
      return `${permissions} ${size} ${date} ${name}`;
    })
    .join('\n');
  
  return { output: output || '(empty directory)', newFileSystem: fs };
};

const cmdCd = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  if (args.length === 0) {
    // cd with no args goes to root
    const rootNode = Object.values(fs.nodes).find(node => node.parentId === null);
    if (rootNode) {
      return { 
        output: '', 
        newFileSystem: { ...fs, currentDirectory: rootNode.id } 
      };
    }
    return { output: 'cd: No root directory found', newFileSystem: fs };
  }
  
  const path = args[0];
  let targetId: string;
  
  if (path === '..') {
    // Go up one directory
    const currentDir = fs.nodes[fs.currentDirectory];
    if (!currentDir || currentDir.parentId === null) {
      return { output: '', newFileSystem: fs }; // Already at root
    }
    targetId = currentDir.parentId;
  } else {
    // Navigate to specified path
    const node = getNodeByPath(fs, path);
    if (!node) {
      return { output: `cd: ${path}: No such file or directory`, newFileSystem: fs };
    }
    if (!node.isDirectory) {
      return { output: `cd: ${path}: Not a directory`, newFileSystem: fs };
    }
    targetId = node.id;
  }
  
  if (!hasPermission(fs, targetId, 'execute')) {
    return { output: 'cd: Permission denied', newFileSystem: fs };
  }
  
  return { 
    output: '', 
    newFileSystem: { ...fs, currentDirectory: targetId } 
  };
};

const cmdMkdir = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  if (args.length === 0) {
    return { output: 'mkdir: missing operand', newFileSystem: fs };
  }
  
  try {
    let newFs = fs;
    for (const dirName of args) {
      newFs = createDirectory(newFs, newFs.currentDirectory, dirName);
    }
    return { output: '', newFileSystem: newFs };
  } catch (error: any) {
    return { output: `mkdir: ${error.message}`, newFileSystem: fs };
  }
};

const cmdTouch = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  if (args.length === 0) {
    return { output: 'touch: missing operand', newFileSystem: fs };
  }
  
  try {
    let newFs = fs;
    for (const fileName of args) {
      newFs = createFile(newFs, newFs.currentDirectory, fileName);
    }
    return { output: '', newFileSystem: newFs };
  } catch (error: any) {
    return { output: `touch: ${error.message}`, newFileSystem: fs };
  }
};

const cmdCat = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  if (args.length === 0) {
    return { output: 'cat: missing operand', newFileSystem: fs };
  }
  
  const node = getNodeByPath(fs, args[0]);
  if (!node) {
    return { output: `cat: ${args[0]}: No such file or directory`, newFileSystem: fs };
  }
  
  if (node.isDirectory) {
    return { output: `cat: ${args[0]}: Is a directory`, newFileSystem: fs };
  }
  
  if (!hasPermission(fs, node.id, 'read')) {
    return { output: 'cat: Permission denied', newFileSystem: fs };
  }
  
  const fileNode = node as FileNode;
  return { output: fileNode.content, newFileSystem: fs };
};

const cmdPwd = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  const path = getNodePath(fs, fs.currentDirectory);
  return { output: path, newFileSystem: fs };
};

const cmdRm = (args: string[], fs: FileSystem): { output: string; newFileSystem: FileSystem } => {
  if (args.length === 0) {
    return { output: 'rm: missing operand', newFileSystem: fs };
  }
  
  const recursive = args[0] === '-r' || args[0] === '-rf';
  const filePaths = recursive ? args.slice(1) : args;
  
  if (filePaths.length === 0) {
    return { output: 'rm: missing operand', newFileSystem: fs };
  }
  
  let newFs = fs;
  let errors: string[] = [];
  
  for (const path of filePaths) {
    try {
      newFs = removeNode(newFs, path, recursive);
    } catch (error: any) {
      errors.push(`rm: ${path}: ${error.message}`);
    }
  }
  
  return { 
    output: errors.length ? errors.join('\n') : '', 
    newFileSystem: newFs 
  };
};

// Helper function to remove a node
export const removeNode = (fs: FileSystem, path: string, recursive: boolean = false): FileSystem => {
  const node = getNodeByPath(fs, path);
  if (!node) {
    throw new Error('No such file or directory');
  }
  
  if (!hasPermission(fs, node.id, 'write')) {
    throw new Error('Permission denied');
  }
  
  if (node.isDirectory) {
    const dirNode = node as DirectoryNode;
    if (dirNode.children.length > 0 && !recursive) {
      throw new Error('Directory not empty');
    }
  }
  
  // Get parent directory
  const parentId = node.parentId;
  if (!parentId) {
    throw new Error('Cannot remove root directory');
  }
  
  const parent = fs.nodes[parentId] as DirectoryNode;
  
  // Update parent's children list
  const updatedParent: DirectoryNode = {
    ...parent,
    children: parent.children.filter(id => id !== node.id),
    metadata: {
      ...parent.metadata,
      modifiedAt: new Date()
    }
  };
  
  // Create a new nodes object without the removed node
  const { [node.id]: removedNode, ...remainingNodes } = fs.nodes;
  
  // If it's a file, free the blocks
  let updatedBlocks = [...fs.blocks];
  if (!node.isDirectory) {
    const fileNode = node as FileNode;
    fileNode.blockAllocation.blocks.forEach(blockId => {
      updatedBlocks[blockId] = {
        ...updatedBlocks[blockId],
        fileId: null,
        nextBlock: null,
        content: ''
      };
    });
  }
  
  // If recursive, remove all children
  if (node.isDirectory && recursive) {
    const dirNode = node as DirectoryNode;
    let newFs = {
      ...fs,
      nodes: {
        ...remainingNodes,
        [parentId]: updatedParent
      },
      blocks: updatedBlocks
    };
    
    // Recursively remove all children
    for (const childId of dirNode.children) {
      const childPath = `${path}/${fs.nodes[childId].name}`;
      newFs = removeNode(newFs, childPath, true);
    }
    
    return newFs;
  }
  
  return {
    ...fs,
    nodes: {
      ...remainingNodes,
      [parentId]: updatedParent
    },
    blocks: updatedBlocks
  };
};

// Helper function to get permission string (ls -l style)
export const getPermissionString = (node: FileSystemNode): string => {
  const isDir = node.isDirectory ? 'd' : '-';
  
  const currentUser = node.owner;
  const userPerm = node.permissions[currentUser] || { read: false, write: false, execute: false };
  
  const r = userPerm.read ? 'r' : '-';
  const w = userPerm.write ? 'w' : '-';
  const x = userPerm.execute ? 'x' : '-';
  
  return `${isDir}${r}${w}${x}${r}${w}${x}${r}${w}${x}`;
};

// Function to generate file type icon based on name/type
export const getFileIcon = (name: string, isDirectory: boolean): string => {
  if (isDirectory) return '📁';
  
  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'txt': return '📄';
    case 'jpg':
    case 'png':
    case 'gif': return '🖼️';
    case 'mp3':
    case 'wav': return '🎵';
    case 'mp4':
    case 'mov': return '🎬';
    case 'pdf': return '📑';
    case 'doc':
    case 'docx': return '📝';
    case 'xls':
    case 'xlsx': return '📊';
    case 'ppt':
    case 'pptx': return '📊';
    case 'zip':
    case 'rar': return '🗜️';
    case 'js':
    case 'ts': return '📜';
    case 'html': return '🌐';
    case 'css': return '🎨';
    case 'py': return '🐍';
    default: return '📄';
  }
};

export const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
