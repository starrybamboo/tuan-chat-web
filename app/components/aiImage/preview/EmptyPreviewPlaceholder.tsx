export function EmptyPreviewPlaceholder() {
  return (
    <div className="pointer-events-none select-none">
      <svg
        className="h-auto w-[106px] max-w-[20vw]"
        viewBox="0 0 106 74"
        aria-hidden="true"
      >
        <path
          d="M95.4 0C98.2113 0 100.907 1.11377 102.895 3.0963C104.883 5.07883 106 7.76771 106 10.5714V63.4286C106 66.2323 104.883 68.9212 102.895 70.9037C100.907 72.8862 98.2113 74 95.4 74H10.6C7.78871 74 5.09255 72.8862 3.10467 70.9037C1.11678 68.9212 0 66.2323 0 63.4286V10.5714C0 4.70429 4.717 0 10.6 0H95.4ZM15.9 58.1429H90.1L66.25 26.4286L47.7 50.2143L34.45 34.3571L15.9 58.1429Z"
          fill="#5F6471"
        />
      </svg>
    </div>
  );
}
