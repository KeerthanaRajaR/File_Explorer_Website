import { detectIntent } from '../lib/ai/intent';

describe('detectIntent', () => {
  it('detects delete intent with search hint', () => {
    const intent = detectIntent('Delete all images');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('delete_files');
    expect(intent?.requiresConfirmation).toBe(true);
    expect(intent?.searchHint).toBe('all images');
  });

  it('detects move intent with destination and search hint', () => {
    const intent = detectIntent('move invoice files to /Documents');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('move_files');
    expect(intent?.destination).toBe('/Documents');
    expect(intent?.searchHint).toBe('invoice files');
  });

  it('normalizes move destination ending with folder', () => {
    const intent = detectIntent('move this readme.mp3 file to Downloads folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('move_files');
    expect(intent?.destination).toBe('/Downloads');
  });

  it('detects rename intent with new name and source hint', () => {
    const intent = detectIntent('rename report.pdf to summary.pdf');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('rename_file');
    expect(intent?.newName).toBe('summary.pdf');
    expect(intent?.searchHint).toBe('report.pdf');
  });

  it('detects rename intent with "with" phrasing', () => {
    const intent = detectIntent('rename report.pdf with summary.pdf');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('rename_file');
    expect(intent?.newName).toBe('summary.pdf');
    expect(intent?.searchHint).toBe('report.pdf');
  });

  it('returns null for non-action query', () => {
    const intent = detectIntent('find my internship resume');
    expect(intent).toBeNull();
  });

  it('detects create-folder intent with folder name and parent folder', () => {
    const intent = detectIntent('create a folder name with pic within the folder Documents');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('create_folder');
    expect(intent?.destination).toBe('/Documents/pic');
    expect(intent?.requiresConfirmation).toBe(true);
  });

  it('defaults create-folder name to New Folder when parent is provided', () => {
    const intent = detectIntent('create a new folder within the folder of Documents');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('create_folder');
    expect(intent?.destination).toBe('/Documents/New Folder');
    expect(intent?.requiresConfirmation).toBe(true);
  });

  it('detects create-folder intent using "name as" phrasing inside existing folder', () => {
    const intent = detectIntent('create a new folder name as pic inside the Documents folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('create_folder');
    expect(intent?.destination).toBe('/Documents/pic');
    expect(intent?.requiresConfirmation).toBe(true);
  });

  it('detects create-file intent using "name as" phrasing inside existing folder', () => {
    const intent = detectIntent('create a new file name as read.txt inside the Documents folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('create_file');
    expect(intent?.destination).toBe('/Documents/read.txt');
    expect(intent?.requiresConfirmation).toBe(true);
  });

  it('still detects create-file intent even when filename is missing', () => {
    const intent = detectIntent('create a new file inside the Documents folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('create_file');
    expect(intent?.requiresConfirmation).toBe(true);
  });

  it('detects view file intent', () => {
    const intent = detectIntent('open file readme.txt inside the Documents folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('view_file');
    expect(intent?.requiresConfirmation).toBe(false);
  });

  it('detects download file intent', () => {
    const intent = detectIntent('download readme.mp3 from the Music folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('download_file');
    expect(intent?.requiresConfirmation).toBe(false);
  });

  it('detects preview image intent', () => {
    const intent = detectIntent('preview image photo.png inside the Pictures folder');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('preview_image');
    expect(intent?.requiresConfirmation).toBe(false);
  });

  it('treats generic preview file request as view_file', () => {
    const intent = detectIntent('preview file keerthana_resume.pdf');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('view_file');
    expect(intent?.requiresConfirmation).toBe(false);
  });

  it('detects edit file content intent', () => {
    const intent = detectIntent('update readme.txt content to "hello world"');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('edit_file_content');
    expect(intent?.requiresConfirmation).toBe(true);
    expect(intent?.fileContent).toBe('hello world');
  });

  it('detects edit file replacement intent', () => {
    const intent = detectIntent('edit readme.txt file change the word PROFESSIONAL SUMMARY to SUMMARY');

    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('edit_file_content');
    expect(intent?.replaceFrom).toBe('PROFESSIONAL SUMMARY');
    expect(intent?.replaceTo).toBe('SUMMARY');
  });
});
