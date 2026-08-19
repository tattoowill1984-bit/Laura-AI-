export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  description?: string;
}

/**
 * Fetches list of files from Google Drive API
 */
export async function fetchDriveFiles(
  accessToken: string,
  query: string = "trashed = false",
  pageSize: number = 30
): Promise<DriveFileItem[]> {
  try {
    const fields = 'files(id, name, mimeType, modifiedTime, createdTime, size, webViewLink, thumbnailLink, iconLink, description)';
    const encodedQ = encodeURIComponent(query);
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&q=${encodedQ}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime%20desc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('[GoogleDriveService] Error fetching files:', err);
    throw err;
  }
}

/**
 * Fetches text content from a Google Drive file or Google Doc export
 */
export async function fetchFileContent(accessToken: string, fileId: string, mimeType: string): Promise<string> {
  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    // Handle Google Workspace documents export (Docs -> text/plain)
    if (mimeType === 'application/vnd.google-apps.document') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive read error (${res.status}): ${errText}`);
    }

    const text = await res.text();
    return text;
  } catch (err: any) {
    console.error('[GoogleDriveService] Error reading file content:', err);
    throw err;
  }
}

/**
 * Creates a text file in Google Drive
 */
export async function createDriveFile(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<DriveFileItem> {
  try {
    const metadata = {
      name: fileName,
      mimeType: mimeType,
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create file in Google Drive (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[GoogleDriveService] Error creating Drive file:', err);
    throw err;
  }
}

/**
 * Permanently deletes or trashes a file in Google Drive
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok && res.status !== 204) {
      const errText = await res.text();
      throw new Error(`Failed to delete Google Drive file (${res.status}): ${errText}`);
    }

    return true;
  } catch (err: any) {
    console.error('[GoogleDriveService] Error deleting file:', err);
    throw err;
  }
}
