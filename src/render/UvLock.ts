import { mat4, vec3 } from 'gl-matrix'
import { Direction } from '../core/index.js'

const normals: Record<Direction, [number, number, number]> = {
	up: [0, 1, 0], down: [0, -1, 0], north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0],
}
const frames = Object.fromEntries(Object.keys(normals).map(side => {
	const m = mat4.create()
	if (side === 'up' || side === 'down') mat4.rotateX(m, m, side === 'up' ? -Math.PI / 2 : Math.PI / 2)
	else mat4.rotateY(m, m, side === 'east' ? Math.PI / 2 : side === 'west' ? -Math.PI / 2 : side === 'north' ? Math.PI : 0)
	return [side, m]
})) as Record<Direction, mat4>
const cache = new Map<string, Record<Direction, mat4>>()

/** Change between the original and rotated face's UV coordinate frames. */
export function uvLock(x: number, y: number): Record<Direction, mat4> {
	const key = `${x},${y}`
	const cached = cache.get(key)
	if (cached) return cached
	const rotation = mat4.create(), inverse = mat4.create()
	mat4.rotateY(rotation, rotation, -y * Math.PI / 180)
	mat4.rotateX(rotation, rotation, -x * Math.PI / 180)
	mat4.invert(inverse, rotation)
	const result = {} as Record<Direction, mat4>
	for (const [side, normal] of Object.entries(normals) as [Direction, [number, number, number]][]) {
		const rotated = vec3.transformMat4(vec3.create(), normal, rotation)
		const target = (Object.keys(normals) as Direction[]).find(n => vec3.dot(normals[n], rotated) > 0.9999)!
		const local = mat4.invert(mat4.create(), frames[side])!
		mat4.multiply(local, local, inverse)
		mat4.multiply(local, local, frames[target])
		// Block-state rotations are quarter turns; remove floating-point residue.
		for (let i = 0; i < 16; i++) local[i] = Math.round(local[i])
		const centered = mat4.fromTranslation(mat4.create(), [0.5, 0.5, 0])
		mat4.multiply(centered, centered, local)
		mat4.translate(centered, centered, [-0.5, -0.5, 0])
		result[side] = centered
	}
	cache.set(key, result)
	return result
}
