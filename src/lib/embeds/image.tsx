import { useState, useEffect } from "preact/hooks";
import { proxyImageUrl } from "./utils";
import { imageCache } from "../image-cache";

export function ImageEmbed({ url }: { url: string }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkImage = async () => {
      const proxiedUrl = proxyImageUrl(url);

      imageCache.load(proxiedUrl).then((dims) => {
        if (!cancelled && dims) {
          setDimensions({ width: dims.width, height: dims.height });
        }
      });

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
          method: "HEAD",
          mode: "cors",
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (cancelled) return;

        if (res.ok) {
          const ct = res.headers.get("Content-Type") || "";
          setIsValid(ct.startsWith("image/"));
        } else {
          setIsValid(false);
        }
      } catch (err) {
        if (!cancelled) setIsValid(false);
      }
    };

    checkImage();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (isValid === null) {
    const cached = imageCache.get(proxyImageUrl(url));
    const skeletonStyle = cached
      ? `width: ${Math.min(cached.width, 400)}px; height: ${Math.min(cached.height / (cached.width / Math.min(cached.width, 400)), 300)}px;`
      : "width: 300px; height: 200px;";
    return (
      <div
        className="embed-container image-embed skeleton"
        style={skeletonStyle}
      />
    );
  }
  if (!isValid)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );

  const placeholderStyle = dimensions
    ? `min-width: ${Math.min(dimensions.width, 400)}px; min-height: ${Math.min(dimensions.height / (dimensions.width / Math.min(dimensions.width, 400)), 300)}px;`
    : "min-width: 200px; min-height: 150px;";

  return (
    <div className="embed-container image-embed">
      <div className="chat-image-wrapper" style={placeholderStyle}>
        <img
          src={proxyImageUrl(url)}
          alt="image"
          className="message-image"
          data-image-url={url}
          loading="lazy"
          style="cursor: pointer"
        />
      </div>
    </div>
  );
}
