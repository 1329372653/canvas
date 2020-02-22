// Inspired by https://www.airtightinteractive.com/2011/06/rutt-etra-izer/
"use strict";
{
	// webGL canvas
	const canvas = {
		init(options) {
			// set webGL context
			this.elem = document.querySelector("canvas");
			const gl = (this.gl =
				this.elem.getContext("webgl", options) ||
				this.elem.getContext("experimental-webgl", options));
			if (!gl) return false;
			// compile shaders
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(
				vertexShader,
				`
					precision highp float;
					const float FOV = 250.0;
					attribute vec3 aPosition, aColor;
					uniform vec2 uResolution;
					uniform vec4 uRotation;
					varying vec3 color;
					void main() {
						// 3D Rotations
						float tx, ty, tz;
						tx = uRotation.z * aPosition.x - uRotation.w * aPosition.z;
						tz = uRotation.w * aPosition.x + uRotation.z * aPosition.z;
						ty = uRotation.x * aPosition.y - uRotation.y * tz;
						tz = uRotation.y * aPosition.y + uRotation.x * tz;
						// 3D to 2D projection
						float s = FOV / (FOV - tz);
						float x = s > 0.0 ? tx * s : 0.0;
						float y = s > 0.0 ? ty * s : 0.0;
						gl_Position = vec4(
							( (uResolution.x * 0.5 + x) / uResolution.x * 2.0) - 1.0, 
							( (-uResolution.y * 0.5 -y) / uResolution.y * 2.0) + 1.0, 
							s > 0.0 ? 0.0 : 10.0,
							1.0
						);
						color = aColor;
					}
      	`
			);
			gl.compileShader(vertexShader);
			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(
				fragmentShader,
				`
					precision highp float;
					varying vec3 color;
					void main() {
						gl_FragColor = vec4(color.r, color.g, color.b, 1.0);
					}
				`
			);
			gl.compileShader(fragmentShader);
			const program = (this.program = gl.createProgram());
			gl.attachShader(this.program, vertexShader);
			gl.attachShader(this.program, fragmentShader);
			gl.linkProgram(this.program);
			gl.useProgram(this.program);
			// resolution
			this.uResolution = gl.getUniformLocation(this.program, "uResolution");
			gl.enableVertexAttribArray(this.uResolution);
			// canvas resize
			this.resize();
			window.addEventListener("resize", () => this.resize(), false);
			return gl;
		},
		buffer(attribute) {
			const buffer = {
				attribute: gl.getAttribLocation(canvas.program, attribute),
				buffer: gl.createBuffer(),
				load (data, usage, size) {
					gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
					gl.vertexAttribPointer(this.attribute, size, gl.FLOAT, false, 0, 0);
					gl.bufferData(gl.ARRAY_BUFFER, data, usage);
				}
			};
			gl.enableVertexAttribArray(buffer.attribute);
			return buffer;
		},
		resize() {
			this.width = this.elem.width = this.elem.offsetWidth;
			this.height = this.elem.height = this.elem.offsetHeight;
			this.gl.uniform2f(this.uResolution, this.width, this.height);
			this.gl.viewport(
				0,
				0,
				this.gl.drawingBufferWidth,
				this.gl.drawingBufferHeight
			);
		}
	};
	// init pointer
	const pointer = {
		init(canvas) {
			this.x = canvas.width * 0.5;
			this.y = canvas.height * 0.5;
			this.ex = this.x;
			this.ey = this.y * 2;
			["mousemove", "touchstart", "touchmove"].forEach((event, touch) => {
				document.addEventListener(
					event,
					e => {
						if (touch) {
							e.preventDefault();
							this.x = e.targetTouches[0].clientX;
							this.y = e.targetTouches[0].clientY;
						} else {
							this.x = e.clientX;
							this.y = e.clientY;
						}
					},
					false
				);
			});
		},
		ease(step) {
			this.ex += (this.x - this.ex) * step;
			this.ey += (this.y - this.ey) * step;
		}
	};
	// init webGL canvas
	const gl = canvas.init({
		alpha: false,
		stencil: false,
		antialias: true,
		depth: false
	});
	// additive blending "lighter"
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.BLEND);
	// init pointer
	pointer.init(canvas);
	// init image
	const img = new Image();
	img.addEventListener("load", e => load(img));
	img.src = document.getElementById("source").src;
	// rotation matrix
	const uRotation = gl.getUniformLocation(canvas.program, "uRotation");
	gl.enableVertexAttribArray(uRotation);
	// init colors and geometry
	let nVertices = 0;
	const load = img => {
		//////////////////////
		const step = 3;
		const depth = 75;
		//////////////////////
		const image = document.createElement("canvas");
		const width = (image.width = img.width);
		const height = (image.height = img.height);
		const ctx = image.getContext("2d");
		ctx.drawImage(img, 0, 0);
		const bitmap = ctx.getImageData(0, 0, width, height).data;
		const vertices = [];
		const colors = [];
		// buffers
		const position = canvas.buffer("aPosition");
		const color = canvas.buffer("aColor");
		// push vertex
		const push = (x, y) => {
			const p = (y * width + x) * 4;
			const r = bitmap[p + 0] / 256;
			const g = bitmap[p + 1] / 256;
			const b = bitmap[p + 2] / 256;
			colors.push(r);
			colors.push(g);
			colors.push(b);
			vertices.push(x - width * 0.5);
			vertices.push(y - height * 0.5);
			vertices.push(depth * (0.34 * r + 0.5 * g + 0.16 * b));
		};
		// init the line
		let d = 1;
		for (let y = 0; y < height; y += step) {
			if (d > 0) {
				for (let x = 0; x < width; x += step) push(x, y);
			} else {
				for (let x = width; x > 0; x -= step) push(x, y);
			}
			d = -d;
		}
		// load buffers to gpu
		nVertices = Math.floor(colors.length / 3);
		position.load(new Float32Array(vertices), gl.STATIC_DRAW, 3);
		color.load(new Float32Array(colors), gl.STATIC_DRAW, 3);
		// start animation loop
		requestAnimationFrame(run);
	};
	// main animation loop
	const run = () => {
		requestAnimationFrame(run);
		pointer.ease(0.05);
		// rotation
		const ry = (pointer.ex - canvas.width * 0.5) / (canvas.width * 0.33);
		const rx = (pointer.ey - canvas.height * 0.5) / (canvas.height * 0.33);
		gl.uniform4f(uRotation, Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry));
		// draw line strip
		gl.drawArrays(gl.LINE_STRIP, 0, nVertices);
	};
}