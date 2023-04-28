const { floor, min, sqrt } = Math;

const vector = (x, y, z) => ({ x, y, z });
const Vector = {
    times: (k, { x, y, z }) => vector(k * x, k * y, k * z),
    minus: (v1, v2) => vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z),
    plus: (v1, v2) => vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z),
    dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z,
    mag: ({ x, y, z }) => sqrt(x * x + y * y + z * z),
    norm: v => {
        const mag = Vector.mag(v);
        const div = (mag === 0) ? Infinity : 1.0 / mag;
        return Vector.times(div, v);
    },
    cross: (v1, v2) => vector(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    )
};

const color = (r, g, b) => ({ r, g, b });
const black = color(0.0, 0.0, 0.0);
const Color = {
    black,
    background: black,
    defaultColor: black,
    white: color(1.0, 1.0, 1.0),
    grey: color(0.5, 0.5, 0.5),
    scale: (k, { r, g, b }) => color(k * r, k * g, k * b),
    plus: (v1, v2) => color(v1.r + v2.r, v1.g + v2.g, v1.b + v2.b),
    times: (v1, v2) => color(v1.r * v2.r, v1.g * v2.g, v1.b * v2.b),
    toDrawingColor: ({ r, g, b }) => color(
        floor(min(r, 1) * 255),
        floor(min(g, 1) * 255),
        floor(min(b, 1) * 255)
    )
};

const camera = (pos, lookAt) => {
    const forward = Vector.norm(Vector.minus(lookAt, pos));
    const right = Vector.times(1.5, Vector.norm(Vector.cross(forward, vector(0.0, -1.0, 0.0))));
    return { pos, forward, right, up: Vector.times(1.5, Vector.norm(Vector.cross(forward, right))) };
};

class Sphere {
    constructor(center, radius, surface) {
        this.center = center;
        this.surface = surface;
        this.radius2 = radius * radius;
    }
    normal(pos) {
        return Vector.norm(Vector.minus(pos, this.center));
    }
    intersect(ray) {
        const eo = Vector.minus(this.center, ray.start);
        const v = Vector.dot(eo, ray.dir);
        let dist = 0;
        if (v >= 0) {
            const disc = this.radius2 - (Vector.dot(eo, eo) - v * v);
            if (disc >= 0)
                dist = v - sqrt(disc);
        }
        return dist === 0 ? null : { thing: this, ray, dist };
    }
}

class Plane {
    constructor(norm, offset, surface) {
        this.norm = norm;
        this.offset = offset;
        this.surface = surface;
    }
    normal(_) {
        return this.norm;
    }
    intersect(ray) {
        const { norm, offset } = this;
        const denom = Vector.dot(norm, ray.dir);
        return denom > 0 ? null : {
            ray,
            thing: this,
            dist: (Vector.dot(norm, ray.start) + offset) / (-denom)
        };
    }
}

const Surfaces = {
    shiny: {
        diffuse: (_) => Color.white,
        specular: (_) => Color.grey,
        reflect: (_) => 0.7,
        roughness: 250
    },
    checkerboard: {
        diffuse: ({ x, z }) => (floor(z) + floor(x)) % 2 !== 0 ? Color.white : Color.black,
        specular: (_) => Color.white,
        reflect: ({ x, z }) => (floor(z) + floor(x)) % 2 !== 0 ? 0.1 : 0.7,
        roughness: 150
    }
};

class RayTracer {
    constructor() {
        this.maxDepth = 5;
    }
    intersections(ray, scene) {
        let closest = +Infinity;
        let closestInter = null;
        for (const thing of scene.things) {
            const inter = thing.intersect(ray);
            if (inter != null && inter.dist < closest) {
                closestInter = inter;
                closest = inter.dist;
            }
        }
        return closestInter;
    }
    testRay(ray, scene) {
        return this.intersections(ray, scene)?.dist;
    }
    traceRay(ray, scene, depth) {
        const isect = this.intersections(ray, scene);
        return isect == null ? Color.background : this.shade(isect, scene, depth);
    }
    shade({ thing, dist, ray: { start, dir } }, scene, depth) {
        const pos = Vector.plus(Vector.times(dist, dir), start);
        const normal = thing.normal(pos);
        const reflectDir = Vector.minus(dir, Vector.times(2, Vector.times(Vector.dot(normal, dir), normal)));
        return Color.plus(
            Color.plus(Color.background, this.getNaturalColor(thing, pos, normal, reflectDir, scene)),
            (depth >= this.maxDepth) ? Color.grey : this.getReflectionColor(thing, pos, normal, reflectDir, scene, depth)
        );
    }
    getReflectionColor({ surface }, pos, _, rd, scene, depth) {
        return Color.scale(surface.reflect(pos), this.traceRay({ start: pos, dir: rd }, scene, depth + 1));
    }
    getNaturalColor({ surface }, pos, norm, rd, scene) {
        return scene.lights.reduce(
            (col, light) => {
                const ldis = Vector.minus(light.pos, pos);
                const livec = Vector.norm(ldis);
                const neatIsect = this.testRay({ start: pos, dir: livec }, scene);
                if (neatIsect != null && neatIsect <= Vector.mag(ldis))
                    return col;
                const illum = Vector.dot(livec, norm);
                const lcolor = illum > 0 ? Color.scale(illum, light.color) : Color.defaultColor;
                const specular = Vector.dot(livec, Vector.norm(rd));
                const scolor = specular > 0 ?
                    Color.scale(Math.pow(specular, surface.roughness), light.color) :
                    Color.defaultColor;
                return Color.plus(col, Color.plus(Color.times(surface.diffuse(pos), lcolor), Color.times(surface.specular(pos), scolor)));
            },
            Color.defaultColor
        );
    }
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
                    this.traceRay({ start: camera.pos, dir: getPoint(x, y, camera) }, scene, 0)
                );
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}

const light = (pos, color) => ({ pos, color });
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
