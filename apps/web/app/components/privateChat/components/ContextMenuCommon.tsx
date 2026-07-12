import { MenuItem, MenuSurface } from "@/components/common/MenuPopover";

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
      <MenuSurface as="ul" ariaLabel="私聊操作" className="w-40 p-2">
        {menuItems.map(item => (
          <li key={`${item.label}-${contextMenu.id}`} role="none">
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                item.onClick();
                closeContextMenu();
              }}
            >
              {item.label}
            </MenuItem>
          </li>
        ))}
      </MenuSurface>
    </div>
  );
}
