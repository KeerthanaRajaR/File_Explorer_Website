import { executeAction } from '../services/actionExecutor';

jest.mock('../lib/ai/tools', () => ({
  deleteFiles: jest.fn().mockResolvedValue(undefined),
  moveFiles: jest.fn().mockResolvedValue(undefined),
  renameFile: jest.fn().mockResolvedValue(undefined),
  createFolder: jest.fn().mockResolvedValue(undefined),
  createFile: jest.fn().mockResolvedValue(undefined),
  editFileContent: jest.fn().mockResolvedValue(undefined),
}));

import { deleteFiles, moveFiles, renameFile, createFolder, createFile, editFileContent } from '../lib/ai/tools';

describe('executeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes delete_files action', async () => {
    await executeAction({
      type: 'delete_files',
      targets: ['/Pictures/photo.png'],
      requiresConfirmation: false,
    });

    expect(deleteFiles).toHaveBeenCalledWith(['/Pictures/photo.png']);
  });

  it('executes move_files action', async () => {
    await executeAction({
      type: 'move_files',
      targets: ['/Downloads/invoice.pdf'],
      destination: '/Documents',
      requiresConfirmation: false,
    });

    expect(moveFiles).toHaveBeenCalledWith(['/Downloads/invoice.pdf'], '/Documents');
  });

  it('throws when move_files destination is missing', async () => {
    await expect(executeAction({
      type: 'move_files',
      targets: ['/Downloads/invoice.pdf'],
      requiresConfirmation: false,
    })).rejects.toThrow('MISSING_DESTINATION');
  });

  it('executes rename_file action', async () => {
    await executeAction({
      type: 'rename_file',
      targets: ['/Documents/old.txt'],
      newName: 'new.txt',
      requiresConfirmation: false,
    });

    expect(renameFile).toHaveBeenCalledWith('/Documents/old.txt', 'new.txt');
  });

  it('executes create_folder action', async () => {
    await executeAction({
      type: 'create_folder',
      targets: ['/Projects/New Folder'],
      requiresConfirmation: false,
    });

    expect(createFolder).toHaveBeenCalledWith('/Projects/New Folder');
  });

  it('executes create_file action', async () => {
    await executeAction({
      type: 'create_file',
      targets: ['/Documents/read.txt'],
      requiresConfirmation: false,
    });

    expect(createFile).toHaveBeenCalledWith('/Documents/read.txt', '');
  });

  it('executes edit_file_content action', async () => {
    await executeAction({
      type: 'edit_file_content',
      targets: ['/Documents/readme.txt'],
      fileContent: 'updated content',
      requiresConfirmation: false,
    });

    expect(editFileContent).toHaveBeenCalledWith('/Documents/readme.txt', 'updated content', undefined, undefined);
  });

  it('executes edit_file_content action with replacement params', async () => {
    await executeAction({
      type: 'edit_file_content',
      targets: ['/Downloads/report.docx'],
      replaceFrom: 'PROFESSIONAL SUMMARY',
      replaceTo: 'SUMMARY',
      requiresConfirmation: false,
    });

    expect(editFileContent).toHaveBeenCalledWith(
      '/Downloads/report.docx',
      '',
      'PROFESSIONAL SUMMARY',
      'SUMMARY'
    );
  });

  it('does not throw for view_file action', async () => {
    await expect(executeAction({
      type: 'view_file',
      targets: ['/Documents/readme.txt'],
      requiresConfirmation: false,
    })).resolves.toBeUndefined();
  });
});
