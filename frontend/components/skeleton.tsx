export function ProductCardSkeleton() {
  return (
    <div
      className="bg-white border border-[#e0e0e0] rounded-[18px] p-5 flex flex-col gap-3"
      aria-hidden="true"
    >
      <div className="h-[180px] w-full bg-slate-200 animate-pulse rounded-lg" />
      <div className="h-3.5 w-2/5 bg-slate-200 animate-pulse rounded-md" />
      <div className="h-5 w-[85%] bg-slate-200 animate-pulse rounded-md" />
      <div className="h-4 w-3/5 bg-slate-200 animate-pulse rounded-md" />
      <div className="flex justify-between items-center mt-2">
        <div className="h-6 w-[45%] bg-slate-200 animate-pulse rounded-md" />
        <div className="h-8 w-8 bg-slate-200 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export function SetupCardSkeleton() {
  return (
    <div
      className="bg-white border border-[#e0e0e0] rounded-[18px] overflow-hidden flex flex-col"
      aria-hidden="true"
    >
      <div className="h-[220px] w-full bg-slate-200 animate-pulse rounded-none" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-5 w-4/5 bg-slate-200 animate-pulse rounded-md" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-3.5 w-1/2 bg-slate-200 animate-pulse rounded-md" />
        </div>
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 w-[60px] bg-slate-200 animate-pulse rounded-md" />
          <div className="h-5 w-[70px] bg-slate-200 animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}
