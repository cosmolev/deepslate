import { describe, expect, it } from 'vitest'
import '../../src/index.js'
import { BlockState, Direction } from '../../src/core/index.js'
import { Cull } from '../../src/render/Cull.js'
import { SpecialRenderers } from '../../src/render/SpecialRenderer.js'
import type { Mesh } from '../../src/render/Mesh.js'
import type { TextureAtlasProvider } from '../../src/render/TextureAtlas.js'

const textures = new Set<string>()
const atlas: TextureAtlasProvider = {
	getTextureAtlas() { throw new Error('No pixels needed for geometry tests') },
	getTextureUV(id) { textures.add(String(id)); return [0, 0, 1, 1] },
}
const render = (name: string, properties = {}, cull = Cull.none()) => {
	textures.clear()
	return SpecialRenderers.getBlockMesh(new BlockState(name, properties), undefined, atlas, cull)
}
const bounds = (mesh: Mesh) => [0, 1, 2].map(axis => {
	const values = mesh.quads.flatMap(q => q.vertices().map(v => v.pos.components()[axis]))
	return [Math.min(...values), Math.max(...values)]
})
const near = (actual: number[], expected: number[]) => actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5))
const finite = (mesh: Mesh) => {
	expect(mesh.quads.length).toBeGreaterThan(0)
	for (const q of mesh.quads) for (const v of q.vertices())
		expect([...v.pos.components(), ...v.texture!, ...v.textureLimit!, ...v.color].every(Number.isFinite)).toBe(true)
}

describe('Java 1.21.1 special block models', () => {
	const heads = ['skeleton_skull', 'wither_skeleton_skull', 'zombie_head', 'creeper_head', 'dragon_head', 'piglin_head', 'player_head']
	for (const name of heads) for (const facing of ['north', 'east', 'south', 'west']) {
		it(`${name} has a wall model facing ${facing}`, () => {
			const wall = name.replace(/_(head|skull)$/, '_wall_$1')
			finite(render(wall, { facing, powered: 'false' }))
			if (!['dragon_head', 'piglin_head', 'player_head'].includes(name)) {
				const b = bounds(render(wall, { facing }))
				near(b[1], [.25, .75])
				near(b[0], facing === 'east' ? [0, .5] : facing === 'west' ? [.5, 1] : [.25, .75])
				near(b[2], facing === 'north' ? [.5, 1] : facing === 'south' ? [0, .5] : [.25, .75])
			}
		})
	}
	it('skull face UVs point out from the wall and use the vanilla floor rotation convention', () => {
		for (const [facing, normal, rotation] of [
			['north', [0, 0, -1], '0'], ['east', [1, 0, 0], '4'],
			['south', [0, 0, 1], '8'], ['west', [-1, 0, 0], '12'],
		] as const) {
			for (const mesh of [render('skeleton_wall_skull', { facing }), render('skeleton_skull', { rotation })]) {
				const face = mesh.quads.find(q => q.v1.textureLimit![0] === .125 && q.v1.textureLimit![1] === .25)!
				expect(face).toBeDefined()
				near(face.normal().components(), [...normal])
			}
		}
	})
	it('player heads include the skin overlay and use the default vanilla skin', () => {
		const mesh = render('player_head')
		expect(mesh.quads).toHaveLength(12)
		expect([...textures]).toEqual(['minecraft:entity/player/wide/steve'])
		near(bounds(mesh)[1], [-.25 / 16, 8.25 / 16])
	})
	for (const facing of Direction.ALL) it(`undyed shulker box faces ${facing}`, () => {
		const mesh = render('shulker_box', { facing })
		finite(mesh)
		expect([...textures]).toEqual(['minecraft:entity/shulker/shulker'])
		for (const axis of bounds(mesh)) near(axis, [0, 1])
	})
	it('banners resolve the actual banner base texture', () => {
		for (const name of ['white_banner', 'red_wall_banner']) {
			finite(render(name))
			expect(textures.has('minecraft:entity/banner_base')).toBe(true)
			expect(textures.has('minecraft:entity/banner/banner_base')).toBe(false)
		}
	})
	it('End portals have the vanilla horizontal surfaces; gateways have all six faces', () => {
		const portal = render('end_portal')
		expect(portal.quads).toHaveLength(2)
		near(bounds(portal)[1], [.375, .75])
		expect(portal.quads.every(q => Math.abs(q.normal().y) === 1)).toBe(true)
		expect(render('end_portal', {}, { up: true }).quads).toHaveLength(1)
		const gateway = render('end_gateway')
		expect(gateway.quads).toHaveLength(6)
		for (const axis of bounds(gateway)) near(axis, [0, 1])
		expect(render('end_gateway', {}, { north: true, down: true }).quads).toHaveLength(4)
	})
	for (const name of ['chest', 'trapped_chest']) it(`${name} joins the double halves and uses the half textures`, () => {
		const texture = name === 'chest' ? 'normal' : 'trapped'
		const left = render(name, { facing: 'north', type: 'left' })
		expect([...textures]).toEqual([`minecraft:entity/chest/${texture}_left`])
		near(bounds(left)[0], [0, 15 / 16])
		const right = render(name, { facing: 'north', type: 'right' })
		expect([...textures]).toEqual([`minecraft:entity/chest/${texture}_right`])
		near(bounds(right)[0], [1 / 16, 1])
		near(bounds(right)[1], [0, 14 / 16])
		near(bounds(right)[2], [0, 15 / 16])
		for (const facing of ['north', 'east', 'south', 'west']) for (const type of ['single', 'left', 'right'])
			finite(render(name, { facing, type }))
	})
})
