interface RoomSidebarInsertLineProps {
  className?: string;
}

export default function RoomSidebarInsertLine({ className }: RoomSidebarInsertLineProps) {
  return (
    <div
      className={`pointer-events-none absolute left-3 right-3 h-0.5 bg-primary/60 rounded${className ? ` ${className}` : ""}`}
    />
  );
}
