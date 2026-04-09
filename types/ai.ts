export type FileMeta = {
  id: string;
  path: string;
  name: string;
  tags: string[];
  content?: string;
  embedding: number[];
  createdAt: Date;
};

// JSON-safe shape for persisted storage (Date serialized to ISO string)
export type StoredFileMeta = Omit<FileMeta, 'createdAt'> & {
  createdAt: string;
};

export type ToolAction =
  | 'delete_files'
  | 'move_files'
  | 'rename_file'
  | 'create_folder'
  | 'create_file'
  | 'view_file'
  | 'preview_image'
  | 'download_file'
  | 'edit_file_content';

export type ActionPayload = {
  type: ToolAction;
  targets: string[];
  destination?: string;
  newName?: string;
  fileContent?: string;
  replaceFrom?: string;
  replaceTo?: string;
  requiresConfirmation: boolean;
};
