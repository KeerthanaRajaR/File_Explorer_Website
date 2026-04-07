import { GET } from '../app/api/browse/route';
import { NextRequest } from 'next/server';

// Note: Using jest.mock in a real setup
jest.mock('../services/fileService', () => ({
  browseDirectory: jest.fn().mockImplementation(async (targetPath: string) => {
    if (targetPath.includes('invalid')) {
      return { success: false, data: null, error: 'INVALID_PATH' };
    }
    return {
      success: true,
      data: [{ name: 'example.txt', type: 'file', extension: '.txt' }]
    };
  })
}));

describe('Browse API Route', () => {
  
  it('returns 200 and formatted data on success', async () => {
    const req = new NextRequest('http://localhost:3000/api/browse?path=/docs');
    const response = await GET(req);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0].name).toBe('example.txt');
  });

  it('returns error struct when invalid path provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/browse?path=invalid_traversal');
    const response = await GET(req);
    const json = await response.json();
    
    // According to the wrapper
    expect(response.status).toBe(400); 
    expect(json.success).toBe(false);
    expect(json.error).toBe('INVALID_PATH');
  });
});
