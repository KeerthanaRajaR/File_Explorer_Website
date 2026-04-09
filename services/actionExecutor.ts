import { ActionPayload } from '@/types/ai';
import { createFile, createFolder, deleteFiles, editFileContent, moveFiles, renameFile } from '@/lib/ai/tools';

export async function executeAction(action: ActionPayload): Promise<void> {
  switch (action.type) {
    case 'delete_files':
      return deleteFiles(action.targets);

    case 'move_files': {
      if (!action.destination) {
        throw new Error('MISSING_DESTINATION');
      }

      return moveFiles(action.targets, action.destination);
    }

    case 'rename_file': {
      if (!action.newName) {
        throw new Error('MISSING_NEW_NAME');
      }

      if (!action.targets[0]) {
        throw new Error('MISSING_TARGET');
      }

      return renameFile(action.targets[0], action.newName);
    }

    case 'create_folder': {
      const target = action.targets[0] || action.destination;
      if (!target) {
        throw new Error('MISSING_TARGET');
      }

      return createFolder(target);
    }

    case 'create_file': {
      const target = action.targets[0] || action.destination;
      if (!target) {
        throw new Error('MISSING_TARGET');
      }

      return createFile(target, action.fileContent ?? '');
    }

    case 'edit_file_content': {
      const target = action.targets[0] || action.destination;
      if (!target) {
        throw new Error('MISSING_TARGET');
      }

      if (typeof action.fileContent !== 'string') {
        if (!(action.replaceFrom && typeof action.replaceTo === 'string')) {
          throw new Error('MISSING_FILE_CONTENT');
        }
      }

      return editFileContent(target, action.fileContent ?? '', action.replaceFrom, action.replaceTo);
    }

    // Access actions are handled client-side through links and navigation.
    case 'view_file':
    case 'preview_image':
    case 'download_file':
      return;

    default:
      throw new Error('UNSUPPORTED_ACTION');
  }
}
