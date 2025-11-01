export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-2xl font-bold">오프라인 상태입니다</h1>
        <p className="text-gray-600">네트워크 연결 후 다시 시도해주세요.</p>
      </div>
    </main>
  );
}