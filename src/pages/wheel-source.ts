export type WheelSource = 'wheel' | 'trackpad'

export interface WheelSample {
  deltaX: number
  deltaY: number
  deltaMode: number
  timeStamp: number
  wheelDeltaY?: number
}

export interface WheelGesture {
  source: WheelSource
  timeStamp: number
}

/**
 * Tells a mouse wheel from two-finger trackpad scrolling, which reach the page as the same event.
 * The first event after a pause decides and the rest of the gesture keeps that answer, because the tail of a trackpad
 * scroll can look like a wheel step (one axis, a large round delta) and would otherwise zoom in the middle of a pan.
 */
export function classifyWheel(e: WheelSample, previous: WheelGesture | null): WheelGesture {
  if (previous && e.timeStamp - previous.timeStamp < 200) return { source: previous.source, timeStamp: e.timeStamp }
  return { source: isWheelStep(e) ? 'wheel' : 'trackpad', timeStamp: e.timeStamp }
}

function isWheelStep({ deltaX, deltaY, deltaMode, wheelDeltaY }: WheelSample) {
  // only a wheel scrolls by lines or pages (Firefox); a wheel has one axis, and Shift+wheel, which the OS turns sideways, should pan
  if (deltaMode !== 0) return true
  if (deltaX !== 0 || deltaY === 0) return false
  // Chrome on Windows and Linux reports 120 per notch whatever the pixel delta is; a trackpad's first delta is a few pixels
  if (wheelDeltaY && wheelDeltaY % 120 === 0) return true
  // macOS gives a wheel a 16.16 fixed-point line count (0.1 for a slow notch) and Chrome and WebKit multiply it by 40 px,
  // hence deltaY 4.000244140625; trackpad deltas are whole points or binary fractions of one on a scaled display
  const lineUnits = (deltaY * 65536) / 40
  return !Number.isInteger(deltaY * 8) && Math.abs(lineUnits - Math.round(lineUnits)) < 1e-6
}
