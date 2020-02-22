{
	// Code never lies, comments sometimes do.
	const Human = class {
		constructor(size, gravity, x, y, struct) {
			this.x = x;
			this.y = y;
			this.points = [];
			this.constraints = [];
			this.angles = [];
			this.shapes = [];
			// Points
			for (const point of struct.points) {
				this.points.push(
					new Human.Point(canvas.width * x, canvas.height * y, point, size, gravity)
				);
			}
			// constraints and shapes
			for (const constraint of struct.constraints) {
				const p0 = this.points[constraint.p0];
				const p1 = this.points[constraint.p1];
				this.constraints.push(new Human.Constraint(p0, p1, constraint));
				if (constraint.svg) {
					this.shapes.push(
						new Human.Shape(p0, p1, constraint, struct.svg[constraint.svg], size)
					);
				}
			}
			// angle constraints
			for (const angle of struct.angles) {
				this.angles.push(
					new Human.Angle(
						this.points[angle.p0],
						this.points[angle.p1],
						this.points[angle.p2],
						angle
					)
				);
			}
		}
		anim() {
			for (const point of this.points) point.integrate();
			for (let i = 0; i < 5; ++i) {
				for (const angle of this.angles) angle.update();
				for (const constraint of this.constraints) constraint.update();
			}
			
			for (const point of this.points) point.collide(ball);
		}
		draw() {
			for (const shape of this.shapes) shape.draw();
		}
	};
	// Points
	Human.Point = class {
		constructor(x, y, p, s, g) {
			this.x = x + p.x * s;
			this.y = y + p.y * s;
			this.px = this.x;
			this.py = this.y;
			this.vx = 0.0;
			this.vy = 0.0;
			this.m = p.m || 1.0;
			this.g = g;
		}
		join(p1, distance, force) {
			const dx = p1.x - this.x;
			const dy = p1.y - this.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const tw = this.m + p1.m;
			const r1 = p1.m / tw;
			const r0 = this.m / tw;
			const dz = (distance - dist) * force;
			const sx = dx / dist * dz;
			const sy = dy / dist * dz;
			p1.x += sx * r0;
			p1.y += sy * r0;
			this.x -= sx * r1;
			this.y -= sy * r1;
		}
		dist(p1) {
			const dx = this.x - p1.x;
			const dy = this.y - p1.y;
			return Math.sqrt(dx * dx + dy * dy);
		}
		integrate() {
			// verlet integration
			this.vx = this.x - this.px;
			this.vy = this.y - this.py;
			this.px = this.x;
			this.py = this.y;
			this.x += this.vx;
			this.y += this.vy + this.g;
		}
		collide(ball) {
			// collision with ball
			const dx = this.x - ball.x;
			const dy = this.y - ball.y;
			const sd = dx * dx + dy * dy;
			if (sd < ball.radius * ball.radius) {
				const d = Math.sqrt(sd);
				const dz = (ball.radius - d) * 0.5;
				this.x += dx / d * dz;
				this.y += dy / d * dz;
			}
		}
	};
	// Shapes
	Human.Shape = class {
		constructor(p0, p1, shape, src, size) {
			this.p0 = p0;
			this.p1 = p1;
			this.width = shape.w * size;
			this.height = shape.h * size;
			this.shape = canvas.createImage(
				shape.svg,
				"data:image/svg+xml;base64," + window.btoa(src)
			);
			this.offset = shape.offset;
		}
		draw() {
			canvas.drawImage(
				this.shape,
				this.p0.x,
				this.p0.y,
				this.height + this.width * this.offset,
				this.width,
				-this.height * this.offset,
				-this.width * 0.5,
				Math.atan2(this.p1.y - this.p0.y, this.p1.x - this.p0.x)
			);
		}
	};
	// Constraints
	Human.Constraint = class {
		constructor(p0, p1, constraint) {
			this.p0 = p0;
			this.p1 = p1;
			this.distance = p0.dist(p1);
			this.force = constraint.force || 1.0;
		}
		update() {
			this.p0.join(this.p1, this.distance, this.force);
		}
	};
	// Angles constraints
	Human.Angle = class {
		constructor(p0, p1, p2, constraint) {
			this.p0 = p0;
			this.p1 = p1;
			this.p2 = p2;
			this.len1 = p0.dist(p1);
			this.len2 = p1.dist(p2);
			this.angle = constraint.angle;
			this.range = constraint.range;
			this.force = constraint.force || 0.1;
			let m = p0.m + p1.m;
			this.m1 = p0.m / m;
			this.m2 = p1.m / m;
			m = p1.m + p2.m;
			this.m3 = p1.m / m;
			this.m4 = p2.m / m;
		}
		a12(p0, p1, p2) {
			const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
			const b = Math.atan2(p2.y - p1.y, p2.x - p1.x);
			const c = this.angle - (b - a);
			const d = c > Math.PI ? c - 2 * Math.PI : c < -Math.PI ? c + 2 * Math.PI : c;
			const e = Math.abs(d) > this.range
				? (-Math.sign(d) * this.range + d) * this.force
				: 0;
			const cos = Math.cos(a - e);
			const sin = Math.sin(a - e);
			const x1 = p0.x + (p1.x - p0.x) * this.m2;
			const y1 = p0.y + (p1.y - p0.y) * this.m2;
			p0.x = x1 - cos * this.len1 * this.m2;
			p0.y = y1 - sin * this.len1 * this.m2;
			p1.x = x1 + cos * this.len1 * this.m1;
			p1.y = y1 + sin * this.len1 * this.m1;
			return e;
		}
		a23(e, p1, p2) {
			const a = Math.atan2(p1.y - p2.y, p1.x - p2.x) + e;
			const cos = Math.cos(a);
			const sin = Math.sin(a);
			const x1 = p2.x + (p1.x - p2.x) * this.m3;
			const y1 = p2.y + (p1.y - p2.y) * this.m3;
			p2.x = x1 - cos * this.len2 * this.m3;
			p2.y = y1 - sin * this.len2 * this.m3;
			p1.x = x1 + cos * this.len2 * this.m4;
			p1.y = y1 + sin * this.len2 * this.m4;
		}
		update() {
			// resolve angular constraints
			const e = this.a12(this.p0, this.p1, this.p2);
			this.a23(e, this.p1, this.p2);
		}
	};
	const canvas = {
		// @greggman thanks for webglfundamentals!
		// https://webglfundamentals.org/webgl/lessons/webgl-2d-drawimage.html
		init() {
			// create webGL canvas context
			this.elem = document.createElement("canvas");
			document.body.appendChild(this.elem);
			const options = {
				alpha: false,
				stencil: false,
				antialias: false,
				depth: false
			};
			let gl = this.elem.getContext("webgl", options);
			if (!gl) gl = this.elem.getContext("experimental-webgl", options);
			if (!gl) return false;
			this.gl = gl;
			// set shaders
			this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(
				this.vertexShader,
				`
				precision highp float;
        attribute vec2 aPosition;
        uniform mat3 uMatrix;
        varying vec2 vTexcoord;
        void main() {
					gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);
					vTexcoord = aPosition;
        }
      `
			);
			gl.compileShader(this.vertexShader);
			this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(
				this.fragmentShader,
				`
        precision highp float;
        varying vec2 vTexcoord;
        uniform sampler2D texture;
        void main() {
           gl_FragColor = texture2D(texture, vTexcoord);
        }
      `
			);
			// compile shaders
			gl.compileShader(this.fragmentShader);
			this.program = gl.createProgram();
			gl.attachShader(this.program, this.vertexShader);
			gl.attachShader(this.program, this.fragmentShader);
			gl.linkProgram(this.program);
			// init attributes, uniforms and buffers
			this.position = gl.getAttribLocation(this.program, "aPosition");
			gl.enableVertexAttribArray(this.position);
			this.umatrix = gl.getUniformLocation(this.program, "uMatrix");
			this.positionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]),
				gl.STATIC_DRAW
			);
			gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 0, 0);
			// position/orientation/scaling 3x3 matrix
			this.matrix = new Float32Array(9);
			this.matrix[8] = 1;
			// textures
			this.textures = {};
			this.lastTexture = "";
			this.frame = 0;
			// source over blending
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);
			gl.disable(gl.DEPTH_TEST);
			gl.useProgram(this.program);
			// resize event
			this.resize();
			window.addEventListener("resize", () => this.resize(), false);
			return gl;
		},
		Texture: class {
			constructor(id, src, loaded) {
				this.id = id;
				this.loaded = loaded;
				this.width = loaded ? src.width : 0;
				this.height = loaded ? src.height : 0;
				this.texture = loaded ? this.createTexture(src) : null;
				if (!loaded) {
					const source = new Image();
					source.onload = e => {
						this.loaded = true;
						this.width = source.width;
						this.height = source.height;
						this.texture = this.createTexture(source);
					};
					source.src = src;
				}
			}
			createTexture(source) {
				// create gpu texture
				const texture = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_2D, texture);
				// assume non power of 2
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				// upload texture to gpu
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
				return texture;
			}
		},
		createImage(id, src, loaded) {
			// create texture from src
			let tex = this.textures[id];
			if (tex) return tex;
			tex = this.textures[id] = new this.Texture(id, src, loaded);
			return tex;
		},
		drawImage(
			img,
			x,
			y,
			width = img.width,
			height = img.height,
			offsetX = 0,
			offsetY = 0,
			angle = 0
		) {
			if (!img.loaded) return;
			// update 4x4 matrix
			const m = this.matrix;
			const sx = 2 / this.width;
			const sy = -2 / this.height;
			if (angle) {
				const c = Math.cos(angle);
				const s = Math.sin(angle);
				m[0] = c * sx * width;
				m[1] = s * sy * width;
				m[3] = -s * sx * height;
				m[4] = c * sy * height;
				m[6] = (c * offsetX - s * offsetY + x) * sx - 1;
				m[7] = (s * offsetX + c * offsetY + y) * sy + 1;
			} else {
				m[0] = sx * width;
				m[1] = 0;
				m[3] = 0;
				m[4] = sy * height;
				m[6] = (offsetX + x) * sx - 1;
				m[7] = (offsetY + y) * sy + 1;
			}
			this.gl.uniformMatrix3fv(this.umatrix, false, m);
			// bind texture
			if (img.id !== this.lastTexture) {
				this.lastTexture = img.id;
				this.gl.bindTexture(this.gl.TEXTURE_2D, img.texture);
			}
			//draw the quad
			this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
		},
		resize() {
			this.width = this.elem.width = this.elem.offsetWidth;
			this.height = this.elem.height = this.elem.offsetHeight;
			// set viewport
			this.gl.viewport(
				0,
				0,
				this.gl.drawingBufferWidth,
				this.gl.drawingBufferHeight
			);
		}
	};
	const pointer = {
		init(canvas) {
			this.x = canvas.width * 0.5;
			this.y = canvas.height * 0.75;
			this.ex = this.x;
			this.ey = canvas.height * 2;
			this.isDown = false;
			window.addEventListener("mousemove", e => this.move(e), false);
			canvas.elem.addEventListener("touchmove", e => this.move(e), false);
			window.addEventListener("mousedown", e => (this.isDown = true), false);
			window.addEventListener("mouseup", e => (this.isDown = false), false);
		},
		move(e) {
			let touchMode = e.targetTouches,
				pointer;
			if (touchMode) {
				e.preventDefault();
				pointer = touchMode[0];
			} else pointer = e;
			this.x = pointer.clientX;
			this.y = pointer.clientY;
		},
		ease(n) {
			this.ex += (this.x - this.ex) * n;
			this.ey += (this.y - this.ey) * n;
		}
	};
	// init canvas (webGL)
	const gl = canvas.init();
	pointer.init(canvas);
	// main loop
	const run = () => {
		requestAnimationFrame(run);
		// clear screen
		gl.clearColor(0.92, 0.68, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		// ease pointer
		pointer.ease(0.33);
		// animate humans
		for (const human of humans) {
			human.anim();
			hook.x = human.x * canvas.width;
			hook.y = human.y * canvas.height;
			human.points[16].join(hook, 0, 1);
			if (pointer.isDown) human.points[16].join(ball, ball.radius, 1);
		}
		// webgl rendering
		if (canvas.frame++ > 10) {
			// draw ball
			ball.x = pointer.ex;
			ball.y = pointer.ey;
			canvas.drawImage(ball, ball.x - ball.radius, ball.y - ball.radius);
			for (const human of humans) human.draw();
		}
	};
	// create ball
	const createBall = () => {
		const ball = document.createElement("canvas");
		const radius = 0.3 * Math.min(canvas.width, canvas.height);
		ball.width = ball.height = 2 * radius;
		const ctx = ball.getContext("2d");
		ctx.beginPath();
		ctx.arc(radius, radius, radius * 0.99, 0, 2 * Math.PI);
		ctx.fillStyle = "#222";
		ctx.fill();
		const shape = canvas.createImage("ball", ball, true);
		shape.radius = radius;
		shape.m = 1000;
		return shape;
	};
	// create humans
	const createHumans = () => {
		const humans = [];
		const s = canvas.height * 0.075;
		const n = 0.2 * canvas.width / s;
		for (let i = 0; i < n; ++i) {
			humans.push(new Human(s, 0.2, i / n, 0, human));
		}
		return humans;
	};
	// human ragdoll definition
	const human = {
		points: [
			{ x: 0, y: 0 },
			{ x: 0, y: -2.8 },
			{ x: 0, y: -4 },
			{ x: -1.1, y: -2.2 },
			{ x: 1.1, y: -2.2 },
			{ x: -0.5, y: 1.2 },
			{ x: 0.5, y: 1.2 },
			{ x: 0, y: 1.5 },
			{ x: -0.5, y: 3.5 },
			{ x: 0.5, y: 3.5 },
			{ x: -0.5, y: 6.5 },
			{ x: 0.5, y: 6.5 },
			{ x: -0.5, y: 7 },
			{ x: 0.5, y: 7 },
			{ x: 3, y: -2.2 },
			{ x: -3, y: -2.2 },
			{ x: 4.7, y: -2.2 },
			{ x: -4.7, y: -2.2 }
		],
		constraints: [
			{ p0: 1, p1: 4 },
			{ p0: 0, p1: 1, h: 3, w: 3.2, svg: "tors", offset: 0.35 },
			{ p0: 1, p1: 3 },
			{ p0: 0, p1: 3 },
			{ p0: 0, p1: 4 },
			{ p0: 3, p1: 4 },
			{ p0: 0, p1: 6 },
			{ p0: 7, p1: 0, h: 2, w: 2.8, svg: "stomach", offset: 0.1 },
			{ p0: 0, p1: 5 },
			{ p0: 5, p1: 6 },
			{ p0: 5, p1: 7 },
			{ p0: 6, p1: 7 },
			{ p0: 5, p1: 8, h: 3, w: 1.3, svg: "leg1", offset: 0.15 },
			{ p0: 6, p1: 9, h: 3, w: 1.3, svg: "leg1", offset: 0.15 },
			{ p0: 8, p1: 10, h: 4, w: 1.2, svg: "leg2", offset: 0.15 },
			{ p0: 9, p1: 11, h: 4, w: 1.2, svg: "leg2", offset: 0.15 },
			{ p0: 4, p1: 14, h: 2.4, w: 1, svg: "arm1", offset: 0.15 },
			{ p0: 3, p1: 15, h: 2.4, w: 1, svg: "arm1", offset: 0.15 },
			{ p0: 14, p1: 16, h: 2.5, w: 0.8, svg: "arm2", offset: 0.1 },
			{ p0: 15, p1: 17, h: 2.5, w: 0.8, svg: "arm2", offset: 0.1 },
			{ p0: 10, p1: 12, h: 0.5, w: 2.5, svg: "foot", offset: 0.3 },
			{ p0: 11, p1: 13, h: 0.5, w: 2.5, svg: "foot", offset: 0.3 },
			{ p0: 1, p1: 2, h: 2, w: 1.8, svg: "head", offset: 0.15 }
		],
		angles: [
			{
				p0: 2,
				p1: 1,
				p2: 0,
				angle: 0,
				range: 1
			},
			{
				p0: 3,
				p1: 15,
				p2: 17,
				angle: -Math.PI / 2,
				range: Math.PI / 3
			},
			{
				p0: 4,
				p1: 14,
				p2: 16,
				angle: -Math.PI / 2,
				range: Math.PI / 3
			},
			{
				p0: 1,
				p1: 0,
				p2: 7,
				angle: 0,
				range: 0.3
			},
			{
				p0: 0,
				p1: 5,
				p2: 8,
				angle: 0,
				range: Math.PI / 3
			},
			{
				p0: 0,
				p1: 6,
				p2: 9,
				angle: 0,
				range: Math.PI / 3
			},
			{
				p0: 5,
				p1: 8,
				p2: 10,
				angle: Math.PI / 3,
				range: Math.PI / 4
			},
			{
				p0: 6,
				p1: 9,
				p2: 11,
				angle: Math.PI / 3,
				range: Math.PI / 4
			},
			{
				p0: 8,
				p1: 10,
				p2: 12,
				angle: 0,
				range: 0.5
			},
			{
				p0: 9,
				p1: 11,
				p2: 13,
				angle: 0,
				range: 0.5
			}
		],
		svg: {
			// human shapes credits @roxik http://roxik.com/v/5/
			head: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="100" height="70">
				<g transform="scale(2 2) rotate(90) translate(17 -7)">
				<path style="fill:#fff" d="M-9.9,-38.2Q-6.9 -40.7 -4.35 -39Q-2.3 -40.9 1.85 -41.8Q6.6 -42.85 10.05 -41.25Q12.3 -40.2 14.5 -38Q17 -37.2 18.05 -38.75Q17.85 -36.85 16.6 -35.5L18.4 -32.35Q17.6 -32.5 15.6 -34.25Q15.6 -32.6 17.9 -30L16.15 -30.75Q16.55 -27.2 15.3 -23.35Q14.75 -21.65 16.3 -19.3Q18.05 -16.7 18.05 -16L16.45 -15.1Q15.35 -14.65 14.4 -15.3Q13.65 -14.35 13.3 -10.95Q13 -8.1 11.4 -7.5Q10.25 -7 6.4 -7.5L6.8 -0.85Q7 2.05 5.3 4.05Q3.7 5.9 1.25 6.2Q-1.3 6.55 -3.35 5Q-5.65 3.3 -6.45 -0.25Q-5.5 -2.6 -5.85 -6.75L-6.7 -9.25L-8.55 -6.6Q-9.15 -7.85 -9.55 -10.55Q-9.85 -12.5 -9.95 -12.25Q-10.35 -10.75 -10.9 -10.3Q-10.3 -14.5 -10.95 -17.5L-12.5 -21.6Q-15 -26.45 -14.2 -30.1Q-13.05 -35.55 -9.9 -38.2" />
				</g>
				</svg>
			`,
			tors: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="100" height="100">
				<g transform="rotate(90) translate(50 -22) scale(1.4 1.15)">
				<path style="fill:#000" d="M30.8,-58.3Q34 -55.05 34 -50.5Q34 -47.2 29.5 -39.85Q25 -32.5 25 -31.5Q25 -28.05 23.5 -16.75Q22 -5.4 22 -3.5Q22 5.2 15.85 11.35Q9.7 17.5 1 17.5Q-7.7 17.5 -13.85 11.35Q-20 5.2 -20 -3.5Q-20 -5.4 -21.5 -16.75Q-23 -28.05 -23 -31.5Q-23 -32.5 -28.5 -39.8Q-34 -47.05 -34 -50.5Q-34 -55.05 -30.8 -58.3Q-27.55 -61.5 -23 -61.5Q-20.25 -61.5 -11.85 -64.5Q-3.45 -67.5 0 -67.5Q3.5 -67.5 12 -64.5Q20.5 -61.5 23 -61.5Q27.6 -61.5 30.8 -58.3" />
				</g>
				</svg>
			`,
			stomach: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg"	width="100" height="100">
				<g transform="rotate(90) translate(50 -65) scale(1.5 1.5)">
				<path style="fill:#000" d="M15.05,-13.35Q21.2 -7.2 21.2 1.5Q21.2 3.3 21.9 7.05L26.15 16.95Q27.6 21.3 25.45 20.8L24.5 20.55Q25.2 24.95 25.2 27Q25.2 33.1 21.45 37.25Q17.6 41.5 11.7 41.5Q3.65 41.5 -0.3 33.4Q-4.35 41.5 -12.3 41.5Q-18.15 41.5 -21.55 37.25Q-24.8 33.25 -24.8 27Q-24.8 24.55 -24.15 20.4L-25.5 20.8Q-27.75 21.3 -26 16.45L-21.3 5.65Q-20.8 2.65 -20.8 1.5Q-20.8 -7.2 -14.65 -13.35Q-8.5 -19.5 0.2 -19.5Q8.85 -19.5 15.05 -13.35" />
				</g>
				</svg>
			`,
			leg1: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="75" height="40">
				<g transform="rotate(90) translate(20 -61) scale(1.5 1)">
				<path style="fill:#000" d="M10.1,-6.8Q12.9 -2.6 12.55 2.95L12.25 48.65Q11.9 53.8 8.15 57.25Q4.35 60.65 -0.65 60.3Q-5.65 59.95 -8.95 56.05Q-12.2 52.1 -11.85 46.95L-12.55 1.15Q-12.2 -4.45 -8.6 -8.25Q-4.75 -12.35 0.95 -11.95Q6.9 -11.55 10.1 -6.8" />
				</g>
				</svg>
				`,
			leg2: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg"	width="80" height="40">
				<g transform="rotate(-90) translate(-20 15) scale(1.5 1)">
				<path style="fill:#000" d="M-9.25,-10.2Q-5.45 -14 -0.05 -14Q5.25 -14 8.65 -10.2Q11.95 -6.5 11.95 -1Q8.3 36.25 11.5 44.5Q14.35 51.85 12.95 52.7Q12.65 52.9 11.7 52.7Q10.95 52.55 10.95 52.95Q10 57.85 5.95 61.2Q2.6 64 -0.05 64Q-7.9 64 -11.05 52.95Q-12.3 53.55 -13 52.75Q-14.3 51.15 -11.35 44.25Q-7.95 36.35 -13.05 -1Q-13.05 -6.4 -9.25 -10.2" />
				</g>
				</svg>
			`,
			foot: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg"	width="100" height="100">
				<g transform="rotate(-90) translate(-50 40) scale(1.76 3)">
				<path style="fill:#fff" d="M8.25,-6.3Q11.45 -3.05 11.45 1.5L12.75 6.1Q14.1 7.8 18.85 9.75Q23.1 11.5 24.45 11.5Q26.15 11.5 26.55 14.5Q27 17.5 24.45 17.5L9.45 17.5Q8.1 17.5 5.5 15.75Q3.4 14.3 3.45 14.5Q3.6 15.05 3.25 16.15Q2.9 17.3 2.45 17.5L-9.55 17.5L-10.55 1.5Q-10.55 -3.05 -7.35 -6.3Q-4.1 -9.5 0.45 -9.5Q5.05 -9.5 8.25 -6.3" />
				</g>
				</svg>
			`,
			arm1: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg"	width="110" height="44">
				<g transform="matrix(2, 0, 0, 2, 21, 21.5)">
				<path style="fill:#000" d="M33.45,-6.4L35.65 -6.4Q39.7 -6.4 42.15 -4.3Q44.4 -2.4 44.5 0.3Q44.55 3 42.35 4.85Q39.95 6.95 35.6 6.95L34.6 7Q34.85 8.9 34.25 9.75Q33.2 8.9 29.35 8.55Q27.85 10.25 20.4 8.5L7.5 9.75L2.2 10.55Q-3.7 11.4 -7.2 8.25Q-10.3 5.45 -10.5 0.8Q-10.7 -3.75 -8 -7.1Q-5.05 -10.75 0 -10.75Q1.35 -10.75 4.05 -9.8Q7.1 -8.75 8.3 -8.6L21.65 -8L24.85 -8.9Q26.05 -9 28.6 -7.9Q32.8 -8 34.1 -8.6Q34.4 -7.45 33.45 -6.4" />
				</g>
				</svg>
			`,
			arm2: `
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg"	width="128" height="36">
				<g transform="matrix(2, 0, 0, 2, 15.2, 18.5)">
				<path style="fill:#fff" d="M38.65,-7.65L46.2 -9.25Q46.65 -7.6 44.7 -6.45L41.6 -5.15L48.95 -5.55Q54 -5.85 54.05 -5Q54.1 -3.7 45.35 -1.95L51.6 -2.2Q56.4 -2.25 56.4 -1.25Q56.4 -0.05 52 0.7L45.45 1.85L50.8 2.4Q54.35 2.7 54.3 3.5Q54.25 4.3 49.95 4.65L44.35 4.8Q46.75 5.05 48.6 6.1Q50.45 7.1 49.05 7.4L42.3 7.8Q36.35 7.85 33.4 5.9Q31.1 4.65 15.2 6.8Q-0.55 8.9 -4.3 6.7Q-8.6 4.15 -7.3 -0.75Q-6 -5.75 -0.75 -6.25Q2.35 -6.55 15.7 -4.45L31.2 -3.95Q33.4 -6.4 38.65 -7.65" />
				</g>
				</svg>
			`
		}
	};
	// LET THERE BE LIGHT!
	const humans = createHumans();
	const ball = createBall();
	const hook = { x: 0, y: 0, m: 100 };
	requestAnimationFrame(run);
}