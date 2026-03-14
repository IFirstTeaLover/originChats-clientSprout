interface ImageDimensions {
  width: number;
  height: number;
  timestamp: number;
}

const MAX_CACHE_SIZE = 500;
const CACHE_TTL = 30 * 60 * 1000;

class ImageCache {
  private cache = new Map<string, ImageDimensions>();
  private pendingLoads = new Map<string, Promise<ImageDimensions | null>>();

  get(url: string): ImageDimensions | null {
    const cached = this.cache.get(url);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      this.cache.delete(url);
      return null;
    }
    return cached;
  }

  set(url: string, width: number, height: number): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(url, { width, height, timestamp: Date.now() });
  }

  async load(url: string): Promise<ImageDimensions | null> {
    const cached = this.get(url);
    if (cached) return cached;

    const pending = this.pendingLoads.get(url);
    if (pending) return pending;

    const loadPromise = this._loadImage(url);
    this.pendingLoads.set(url, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.pendingLoads.delete(url);
    }
  }

  private _loadImage(url: string): Promise<ImageDimensions | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          this.set(url, img.naturalWidth, img.naturalHeight);
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            timestamp: Date.now(),
          });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  has(url: string): boolean {
    return this.cache.has(url) && this.get(url) !== null;
  }

  delete(url: string): void {
    this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
    this.pendingLoads.clear();
  }

  getPlaceholderStyle(
    url: string,
    maxWidth = 400,
    maxHeight = 300,
  ): string | null {
    const dims = this.get(url);
    if (!dims) return null;

    let { width, height } = dims;
    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return `width: ${Math.round(width)}px; height: ${Math.round(height)}px;`;
  }
}

export const imageCache = new ImageCache();
