export default function ContextMenuCommon({
  menuItems,
  contextMenu,
  closeContextMenu,
}: {
  menuItems: { label: string; onClick: () => void }[];
  contextMenu: { x: number; y: number; id: number } | null;
  closeContextMenu: () => void;
}) {
  if (!contextMenu)
    return null;

  return (
    <div
      className="fixed bg-base-100 shadow-lg rounded-md z-50"
      style={{ top: contextMenu.y, left: contextMenu.x }}
    >
      <ul className="menu p-2 w-40">
        {menuItems.map(item => (
          <li key={`${item.label}-${contextMenu.id}`}>
            <a onClick={(e) => {
              e.preventDefault();
              item.onClick();
              closeContextMenu();
            }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
