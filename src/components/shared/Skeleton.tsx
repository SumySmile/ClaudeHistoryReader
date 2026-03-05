function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#e8f0eb] rounded ${className || ''}`} />;
}

export function ConversationCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <SkeletonBox className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-full" />
          <div className="flex gap-2 mt-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-3 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageBubbleSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <SkeletonBox className="w-6 h-6 rounded-full" />
        <SkeletonBox className="h-3 w-20" />
      </div>
      <div className="space-y-2 ml-8">
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-5/6" />
        <SkeletonBox className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-[#d0ddd5]">
      {Array.from({ length: count }).map((_, i) => (
        <MessageBubbleSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <SkeletonBox className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <SkeletonBox className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <SkeletonBox className="h-6 w-20" />
                <SkeletonBox className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 mb-6 shadow-sm">
        <SkeletonBox className="h-5 w-32 mb-4" />
        <SkeletonBox className="h-[250px] w-full" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
          <SkeletonBox className="h-5 w-40 mb-4" />
          <SkeletonBox className="h-[250px] w-full" />
        </div>
        <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
          <SkeletonBox className="h-5 w-28 mb-4" />
          <SkeletonBox className="h-[250px] w-full" />
        </div>
      </div>
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-4 max-w-3xl">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-[#d0ddd5] overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#e8f0eb] space-y-1">
            <SkeletonBox className="h-4 w-2/3" />
            <SkeletonBox className="h-3 w-1/3" />
          </div>
          <div className="divide-y divide-[#d0ddd5]">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="px-4 py-3 space-y-1">
                <SkeletonBox className="h-3 w-full" />
                <SkeletonBox className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
