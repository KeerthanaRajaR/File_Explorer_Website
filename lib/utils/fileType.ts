export type FileType = 'image' | 'video' | 'pdf' | 'doc' | 'archive' | 'audio' | 'spreadsheet' | 'code' | 'other';

export function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'doc';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'spreadsheet';
  if (['json', 'js', 'ts', 'html', 'css', 'tsx', 'jsx'].includes(ext)) return 'code';

  return 'other';
}
