window.addEventListener('DOMContentLoaded', () => {
    // 1. WebGL Dynamic Volatility Gradient
    const canvasContainer = document.getElementById('bg-canvas');
    if (!canvasContainer) return;

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

    function animate() {
        requestAnimationFrame(animate);
        time += 0.012;
        let positions = wireframe.geometry.attributes.position;
        let colors = wireframe.geometry.attributes.color;
        
        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i);
            let z = positions.getZ(i);
            
            // Stochastic Surface Deformation
            let y = Math.sin(x * 0.008 + time) * Math.cos(z * 0.008 + time) * 85;
            positions.setY(i, y);
            
            // Cyan to Magenta to FF0000 Gradient (Yellow Excised)
            let hue = 0.75 + (y / 350); 
            colorObj.setHSL(hue, 1.0, 0.5);
            colors.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
        }
        positions.needsUpdate = true;
        colors.needsUpdate = true;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 2. Kinetic Mathematics Rain
    const rainContainer = document.getElementById('math-rain');
    if (!rainContainer) return;
    
    const mathSymbols = ['Σ','Π','∫','√','∞','∂','∇','Δ','Ω','d','dt','dW_t','H','μ','σ'];
    
    function createMathCharacter() {
        const char = document.createElement('div');
        char.innerText = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
        char.style.position = 'absolute';
        char.style.color = '#FF0000';
        char.style.fontFamily = 'monospace';
        char.style.left = Math.random() * 100 + 'vw';
        char.style.opacity = Math.random() * 0.4 + 0.1;
        let animDuration = Math.random() * 5 + 4;
        char.style.transition = 'transform ' + animDuration + 's linear';
        char.style.transform = 'translateY(-50px)';
        char.style.fontSize = Math.random() * 1.2 + 1 + 'rem';
        rainContainer.appendChild(char);
        
        setTimeout(() => { char.style.transform = 'translateY(110vh)'; }, 50);
        setTimeout(() => { char.remove(); }, animDuration * 1000 + 100);
    }
    setInterval(createMathCharacter, 120);
});