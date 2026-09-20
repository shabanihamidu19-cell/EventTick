export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[40vh]">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">Loading EventTick…</p>
    </div>
  );
}
