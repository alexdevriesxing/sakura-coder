import { useSakuraStore } from '../store/useSakuraStore';
import { Wifi, WifiOff, GitBranch, Code, FileText } from 'lucide-react';

export function StatusBar() {
  const { status, openFile, project } = useSakuraStore();

  return (
    <footer className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {status}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {project && <GitBranch size={12} style={{ opacity: 0.5 }} />}
        {openFile && (
          <>
            <span title={`Line ending, encoding`} style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Code size={11} style={{ opacity: 0.5 }} /> {openFile.language}
            </span>
            <span title="UTF-8">UTF-8</span>
            <span title="Spaces: 2">Spaces: 2</span>
            <span title="Line endings">LF</span>
          </>
        )}
      </div>
    </footer>
  );
}
