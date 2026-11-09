import { describe, expect, it } from 'vitest'
import '../../src/index.js'
import { Direction, Identifier } from '../../src/core/index.js'
import { BlockModel } from '../../src/render/BlockModel.js'
import { BlockDefinition } from '../../src/render/BlockDefinition.js'
import type { Mesh } from '../../src/render/Mesh.js'
import type { TextureAtlasProvider } from '../../src/render/TextureAtlas.js'

const atlas: TextureAtlasProvider = { getTextureAtlas() { throw new Error('Not used') }, getTextureUV() { return [0, 0, 1, 1] } }
const faces = Object.fromEntries(Direction.ALL.map(side => [side, { texture: '#all', cullface: side }]))
const cube = BlockModel.fromJson({ textures: { all: 'block/stone' }, elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces }] })
const provider = { getBlockModel: () => cube }
const render = (x: number, y: number, uvlock = true, cull = {}) => BlockDefinition.fromJson({ variants: { '': { model: 'block/test', x, y, uvlock } } })
	.getMesh(Identifier.create('stone'), {}, atlas, provider, cull)
const samples = (mesh: Mesh) => mesh.quads.flatMap(q => q.vertices().map(v => [
	[...q.normal().components(), ...v.pos.components()].map(n => Math.round(n * 1e5)).join(','), v.texture!,
] as const)).sort(([a], [b]) => a.localeCompare(b))

describe('block model transforms', () => {
	for (const x of [0, 90, 180, 270]) for (const y of [0, 90, 180, 270]) {
		it(`UV lock preserves world texture orientation for x=${x}, y=${y}`, () => {
			const expected = samples(render(0, 0)), actual = samples(render(x, y))
			expect(actual.map(([key]) => key)).toEqual(expected.map(([key]) => key))
			actual.forEach(([, uv], i) => uv.forEach((n, j) => expect(n).toBeCloseTo(expected[i][1][j], 5)))
		})
		it(`culling removes the requested world face for x=${x}, y=${y}`, () => {
			for (const side of Direction.ALL) {
				const mesh = render(x, y, false, { [side]: true })
				expect(mesh.quads).toHaveLength(5)
				const direction = Direction.normal(side)
				expect(mesh.quads.some(q => q.normal().components().every((n, i) => Math.abs(n - direction[i]) < 1e-5))).toBe(false)
			}
		})
	}
	it('unlocked rotated textures remain different from locked textures', () => {
		expect(samples(render(0, 90, false))).not.toEqual(samples(render(0, 90, true)))
	})
	it('partial top and bottom faces sample the corresponding part of their texture', () => {
		const model = BlockModel.fromJson({ textures: { all: 'block/stone' }, elements: [{ from: [2, 0, 3], to: [7, 16, 11], faces }] })
		for (const q of model.getMesh(atlas, {}).quads) if (Math.abs(q.normal().y) === 1) for (const v of q.vertices()) {
			expect(v.texture![0]).toBeCloseTo(v.pos.x / 16)
			expect(v.texture![1]).toBeCloseTo(q.normal().y > 0 ? v.pos.z / 16 : 1 - v.pos.z / 16)
		}
	})
	for (const angle of [0, 22.5, -22.5, 45, -45]) it(`element rescaling preserves plane width at ${angle} degrees`, () => {
		const model = BlockModel.fromJson({ textures: { all: 'block/stone' }, elements: [{
			from: [0, 0, 8], to: [16, 16, 8], faces: { north: faces.north },
			rotation: { axis: 'y', angle, origin: [8, 8, 8], rescale: true },
		}] })
		const xs = model.getMesh(atlas, {}).quads.flatMap(q => q.vertices().map(v => v.pos.x))
		expect(Math.min(...xs)).toBeCloseTo(0, 5)
		expect(Math.max(...xs)).toBeCloseTo(16, 5)
	})
})
