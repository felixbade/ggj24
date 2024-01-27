import { container } from './render.js'

export const cameraFollow = sprite => {
    const view = container.getGlobalPosition()
    const target = sprite.getGlobalPosition()
    const canvasScaling = container.parent.scale

    const newCentering = {
        x: (view.x - target.x) / canvasScaling.x,
        y: (view.y - target.y) / canvasScaling.y
    }

    const diff = {
        x: newCentering.x - container.x,
        y: newCentering.y - container.y
    }

    const r = a => Math.sqrt(a.x * a.x + a.y * a.y)

    // Exponential smoothing
    const t = mapClamp(1 / (Math.sqrt(r(diff)) * 1.2 + 1), 1, 0.1, 0.5, 0.07)
    // const t = 0.07
    container.x += diff.x * t
    container.y += diff.y * t
}

const mapClamp = (x, in_min, in_max, out_min, out_max) => {
    // x = in_min .. in_max
    x -= in_min
    // x = 0 .. in_max - in_min
    x /= (in_max - in_min)
    // x = 0 .. 1
    x = Math.max(0, Math.min(1, x))
    x *= (out_max - out_min)
    // x = 0 .. out_max - out_min
    x += out_min
    // x = out_min .. out_max
    return x
}