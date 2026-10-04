export type RemoteCommand = Record<string, unknown>;

type Point = { x: number; y: number };

type PointerStart = {
  pointerId: number;
  point: Point;
  clientX: number;
  clientY: number;
  startedAt: number;
};

function pointOnImage(
  event: PointerEvent,
  image: HTMLImageElement
): Point | null {
  if (!image.naturalWidth || !image.naturalHeight) {
    return null;
  }

  const rect = image.getBoundingClientRect();
  const imageRatio =
    image.naturalWidth / image.naturalHeight;
  const boxRatio = rect.width / rect.height;

  let drawWidth = rect.width;
  let drawHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > boxRatio) {
    drawHeight = rect.width / imageRatio;
    offsetY = (rect.height - drawHeight) / 2;
  } else {
    drawWidth = rect.height * imageRatio;
    offsetX = (rect.width - drawWidth) / 2;
  }

  const x =
    (event.clientX - rect.left - offsetX) /
    drawWidth;
  const y =
    (event.clientY - rect.top - offsetY) /
    drawHeight;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  return { x, y };
}

export function bindRemoteTouch(
  screenSelector: string,
  imageSelector: string,
  send: (command: RemoteCommand) => boolean
): void {
  const screen =
    document.querySelector<HTMLElement>(screenSelector);
  const image =
    document.querySelector<HTMLImageElement>(imageSelector);

  if (!screen || !image) return;

  let start: PointerStart | null = null;

  screen.addEventListener('pointerdown', event => {
    if (
      event.target instanceof Element &&
      event.target.closest('button')
    ) {
      return;
    }

    const point = pointOnImage(event, image);
    if (!point) return;

    event.preventDefault();
    start = {
      pointerId: event.pointerId,
      point,
      clientX: event.clientX,
      clientY: event.clientY,
      startedAt: Date.now(),
    };

    try {
      screen.setPointerCapture(event.pointerId);
    } catch {}
  });

  screen.addEventListener('pointerup', event => {
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    const current = start;
    start = null;
    const end = pointOnImage(event, image);
    if (!end) return;

    event.preventDefault();

    const distance = Math.hypot(
      event.clientX - current.clientX,
      event.clientY - current.clientY
    );

    if (distance < 12) {
      send({
        type: 'tap',
        x: current.point.x,
        y: current.point.y,
      });
      return;
    }

    send({
      type: 'swipe',
      x1: current.point.x,
      y1: current.point.y,
      x2: end.x,
      y2: end.y,
      duration: Math.max(
        100,
        Math.min(1200, Date.now() - current.startedAt)
      ),
    });
  });

  screen.addEventListener('pointercancel', () => {
    start = null;
  });
}
