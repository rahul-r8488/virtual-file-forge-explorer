
export type Permission = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type UserPermissions = {
  [userId: string]: Permission;
};

export type FileMetadata = {
  createdAt: Date;
  modifiedAt: Date;
  size: number;
  type: string;
};

export type FileSystemNode = {
  id: string;
  name: string;
  isDirectory: boolean;
  parentId: string | null;
  owner: string;
  permissions: UserPermissions;
  metadata: FileMetadata;
};

export type DirectoryNode = FileSystemNode & {
  isDirectory: true;
  children: string[];
};

export type FileNode = FileSystemNode & {
  isDirectory: false;
  content: string;
  blockAllocation: {
    strategy: 'contiguous' | 'linked' | 'indexed';
    startBlock?: number;
    blocks: number[];
  };
};

export type User = {
  id: string;
  username: string;
  isAdmin: boolean;
};

export type Block = {
  id: number;
  fileId: string | null;
  nextBlock: number | null;
  content: string;
};

export type FileSystem = {
  nodes: { [id: string]: FileSystemNode };
  users: { [id: string]: User };
  currentUser: string;
  currentDirectory: string;
  blocks: Block[];
  blockSize: number;
  totalBlocks: number;
  allocationStrategy: 'contiguous' | 'linked' | 'indexed';
};

export type Command = {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[], fileSystem: FileSystem) => { output: string; newFileSystem: FileSystem };
};
