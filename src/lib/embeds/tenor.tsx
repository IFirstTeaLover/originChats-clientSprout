import { useState, useEffect } from "preact/hooks";
import { proxyImageUrl } from "./utils";
import { imageCache } from "../image-cache";

interface TenorEmbedProps {
  tenorId: string;
  originalUrl: string;
}

export function TenorEmbed({ tenorId, originalUrl }: TenorEmbedProps) {
  const [gifUrl, setGifUrl] = useState("");
  const [error, setError] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`https://apps.mistium.com/tenor/get?id=${tenorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Tenor API failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data?.[0]?.media?.[0]) throw new Error("Invalid Tenor response");
        const media = data[0].media[0];
        const url =
          media.mediumgif?.url || media.gif?.url || media.tinygif?.url;
        if (!url) throw new Error("No GIF URL found");
        setGifUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tenorId]);

  useEffect(() => {
    if (!gifUrl) return;

    const cached = imageCache.get(gifUrl);
    if (cached) {
      setDimensions({ width: cached.width, height: cached.height });
      return;
    }

    imageCache.load(proxyImageUrl(gifUrl)).then((dims) => {
      if (dims) setDimensions({ width: dims.width, height: dims.height });
    });
  }, [gifUrl]);

  if (error || !gifUrl) {
    return (
      <div
        className="embed-container tenor-embed skeleton"
        style="width: 200px; height: 150px;"
      />
    );
  }

  const placeholderStyle = dimensions
    ? `min-width: ${Math.min(dimensions.width, 350)}px; min-height: ${Math.min(dimensions.height / (dimensions.width / Math.min(dimensions.width, 350)), 200)}px;`
    : "min-width: 200px; min-height: 150px;";

  return (
    <div className="embed-container tenor-embed">
      <div className="chat-image-wrapper" style={placeholderStyle}>
        <img
          src={proxyImageUrl(gifUrl)}
          alt="Tenor GIF"
          className="tenor-gif message-image"
          data-image-url={gifUrl}
          loading="lazy"
        />
      </div>
    </div>
  );
}
