import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import UploadZone from './components/UploadZone'
import Dashboard from './components/Dashboard'
import Viewer from './canvas/Viewer'
import { Settings, Layers } from 'lucide-react'

export default function App() {
  const { status, jobId, errorMessage, setStatus, setErrorMessage, setAnalytics } = useStore()

  // Поллинг: Опрос статуса обработки каждые 2 секунды, чтобы избежать таймаутов
  useEffect(() => {
    let interval;
    if (status === 'processing' && jobId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`);
          const data = await res.json();
          if (data.status === 'completed') {
            const hasError = data.results && data.results.length > 0 && data.results[0].result.status === 'error';
            if (hasError) {
              console.error("Ошибка обработки:", data.results[0].result.error);
              setErrorMessage(data.results[0].result.error || 'Неизвестная ошибка обработки.');
              setStatus('error');
            } else {
              setStatus('completed');
              setAnalytics(data.results);
            }
            clearInterval(interval);
          } else if (data.status === 'error') {
            setErrorMessage(data.error || 'Ошибка бекенда.');
            setStatus('error');
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Ошибка поллинга:", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, jobId, setStatus, setAnalytics]);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans overflow-hidden">
      {/* Левая панель инструментов */}
      <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col relative z-10 shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
          <Layers className="text-amber-500" />
          <h1 className="text-xl font-bold tracking-wider text-neutral-100">CAD OPTIMIZER</h1>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {status === 'idle' && <UploadZone />}
          
          {status === 'uploading' && (
            <div className="flex flex-col items-center justify-center h-full text-amber-500 animate-pulse">
              Загрузка файлов...
            </div>
          )}
          
          {status === 'processing' && (
            <div className="space-y-4 mt-10">
              <div className="flex items-center gap-3 text-amber-500 text-lg font-medium">
                <Settings className="animate-spin" />
                <span>Обработка геометрии...</span>
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Это может занять 10-20 секунд в зависимости от полигонажа. 
                Мы очищаем шумы и разделяем камни с помощью PyMeshLab.
              </p>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-amber-500 h-1.5 rounded-full w-full animate-[progress_2s_ease-in-out_infinite]" style={{ transformOrigin: 'left' }} />
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-full text-red-400 mt-10 text-center px-4">
              <p className="mb-2 font-bold">Произошла ошибка при обработке файла.</p>
              {errorMessage && (
                <p className="mb-6 text-xs text-red-300/80 bg-red-950/50 p-3 rounded-lg border border-red-900/50 break-words w-full">
                  {errorMessage}
                </p>
              )}
              <button 
                onClick={() => {
                  setErrorMessage(null);
                  setStatus('idle');
                }} 
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          )}
          
          {status === 'completed' && <Dashboard />}
        </div>
      </div>

      {/* Основной Viewport 3D */}
      <div className="flex-1 relative bg-gradient-to-tr from-neutral-950 to-neutral-900">
        {(status === 'completed' || status === 'processing') ? (
           <Viewer />
        ) : (
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-neutral-700 text-lg flex items-center gap-3">
               Перетащите сканы (STL) в панель слева
             </div>
           </div>
        )}
      </div>
    </div>
  )
}
