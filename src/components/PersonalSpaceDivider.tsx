export function PersonalSpaceDivider() {
  return (
    <div className="relative my-8 w-full">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-4 bg-background text-muted-foreground font-medium tracking-widest uppercase text-xs">
          ✦ Personal Space ✦
        </span>
      </div>
    </div>
  );
}
