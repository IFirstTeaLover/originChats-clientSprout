import { memo, useEffect, useRef, useCallback } from "preact/compat";
import { useSystemEmojis } from "../../state";
import { getEmojiImgOrDataUri } from "../../lib/emoji";

interface EmojiButtonProps {
  emoji: string;
  label: string;
  hexcode: string;
  onClick: () => void;
}

function EmojiButtonImpl({ emoji, label, hexcode, onClick }: EmojiButtonProps) {
  return (
    <button
      className="emoji-button"
      onClick={onClick}
      title={label}
      type="button"
    >
      <EmojiImage emoji={emoji} hexcode={hexcode} />
    </button>
  );
}

export const EmojiButton = memo(EmojiButtonImpl);

interface CustomEmojiButtonProps {
  id: string;
  name: string;
  fileName: string;
  serverUrl: string;
  serverName: string;
  onClick: () => void;
}

function CustomEmojiButtonImpl({
  name,
  fileName,
  serverUrl,
  onClick,
}: CustomEmojiButtonProps) {
  const baseUrl = serverUrl.startsWith("http")
    ? serverUrl
    : `https://${serverUrl}`;
  const url = `${baseUrl}/emojis/${fileName}`;

  return (
    <button
      className="emoji-button"
      onClick={onClick}
      title={`:${name}:`}
      type="button"
    >
      <img
        src={url}
        alt={name}
        className="emoji-custom-img"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </button>
  );
}

export const CustomEmojiButton = memo(CustomEmojiButtonImpl);

interface EmojiImageProps {
  emoji: string;
  hexcode: string;
}

function EmojiImageImpl({ emoji }: EmojiImageProps) {
  const useSystem = useSystemEmojis.value;
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (useSystem) return;

    const span = spanRef.current;
    if (!span) return;

    const url = getEmojiImgOrDataUri(emoji);
    if (!url) return;

    const img = document.createElement("img");
    img.src = url;
    img.alt = emoji;
    img.className = "emoji-picker-emoji-img";
    img.draggable = false;
    img.loading = "lazy";
    img.decoding = "async";

    span.replaceChildren(img);

    return () => {
      if (span.contains(img)) {
        span.replaceChildren(emoji);
      }
    };
  }, [useSystem, emoji]);

  if (useSystem) {
    return <span className="emoji-picker-emoji">{emoji}</span>;
  }

  return (
    <span ref={spanRef} className="emoji-picker-emoji">
      {emoji}
    </span>
  );
}

export const EmojiImage = memo(EmojiImageImpl);
