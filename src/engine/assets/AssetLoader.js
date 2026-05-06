export async function loadImageAssets(sources, onProgress = () => {}) {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  const images = new Map();

  if (uniqueSources.length === 0 || typeof Image !== "function") {
    onProgress(1);
    return images;
  }

  let completed = 0;
  const markComplete = () => {
    completed += 1;
    onProgress(completed / uniqueSources.length);
  };

  await Promise.all(
    uniqueSources.map(
      (src) =>
        new Promise((resolve) => {
          const image = new Image();

          image.decoding = "async";
          image.addEventListener(
            "load",
            () => {
              images.set(src, image);
              markComplete();
              resolve();
            },
            { once: true },
          );
          image.addEventListener(
            "error",
            () => {
              markComplete();
              resolve();
            },
            { once: true },
          );
          image.src = src;
        }),
    ),
  );

  return images;
}

export function getLoadedImage(imageCache, src) {
  return imageCache?.get(src) || null;
}
