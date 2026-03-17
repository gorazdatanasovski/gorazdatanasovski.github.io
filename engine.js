window.addEventListener('DOMContentLoaded', () => {
    // 1. WebGL Volatility Canvas (Absolute Background)
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'bg-canvas';
    canvasContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -2; pointer-events: none; background: #02040a;';
    document.body.prepend(canvasContainer);

    // 2. High-End Mathematical Derivation Canvas (Middle Layer)
    const mathCanvas = document.createElement('canvas');
    mathCanvas.id = 'math-derivation-canvas';
    mathCanvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; mix-blend-mode: screen;';
    document.body.prepend(mathCanvas);

    // 3. Institutional Affiliation Panel (USD Logo)
    const usdPanel = document.createElement('a');
    usdPanel.href = 'https://www.usd.edu/';
    usdPanel.target = '_blank';
    usdPanel.className = 'usd-sponsor-panel';
    usdPanel.innerHTML = '<p class="usd-text-sub">Institutional Affiliation</p><p class="usd-text-main">University of<br>South Dakota</p>';
    document.body.appendChild(usdPanel);

    // ==========================================
    // PART A: 3D VOLATILITY SURFACE (Cyan -> Magenta -> Red)
    // ==========================================
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 180, 400);
    camera.lookAt(0, -50, 0);
    
    let renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasContainer.appendChild(renderer.domElement);

    let geometry = new THREE.PlaneGeometry(1600, 1600, 75, 75);
    geometry.rotateX(-Math.PI / 2);
    
    const count = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    
    let material = new THREE.MeshBasicMaterial({vertexColors: true, wireframe: true, transparent: true, opacity: 0.35});
    let wireframe = new THREE.Mesh(geometry, material);
    scene.add(wireframe);

    let time = 0;
    const colorObj = new THREE.Color();

    function animateWebGL() {
        time += 0.012;
        let positions = wireframe.geometry.attributes.position;
        let colors = wireframe.geometry.attributes.color;
        
        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i);
            let z = positions.getZ(i);
            
            // Stochastic Wave Deformation
            let y = Math.sin(x * 0.008 + time) * Math.cos(z * 0.008 + time) * 85;
            positions.setY(i, y);
            
            // Gradient mapping
            let hue = 0.75 + (y / 350); 
            colorObj.setHSL(hue, 1.0, 0.5);
            colors.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
        }
        positions.needsUpdate = true;
        colors.needsUpdate = true;
        renderer.render(scene, camera);
    }

    // ==========================================
    // PART B: ADVANCED MATHEMATICAL DERIVATION ENGINE
    // ==========================================
    const ctx = mathCanvas.getContext('2d');
    let width = mathCanvas.width = window.innerWidth;
    let height = mathCanvas.height = window.innerHeight;

    // Complex LaTeX-style symbolic strings (No normal sentences)
    const rigorousFormulations = [
        "∭_V (∇·F)dV = ∯_S (F·n)dS",
        "iℏ(∂Ψ/∂t) = [-ℏ²/2m ∇² + V]Ψ",
        "dS_t = μS_tdt + σS_tdW_t",
        "dσ_t = κ(θ - σ_t)dt + ξ√σ_t dW_t",
        "R_{μν} - ½Rg_{μν} + Λg_{μν} = (8πG/c⁴)T_{μν}",
        "∇×E = -∂B/∂t",
        "lim_{x→∞} (1 + 1/x)^x = e",
        "P(A|B) = P(B|A)P(A) / P(B)",
        "∑_{n=1}^{∞} 1/n^s = ∏_p (1 - p^{-s})^{-1}",
        "∫_0^∞ e^{-x²} dx = √(π)/2",
        "H(p, q) = ½ p^T M^{-1} p + V(q)",
        "∂V/∂t + ½σ²S²(∂²V/∂S²) + rS(∂V/∂S) = rV"
    ];

    const morphSymbols = ['α','β','γ','λ','θ','μ','σ','Δ','Ω','∇','∫','∂','∑','∏','∞'];

    class MathDerivation {
        constructor() {
            this.reset(true);
        }
        
        reset(isInitial = false) {
            this.equation = rigorousFormulations[Math.floor(Math.random() * rigorousFormulations.length)];
            
            // Placement Logic: Force to edges (Clear Center)
            const marginX = width * 0.25;
            const marginY = height * 0.25;
            const edge = Math.floor(Math.random() * 4); // 0:Top, 1:Bottom, 2:Left, 3:Right
            
            if (edge === 0) { 
                this.x = Math.random() * width; this.y = Math.random() * marginY;
            } else if (edge === 1) { 
                this.x = Math.random() * width; this.y = height - Math.random() * marginY;
            } else if (edge === 2) { 
                this.x = Math.random() * marginX; this.y = Math.random() * height;
            } else { 
                this.x = width - Math.random() * marginX; this.y = Math.random() * height;
            }

            // Subtle continuous drift
            this.vx = (Math.random() - 0.5) * 0.3; 
            this.vy = (Math.random() - 0.5) * 0.3; 
            
            this.progress = 0;
            this.typingSpeed = Math.random() * 0.3 + 0.1; 
            this.state = isInitial ? 'suspension' : 'formulating'; 
            if (isInitial) this.progress = this.equation.length;

            this.holdTime = Math.random() * 400 + 200;
            this.opacity = isInitial ? (Math.random() * 0.3 + 0.2) : 0;
            this.maxOpacity = Math.random() * 0.4 + 0.2; 
            this.fontSize = Math.random() * 12 + 18; 
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.state === 'formulating') {
                this.opacity = Math.min(this.opacity + 0.01, this.maxOpacity);
                this.progress += this.typingSpeed;
                if (this.progress >= this.equation.length) {
                    this.progress = this.equation.length;
                    this.state = 'suspension';
                }
            } else if (this.state === 'suspension') {
                this.holdTime--;
                
                // Symbolic morphing anomaly
                if (Math.random() < 0.008) {
                    let chars = this.equation.split('');
                    let idx = Math.floor(Math.random() * chars.length);
                    if (chars[idx].match(/[^ \(\)\=\+\-]/)) {
                        chars[idx] = morphSymbols[Math.floor(Math.random() * morphSymbols.length)];
                    }
                    this.equation = chars.join('');
                }

                if (this.holdTime <= 0) {
                    this.state = Math.random() > 0.4 ? 'deconstructing' : 'decaying';
                }
            } else if (this.state === 'deconstructing') {
                this.progress -= this.typingSpeed * 1.5; // Partial Erase
                if (this.progress <= 0) this.reset();
            } else if (this.state === 'decaying') {
                this.opacity -= 0.005; // Fade Out
                if (this.opacity <= 0) this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            // High-end visible aesthetic: Bright slate with cyan glow
            ctx.fillStyle = `rgba(226, 232, 240, ${this.opacity})`;
            ctx.font = `italic ${this.fontSize}px "Cambria Math", "Times New Roman", serif`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(0, 229, 255, ${this.opacity * 0.8})`; 
            
            const visibleText = this.equation.substring(0, Math.floor(this.progress));
            ctx.fillText(visibleText, this.x, this.y);
            
            // Writing Cursor
            if (this.state === 'formulating' && Math.floor(Date.now() / 200) % 2 === 0) {
                const textWidth = ctx.measureText(visibleText).width;
                ctx.fillRect(this.x + textWidth + 2, this.y - this.fontSize * 0.8, 2, this.fontSize);
            }
            
            ctx.shadowBlur = 0; // Reset
        }
    }

    const derivations = Array.from({ length: 30 }, () => new MathDerivation());

    function renderMathEngine() {
        ctx.clearRect(0, 0, width, height);
        derivations.forEach(d => {
            d.update();
            d.draw(ctx);
        });
    }

    // ==========================================
    // MASTER RENDER LOOP
    // ==========================================
    function masterLoop() {
        animateWebGL();
        renderMathEngine();
        requestAnimationFrame(masterLoop);
    }
    masterLoop();

    // ==========================================
    // RESIZE MATRIX
    // ==========================================
    window.addEventListener('resize', () => {
        width = mathCanvas.width = window.innerWidth;
        height = mathCanvas.height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
});