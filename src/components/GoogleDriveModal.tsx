import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Folder,
  FileText,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Brain,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  HardDrive,
  LogOut,
  Sparkles,
  Download,
  Eye,
} from 'lucide-react';
import { googleSignIn, logout, initAuth, getAccessToken, setCachedAccessToken } from '../services/driveAuthService';
import { fetchDriveFiles, fetchFileContent, createDriveFile, deleteDriveFile, DriveFileItem } from '../services/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedToLauraMemory?: (title: string, content: string, sourceUrl?: string) => Promise<void>;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose, onFeedToLauraMemory }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Note Modal / Form State
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // File Delete Confirmation State
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Memory Feed Progress
  const [feedingFileId, setFeedingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (currUser, accessToken) => {
        setUser(currUser);
        setToken(accessToken);
        loadFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setFiles([]);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const loadFiles = async (accessToken?: string) => {
    const activeToken = accessToken || token;
    if (!activeToken) return;

    setLoading(true);
    setError(null);
    try {
      let q = "trashed = false";
      if (searchQuery.trim()) {
        const escaped = searchQuery.replace(/'/g, "\\'");
        q = `trashed = false and name contains '${escaped}'`;
      }
      const fileList = await fetchDriveFiles(activeToken, q);
      setFiles(fileList);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect or fetch files from Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSuccessMsg('Successfully connected to Google Drive!');
        loadFiles(res.accessToken);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'Google OAuth Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFiles([]);
    setSuccessMsg('Disconnected from Google Drive.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !noteTitle.trim() || !noteContent.trim()) return;

    setIsSavingNote(true);
    setError(null);
    try {
      await createDriveFile(token, noteTitle.trim(), noteContent.trim());
      setSuccessMsg(`Note "${noteTitle}" successfully saved to Google Drive!`);
      setNoteTitle('');
      setNoteContent('');
      setIsCreatingNote(false);
      loadFiles();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create file in Google Drive.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePreview = async (file: DriveFileItem) => {
    if (!token) return;
    setPreviewFile(file);
    setPreviewContent(null);
    setIsLoadingPreview(true);
    try {
      const text = await fetchFileContent(token, file.id, file.mimeType);
      setPreviewContent(text);
    } catch (err: any) {
      setPreviewContent(`[Preview Unavailable]: ${(err as Error).message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleFeedFileToLaura = async (file: DriveFileItem) => {
    if (!token || !onFeedToLauraMemory) return;

    setFeedingFileId(file.id);
    setError(null);
    try {
      const text = await fetchFileContent(token, file.id, file.mimeType);
      await onFeedToLauraMemory(file.name, text, file.webViewLink);
      setSuccessMsg(`Document "${file.name}" ingested into Laura's Merkle Evidence DAG!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(`Failed to ingest "${file.name}": ${(err as Error).message}`);
    } finally {
      setFeedingFileId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !fileToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteDriveFile(token, fileToDelete.id);
      setSuccessMsg(`File "${fileToDelete.name}" was permanently removed from Drive.`);
      setFileToDelete(null);
      loadFiles();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(`Failed to delete file: ${(err as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getMimeIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (mimeType.includes('presentation')) {
      return <FileText className="w-4 h-4 text-amber-400" />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon className="w-4 h-4 text-purple-400" />;
    }
    if (mimeType.includes('folder')) {
      return <Folder className="w-4 h-4 text-yellow-400" />;
    }
    return <FileCode className="w-4 h-4 text-slate-400" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '—';
    const b = parseInt(bytes, 10);
    if (isNaN(b)) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600/20 to-cyan-500/20 border border-blue-500/30 text-cyan-400 shadow-md">
              <HardDrive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Google Drive Bridge
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Workspace OAuth Connected
                </span>
              </h2>
              <p className="text-xs text-slate-400">Read, write, search, and ingest Google Drive files into Laura AI's cognitive substrate</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!user ? (
            /* Logged Out State with Official GSI Material Button Styling */
            <div className="py-12 px-6 bg-slate-950/50 rounded-2xl border border-slate-800 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mx-auto flex items-center justify-center text-cyan-400">
                <HardDrive className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-100">Connect Your Google Drive</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Connect your Google account with permission to allow Laura AI to read, search, and feed your documents into her Merkle Evidence DAG.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="gsi-material-button hover:scale-105 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-medium">Sign in with Google</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Connected View */
            <div className="space-y-6">
              {/* Account Header Strip */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-cyan-500/40" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold">
                      {(user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{user.displayName || 'Connected Google Workspace User'}</h4>
                    <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreatingNote(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Note in Drive
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Search & Refresh Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Google Drive files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <button
                  onClick={() => loadFiles()}
                  disabled={loading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  Refresh Files
                </button>
              </div>

              {/* File List Grid / Table */}
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-12 gap-2 uppercase">
                  <div className="col-span-5">File Name</div>
                  <div className="col-span-3 hidden sm:block">Modified Date</div>
                  <div className="col-span-2 hidden sm:block">Size</div>
                  <div className="col-span-7 sm:col-span-2 text-right">Actions</div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    Querying Google Drive files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No files found in Google Drive matching query.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {files.map((file) => (
                      <div key={file.id} className="px-4 py-3 hover:bg-slate-900/60 transition-colors grid grid-cols-12 gap-2 items-center text-xs">
                        {/* File Name & Type */}
                        <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                          {getMimeIcon(file.mimeType)}
                          <span className="font-medium text-slate-200 truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>

                        {/* Modified Date */}
                        <div className="col-span-3 text-slate-400 hidden sm:block text-[11px] font-mono">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                        </div>

                        {/* File Size */}
                        <div className="col-span-2 text-slate-400 hidden sm:block text-[11px] font-mono">
                          {formatFileSize(file.size)}
                        </div>

                        {/* Actions */}
                        <div className="col-span-7 sm:col-span-2 flex items-center justify-end gap-1.5">
                          {/* Preview / Read */}
                          <button
                            onClick={() => handlePreview(file)}
                            title="Preview file content"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Feed to Laura AI Memory */}
                          {onFeedToLauraMemory && (
                            <button
                              onClick={() => handleFeedFileToLaura(file)}
                              disabled={feedingFileId === file.id}
                              title="Feed file content into Laura AI Merkle DAG Memory"
                              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-200 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Brain className={`w-3.5 h-3.5 ${feedingFileId === file.id ? 'animate-pulse text-cyan-400' : ''}`} />
                            </button>
                          )}

                          {/* Direct External Link */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in Google Drive"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete File */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            title="Delete file from Google Drive"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OAuth Tokens encrypted in memory. Non-persistent client auth.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Create Note Modal Overlay */}
      {isCreatingNote && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleCreateNote} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Create Drive Note
              </h3>
              <button type="button" onClick={() => setIsCreatingNote(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">File Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Laura AI System Objectives.txt"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content Payload</label>
              <textarea
                required
                rows={6}
                placeholder="Enter document text or notes here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingNote(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingNote}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
              >
                {isSavingNote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save to Drive
              </button>
            </div>
          </form>
        </div>
      )}

      {/* File Preview Drawer */}
      {previewFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 truncate">{previewFile.name}</h3>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto flex-1 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[200px]">
              {isLoadingPreview ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  Fetching document text from Google Drive API...
                </div>
              ) : (
                previewContent
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {onFeedToLauraMemory && previewContent && (
                <button
                  onClick={() => {
                    handleFeedFileToLaura(previewFile);
                    setPreviewFile(null);
                  }}
                  className="px-3 py-1.5 bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-300" />
                  Feed File to Laura Memory
                </button>
              )}
              <button onClick={() => setPreviewFile(null)} className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold ml-auto">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for File Deletion */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Confirm File Deletion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-100 font-semibold">"{fileToDelete.name}"</strong> from your Google Drive? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
