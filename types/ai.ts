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
