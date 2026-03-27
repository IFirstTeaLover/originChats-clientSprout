import { useState, useEffect, useRef } from "preact/hooks";
import {
  recentEmojis,
  servers,
  customEmojisByServer,
  serverUrl,
  useSystemEmojis,
} from "../../state";
import { getEmojiImgOrDataUri } from "../../lib/emoji";

export interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    emoji: string,
    isCustom?: boolean,
    emojiData?: { name: string; serverUrl: string },
  ) => void;
  anchorRef?: React.RefObject<HTMLElement>;
  mode?: "emoji" | "reaction";
}

interface EmojiEntry {
  label: string;
  hexcode: string;
  emoji: string;
  shortcodes?: string[];
  tags?: string[];
}

interface CustomEmojiItem {
  id: string;
  name: string;
  fileName: string;
  serverUrl: string;
  serverName: string;
}

function getCustomEmojiUrl(serverUrlStr: string, fileName: string): string {
  const baseUrl = serverUrlStr.startsWith("http")
    ? serverUrlStr
    : `https://${serverUrlStr}`;
  return `${baseUrl}/emojis/${fileName}`;
}

function categorizeEmojis(): Record<string, EmojiEntry[]> {
  const shortcodes: EmojiEntry[] = (window as any).shortcodes || [];
  const categories: Record<string, EmojiEntry[]> = {};

  for (const entry of shortcodes) {
    if (!entry.emoji || !entry.label) continue;
    const label = entry.label.toLowerCase();
    let category = "Other";

    if (
      label.includes("smile") ||
      label.includes("grin") ||
      label.includes("laugh") ||
      label.includes("cry") ||
      label.includes("tear") ||
      label.includes("sad") ||
      label.includes("angry") ||
      label.includes("face")
    ) {
      category = "Faces";
    } else if (
      label.includes("heart") ||
      label.includes("love") ||
      label.includes("kiss")
    ) {
      category = "Hearts";
    } else if (
      label.includes("cat") ||
      label.includes("dog") ||
      label.includes("bear") ||
      label.includes("animal") ||
      label.includes("monkey") ||
      label.includes("bird")
    ) {
      category = "Animals";
    } else if (
      label.includes("food") ||
      label.includes("fruit") ||
      label.includes("drink") ||
      label.includes("pizza") ||
      label.includes("burger") ||
      label.includes("cake")
    ) {
      category = "Food";
    } else if (
      label.includes("ball") ||
      label.includes("sport") ||
      label.includes("game") ||
      label.includes("soccer") ||
      label.includes("basketball")
    ) {
      category = "Sports";
    } else if (
      label.includes("hand") ||
      label.includes("finger") ||
      label.includes("wave")
    ) {
      category = "Hands";
    }

    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(entry);
  }

  return categories;
}

const CATEGORY_ORDER = [
  "Faces",
  "Hearts",
  "Animals",
  "Food",
  "Sports",
  "Hands",
  "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  Faces: "😀",
  Hearts: "❤️",
  Animals: "🐶",
  Food: "🍕",
  Sports: "⚽",
  Hands: "👋",
  Other: "📋",
};

export function EmojiPicker({
  isOpen,
  onClose,
  onSelect,
  anchorRef,
  mode = "emoji",
}: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, EmojiEntry[]>>(
    {},
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (isOpen) {
      setCategories(categorizeEmojis());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && anchorRef?.current && pickerRef.current) {
      positionPicker();
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !anchorRef?.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", positionPicker);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", positionPicker);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, anchorRef, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const firstSection = getSections()[0]?.id;
    if (firstSection && !activeSection) {
      setActiveSection(firstSection);
    }
  }, [isOpen, categories]);

  const positionPicker = () => {
    if (!anchorRef?.current || !pickerRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const pickerRect = pickerRef.current.getBoundingClientRect();

    const isMobile = window.innerWidth <= 768;
    let x = rect.left;
    let y = rect.bottom + 5;

    if (isMobile) {
      x = 0;
      y = window.innerHeight - pickerRect.height;
    } else {
      if (x + pickerRect.width > window.innerWidth - 10) {
        x = window.innerWidth - pickerRect.width - 10;
      }
      if (y + pickerRect.height > window.innerHeight - 10) {
        y = rect.top - pickerRect.height - 5;
      }
    }

    pickerRef.current.style.left = `${x}px`;
    pickerRef.current.style.top = `${y}px`;
  };

  const addEmoji = (emoji: string) => {
    const currentRecent = recentEmojis.value;
    const updated = currentRecent.includes(emoji)
      ? currentRecent.filter((e) => e !== emoji)
      : [emoji, ...currentRecent.slice(0, 49)];
    recentEmojis.value = updated;
    onSelect(emoji);
    onClose();
  };

  const addCustomEmoji = (emoji: CustomEmojiItem) => {
    onSelect(`:${emoji.name}:`, true, {
      name: emoji.name,
      serverUrl: emoji.serverUrl,
    });
    onClose();
  };

  const getCustomEmojisByServer = (): Map<string, CustomEmojiItem[]> => {
    const result = new Map<string, CustomEmojiItem[]>();
    const emojiData = customEmojisByServer.value;
    for (const [sUrl, emojis] of Object.entries(emojiData)) {
      const server = servers.value.find((s) => s.url === sUrl);
      const serverName = server?.name || sUrl;
      const items: CustomEmojiItem[] = [];
      for (const emoji of Object.values(emojis)) {
        items.push({
          id: emoji.id,
          name: emoji.name,
          fileName: emoji.fileName,
          serverUrl: sUrl,
          serverName,
        });
      }
      if (items.length > 0) {
        result.set(sUrl, items);
      }
    }
    return result;
  };

  const getSections = (): Array<{
    id: string;
    type: "custom" | "category";
    label: string;
    icon: string;
    serverData?: { url: string; name: string; icon?: string };
  }> => {
    const sections: Array<{
      id: string;
      type: "custom" | "category";
      label: string;
      icon: string;
      serverData?: { url: string; name: string; icon?: string };
    }> = [];
    const currentSUrl = serverUrl.value;
    const customEmojiData = getCustomEmojisByServer();

    const sortedServerUrls = Array.from(customEmojiData.keys()).sort((a, b) => {
      if (a === currentSUrl) return -1;
      if (b === currentSUrl) return 1;
      const serverA = servers.value.find((s) => s.url === a);
      const serverB = servers.value.find((s) => s.url === b);
      return (serverA?.name || a).localeCompare(serverB?.name || b);
    });

    for (const sUrl of sortedServerUrls) {
      const server = servers.value.find((s) => s.url === sUrl);
      sections.push({
        id: `custom-${sUrl}`,
        type: "custom",
        label: server?.name || sUrl,
        icon: server?.icon || "",
        serverData: {
          url: sUrl,
          name: server?.name || sUrl,
          icon: server?.icon || undefined,
        },
      });
    }

    for (const cat of CATEGORY_ORDER) {
      if (categories[cat] && categories[cat].length > 0) {
        sections.push({
          id: `category-${cat}`,
          type: "category",
          label: cat,
          icon: CATEGORY_ICONS[cat] || "📋",
        });
      }
    }

    return sections;
  };

  const renderEmoji = (emoji: string) => {
    if (useSystemEmojis.value) {
      return <span>{emoji}</span>;
    }
    const url = getEmojiImgOrDataUri(emoji);
    if (url) {
      return (
        <img
          src={url}
          alt={emoji}
          className="emoji-picker-emoji-img"
          draggable={false}
        />
      );
    }
    return <span>{emoji}</span>;
  };

  const handleScroll = () => {
    if (!contentRef.current) return;
    const scrollTop = contentRef.current.scrollTop;
    let currentSection = activeSection;

    for (const [id, el] of sectionRefs.current) {
      if (el.offsetTop <= scrollTop + 50) {
        currentSection = id;
      }
    }

    if (currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current.get(sectionId);
    if (el && contentRef.current) {
      contentRef.current.scrollTop = el.offsetTop - 8;
      setActiveSection(sectionId);
    }
  };

  if (!isOpen) return null;

  const sections = getSections();
  const customEmojiData = getCustomEmojisByServer();

  const filteredSections = searchTerm
    ? sections.filter((s) => {
        if (s.type === "custom") {
          const emojis = customEmojiData.get(s.serverData!.url) || [];
          return emojis.some((e) =>
            e.name.toLowerCase().includes(searchTerm.toLowerCase()),
          );
        } else {
          const cat = s.id.replace("category-", "");
          const entries = categories[cat] || [];
          return entries.some(
            (e) =>
              e.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
              e.emoji.includes(searchTerm),
          );
        }
      })
    : sections;

  return (
    <div ref={pickerRef} className={`emoji-picker emoji-picker-${mode}`}>
      <div className="emoji-picker-search">
        <input
          type="text"
          placeholder="Search emoji..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
        />
      </div>

      <div className="emoji-picker-body">
        <div className="emoji-picker-sidebar">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              className={`emoji-sidebar-item ${activeSection === section.id ? "active" : ""}`}
              onClick={() => scrollToSection(section.id)}
              title={section.label}
            >
              {section.type === "custom" && section.serverData?.icon ? (
                <img
                  src={section.serverData.icon}
                  alt={section.label}
                  className="emoji-sidebar-server-icon"
                />
              ) : section.type === "custom" ? (
                <span className="emoji-sidebar-server-letter">
                  {section.label.charAt(0).toUpperCase()}
                </span>
              ) : (
                <span className="emoji-sidebar-emoji">
                  {renderEmoji(section.icon)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          ref={contentRef}
          className="emoji-picker-content"
          onScroll={handleScroll}
        >
          {filteredSections.map((section) => {
            const emojis =
              section.type === "custom"
                ? (customEmojiData.get(section.serverData!.url) || []).filter(
                    (e) =>
                      !searchTerm ||
                      e.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                : (
                    categories[section.id.replace("category-", "")] || []
                  ).filter(
                    (e) =>
                      !searchTerm ||
                      e.label
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      e.emoji.includes(searchTerm),
                  );

            if (emojis.length === 0) return null;

            return (
              <div
                key={section.id}
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.id, el);
                }}
                className="emoji-section"
              >
                <div className="emoji-section-header">{section.label}</div>
                <div className="emoji-grid">
                  {section.type === "custom"
                    ? (emojis as CustomEmojiItem[]).map((emoji) => (
                        <button
                          key={emoji.id}
                          className="emoji-button"
                          onClick={() => addCustomEmoji(emoji)}
                          title={`:${emoji.name}:`}
                        >
                          <img
                            src={getCustomEmojiUrl(
                              emoji.serverUrl,
                              emoji.fileName,
                            )}
                            alt={emoji.name}
                            className="emoji-custom-img"
                          />
                        </button>
                      ))
                    : (emojis as EmojiEntry[]).map((entry) => (
                        <button
                          key={entry.hexcode}
                          className="emoji-button"
                          onClick={() => addEmoji(entry.emoji)}
                          title={entry.label}
                        >
                          {renderEmoji(entry.emoji)}
                        </button>
                      ))}
                </div>
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="emoji-empty">No emojis found</div>
          )}
        </div>
      </div>
    </div>
  );
}
