const { floor, min, sqrt } = Math;

/** @typedef {{ x: number, y: number, z: number }} VectorStruct */
/** @typedef {{ r: number, g: number, b: number }} ColorStruct */
/** @typedef {{ pos: VectorStruct, forward: VectorStruct, right: VectorStruct, up: VectorStruct }} CameraStruct */
/** @typedef {{ start: VectorStruct, dir: VectorStruct }} RayStruct */
/** @typedef {{ thing: Plane | Sphere, ray: RayStruct, dist: number }} IntersectionStruct */
/** @typedef {{ diffuse: (v?: VectorStruct) => ColorStruct, specular: (v?: VectorStruct) => ColorStruct, reflect: (v?: VectorStruct) => number, roughness: number }} SurfaceStruct */
/** @typedef {{ pos: VectorStruct, color: ColorStruct }} LightStruct */
/** @typedef {{ things: (Plane | Sphere)[], lights: LightStruct[], camera: CameraStruct }} SceneStruct */

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {VectorStruct}
 */
const vector = (x, y, z) => ({ x, y, z });

const Vector = {
    /**
     * @param {number} k
     * @param {VectorStruct} param1 
     * @returns
     */
    times: (k, { x, y, z }) => vector(k * x, k * y, k * z),

    /**
     * @param {VectorStruct} v1
     * @param {VectorStruct} v2
     * @returns
     */
    minus: (v1, v2) => vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z),

    /**
     * @param {VectorStruct} v1
     * @param {VectorStruct} v2
     * @returns
     */
    plus: (v1, v2) => vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z),

    /**
     * @param {VectorStruct} v1
     * @param {VectorStruct} v2
     * @returns
     */
    dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z,

    /**
     * @param {VectorStruct} param0
     * @returns
     */
    mag: ({ x, y, z }) => sqrt(x * x + y * y + z * z),

    /**
     * @param {VectorStruct} v
     * @returns
     */
    norm: v => {
        const mag = Vector.mag(v);
        const div = (mag === 0) ? Infinity : 1.0 / mag;
        return Vector.times(div, v);
    },

    /**
     * @param {VectorStruct} v1
     * @param {VectorStruct} v2
     * @returns
     */
    cross: (v1, v2) => vector(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    )
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {ColorStruct}
 */
const color = (r, g, b) => ({ r, g, b });

const black = color(0.0, 0.0, 0.0);

const Color = {
    black,
    background: black,
    defaultColor: black,
    white: color(1.0, 1.0, 1.0),
    grey: color(0.5, 0.5, 0.5),

    /**
     * @param {number} k
     * @param {ColorStruct} param1
     * @returns
     */
    scale: (k, { r, g, b }) => color(k * r, k * g, k * b),

    /**
     * @param {ColorStruct} v1
     * @param {ColorStruct} v2
     * @returns
     */
    plus: (v1, v2) => color(v1.r + v2.r, v1.g + v2.g, v1.b + v2.b),

    /**
     * @param {ColorStruct} v1
     * @param {ColorStruct} v2
     * @returns
     */
    times: (v1, v2) => color(v1.r * v2.r, v1.g * v2.g, v1.b * v2.b),

    /**
     * @param {ColorStruct} param0
     * @returns
     */
    toDrawingColor: ({ r, g, b }) => color(
        floor(min(r, 1) * 255),
        floor(min(g, 1) * 255),
        floor(min(b, 1) * 255)
    )
};

/**
 * @param {VectorStruct} pos
 * @param {VectorStruct} lookAt
 * @returns {CameraStruct}
 */
const camera = (pos, lookAt) => {
    const forward = Vector.norm(Vector.minus(lookAt, pos));
    const right = Vector.times(1.5, Vector.norm(Vector.cross(forward, vector(0.0, -1.0, 0.0))));
    return { pos, forward, right, up: Vector.times(1.5, Vector.norm(Vector.cross(forward, right))) };
};

const geo = (thing, ray, dist) => ({ thing, ray, dist });
class Sphere {
    /**
     * @param {VectorStruct} center
     * @param {number} radius
     * @param {SurfaceStruct} surface
     */
    constructor(center, radius, surface) {
        this.center = center;
        this.surface = surface;
        this.radius2 = radius * radius;
    }

    /**
     * @param {VectorStruct} pos 
     * @returns
     */
    normal(pos) {
        return Vector.norm(Vector.minus(pos, this.center));
    }

    /**
     * @param {RayStruct} r
     * @returns {IntersectionStruct}
     */
    intersect(r) {
        const eo = Vector.minus(this.center, r.start);
        const v = Vector.dot(eo, r.dir);
        let dist = 0;
        if (v >= 0) {
            const disc = this.radius2 - (Vector.dot(eo, eo) - v * v);
            if (disc >= 0)
                dist = v - sqrt(disc);
        }
        return dist === 0 ? null : geo(this, r, dist);
    }
}


class Plane {
    /**
     * @param {VectorStruct} norm
     * @param {number} offset
     * @param {SurfaceStruct} surface
     */
    constructor(norm, offset, surface) {
        this.norm = norm;
        this.offset = offset;
        this.surface = surface;
    }

    /**
     * @param {VectorStruct} _
     * @returns
     */
    normal(_) {
        return this.norm;
    }

    /**
     * @param {RayStruct} r
     * @returns {IntersectionStruct}
     */
    intersect(r) {
        const { norm, offset } = this;
        const denom = Vector.dot(norm, r.dir);
        return denom > 0 ? null : geo(this, r, (Vector.dot(norm, r.start) + offset) / (-denom));
    }
}

const Surfaces = {
    /** @type {SurfaceStruct} */
    shiny: {
        diffuse: (_) => Color.white,
        specular: (_) => Color.grey,
        reflect: (_) => 0.7,
        roughness: 250
    },
    /** @type {SurfaceStruct} */
    checkerboard: {
        diffuse: ({ x, z }) => (floor(z) + floor(x)) % 2 !== 0 ? Color.white : Color.black,
        specular: (_) => Color.white,
        reflect: ({ x, z }) => (floor(z) + floor(x)) % 2 !== 0 ? 0.1 : 0.7,
        roughness: 150
    }
};

/**
 * @param {VectorStruct} start
 * @param {VectorStruct} dir
 * @returns {RayStruct}
 */
const ray = (start, dir) => ({ start, dir });

class RayTracer {
    constructor() {
        this.maxDepth = 5;
    }

    /**
     * @param {RayStruct} r
     * @param {SceneStruct} scene
     * @returns {IntersectionStruct?}
     */
    intersections(r, scene) {
        let closest = +Infinity;
        let closestInter = null;
        for (const thing of scene.things) {
            const inter = thing.intersect(r);
            if (inter != null && inter.dist < closest) {
                closestInter = inter;
                closest = inter.dist;
            }
        }
        return closestInter;
    }

    /**
     * @param {RayStruct} r
     * @param {SceneStruct} scene
     * @returns {number?}
     */
    testRay(r, scene) {
        return this.intersections(r, scene)?.dist;
    }

    /**
     * @param {RayStruct} r
     * @param {SceneStruct} scene
     * @param {number} depth
     * @returns
     */
    traceRay(r, scene, depth) {
        const isect = this.intersections(r, scene);
        return isect == null ? Color.background : this.shade(isect, scene, depth);
    }

    /**
     * 
     * @param {IntersectionStruct} param0
     * @param {SceneStruct} scene
     * @param {number} depth
     * @returns {ColorStruct}
     */
    shade({ thing, dist, ray: { start, dir } }, scene, depth) {
        const pos = Vector.plus(Vector.times(dist, dir), start);
        const normal = thing.normal(pos);
        const reflectDir = Vector.minus(dir, Vector.times(2, Vector.times(Vector.dot(normal, dir), normal)));
        return Color.plus(
            Color.plus(Color.background, this.getNaturalColor(thing, pos, normal, reflectDir, scene)),
            (depth >= this.maxDepth) ? Color.grey : this.getReflectionColor(thing, pos, normal, reflectDir, scene, depth)
        );
    }

    /**
     * @param {Plane | Sphere} param0
     * @param {VectorStruct} pos
     * @param {VectorStruct} _
     * @param {VectorStruct} rd
     * @param {SceneStruct} scene
     * @param {number} depth
     * @returns
     */
    getReflectionColor({ surface }, pos, _, rd, scene, depth) {
        return Color.scale(surface.reflect(pos), this.traceRay(ray(pos, rd), scene, depth + 1));
    }

    /**
     * @param {Plane | Sphere} param0
     * @param {VectorStruct} pos
     * @param {VectorStruct} norm
     * @param {VectorStruct} rd
     * @param {SceneStruct} scene
     * @returns
     */
    getNaturalColor({ surface }, pos, norm, rd, scene) {
        let col = Color.defaultColor;
        for (const light of scene.lights) {
            const ldis = Vector.minus(light.pos, pos);
            const livec = Vector.norm(ldis);
            const neatIsect = this.testRay(ray(pos, livec), scene);
            if (neatIsect != null && neatIsect <= Vector.mag(ldis))
                continue;
            const illum = Vector.dot(livec, norm);
            const lcolor = illum > 0 ? Color.scale(illum, light.color) : Color.defaultColor;
            const specular = Vector.dot(livec, Vector.norm(rd));
            const scolor = specular > 0 ?
                Color.scale(Math.pow(specular, surface.roughness), light.color) :
                Color.defaultColor;
            col = Color.plus(col, Color.plus(Color.times(surface.diffuse(pos), lcolor), Color.times(surface.specular(pos), scolor)));
        }
        return col;
    }

    /**
     * @param {SceneStruct} scene
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenWidth
     * @param {number} screenHeight
     */
    render(scene, ctx, screenWidth, screenHeight) {
        const recenterX = x => (x - (screenWidth / 2.0)) / 2.0 / screenWidth;
        const recenterY = y => -(y - (screenHeight / 2.0)) / 2.0 / screenHeight;
        const getPoint = (x, y, camera) => Vector.norm(
            Vector.plus(camera.forward, Vector.plus(
                Vector.times(recenterX(x), camera.right),
                Vector.times(recenterY(y), camera.up)
            ))
        );
        const { camera } = scene;
        for (let y = 0; y < screenHeight; y++) {
            for (let x = 0; x < screenWidth; x++) {
                const { r, g, b } = Color.toDrawingColor(
                    this.traceRay(ray(camera.pos, getPoint(x, y, camera)), scene, 0)
                );
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}

/**
 * @param {VectorStruct} pos
 * @param {ColorStruct} color
 * @returns {LightStruct}
 */
const light = (pos, color) => ({ pos, color });

/**
 * @returns {SceneStruct}
 */
const defaultScene = () => ({
    things: [
        new Plane(vector(0.0, 1.0, 0.0), 0.0, Surfaces.checkerboard),
        new Sphere(vector(0.0, 1.0, -0.25), 1.0, Surfaces.shiny),
        new Sphere(vector(-1.0, 0.5, 1.5), 0.5, Surfaces.shiny)
    ],
    lights: [
        light(vector(-2.0, 2.5, 0.0), color(0.49, 0.07, 0.07)),
        light(vector(1.5, 2.5, 1.5), color(0.07, 0.07, 0.49)),
        light(vector(1.5, 2.5, -1.5), color(0.07, 0.49, 0.071)),
        light(vector(0.0, 3.5, 0.0), color(0.21, 0.21, 0.35))
    ],
    camera: camera(vector(3.0, 2.0, 4.0), vector(-1.0, 0.5, 0.0))
});


/**
 * @param {number} width
 * @param {number} height
 */
const exec = (width, height) => {
    const canv = document.createElement("canvas");
    canv.width = width;
    canv.height = height;
    (new RayTracer).render(defaultScene(), canv.getContext("2d"), width, height);
    document.body.appendChild(canv);
};


const size = 256;
const render = () => new Promise(resolve => {
    requestAnimationFrame(() => {
        console.time('raytrace JS');
        exec(size, size);
        console.timeEnd('raytrace JS');
        resolve();
    });
});

render()
    .then(render)
    .then(render)
    .then(render)
    .then(render)
    .then(render)
    .then(() => {
        document.documentElement.classList.add('done');
    });
