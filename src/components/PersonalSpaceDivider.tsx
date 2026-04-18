export function PersonalSpaceDivider() {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-amber-200" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-4 bg-amber-50 text-blue-900 font-medium tracking-wider uppercase text-xs">
          <span className="opacity-75">~</span> Personal Space <span className="opacity-75">~</span>
        </span>
      </div>
    </div>
  );
}
