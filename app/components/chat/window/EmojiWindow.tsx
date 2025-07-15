export default function EmojiWindow({ onChoose }: { onChoose: (emoji: string) => void }) {
  return (
    <div onClick={() => onChoose("")}>
      开发中
    </div>
  );
};
