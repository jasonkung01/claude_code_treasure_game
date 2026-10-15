import type { ScoreHistory as ScoreHistoryData } from '../lib/api';

interface ScoreHistoryProps {
  history: ScoreHistoryData | null;
  error: string;
}

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC; convert to the viewer's local time
function formatTime(utc: string) {
  return new Date(utc.replace(' ', 'T') + 'Z').toLocaleString();
}

export default function ScoreHistory({ history, error }: ScoreHistoryProps) {
  return (
    <div
      className="w-full p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400"
      style={{ maxWidth: 480 }}
    >
      <h2 className="text-2xl mb-2 text-center text-amber-900">我的分數紀錄</h2>

      {error && <p className="text-sm text-center text-red-600">{error}</p>}

      {!error && !history && <p className="text-sm text-center text-amber-800">載入中...</p>}

      {history && history.games === 0 && (
        <p className="text-sm text-center text-amber-800">還沒有紀錄，完成一局後會顯示在這裡。</p>
      )}

      {history && history.games > 0 && (
        <>
          <div className="flex justify-center gap-4 mb-2 text-amber-900">
            <span>場次：{history.games}</span>
            <span>最高分：${history.best}</span>
            <span>平均：${history.average}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-amber-900">
              <thead>
                <tr className="text-left">
                  <th className="p-2">時間</th>
                  <th className="p-2">分數</th>
                  <th className="p-2">結果</th>
                </tr>
              </thead>
              <tbody>
                {history.scores.map(record => (
                  <tr key={record.id} className="border-t border-amber-400">
                    <td className="p-2">{formatTime(record.playedAt)}</td>
                    <td className={`p-2 ${record.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${record.score}
                    </td>
                    <td className="p-2">{record.treasureFound ? '找到寶藏' : '未找到寶藏'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
