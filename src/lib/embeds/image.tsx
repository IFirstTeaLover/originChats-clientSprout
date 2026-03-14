import { useState, useEffect } from "preact/hooks";
import { proxyImageUrl } from "./utils";

export function ImageEmbed({ url }: { url: string }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkImage = async () => {
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
    return <div className="embed-container image-embed skeleton" />;
  }
  if (!isValid)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );

  return (
    <div className="embed-container image-embed">
      <div className="chat-image-wrapper">
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
