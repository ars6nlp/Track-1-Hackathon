import React, { useCallback, useState } from 'react'
import { useStore } from '../store/useStore'
import { UploadCloud } from 'lucide-react'

export default function UploadZone() {
  const { setStatus, setJobId } = useStore()
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, [setStatus, setJobId]);

  const handleFileInput = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
  }, [setStatus, setJobId]);

  const processFiles = async (files) => {
    if (files.length === 0) return;
    
    setStatus('uploading');
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await fetch('http://localhost:8000/api/v1/jobs/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      setJobId(data.job_id);
      setStatus('processing');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload').click()}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-64
        ${isDragging ? 'border-amber-500 bg-amber-500/10 scale-[1.02]' : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-500'}
      `}
    >
      <input 
        id="file-upload" 
        type="file" 
        multiple 
        accept=".stl,.obj,.ply" 
        className="hidden" 
        onChange={handleFileInput} 
      />
      <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-amber-500/20' : 'bg-neutral-800'}`}>
        <UploadCloud size={36} className={isDragging ? 'text-amber-500' : 'text-neutral-400'} />
      </div>
      <h3 className="text-lg font-medium text-neutral-200 mb-2">Drop STL / OBJ / PLY files</h3>
      <p className="text-sm text-neutral-500 mb-6">Supports batch upload</p>
      
      <div className="text-[10px] font-mono tracking-widest uppercase text-neutral-600 bg-neutral-950 px-3 py-1.5 rounded-full border border-neutral-800">
        Max Size: 500MB
      </div>
    </div>
  )
}
