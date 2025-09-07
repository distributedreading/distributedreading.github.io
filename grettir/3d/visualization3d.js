// 3D Visualization for Grettir's Temper Management
let scene, camera, renderer, controls;
let instances = [];
let raycaster, mouse;
let hoveredInstance = null;
let selectedDimensions = {
    x: null,
    y: null,
    z: null,
    color: null
};

// Color schemes for different formula types
const formulaColors = {
    'no-reaction': 0x00CED1,
    'gefa sér ekki/fátt': 0x20B2AA,
    'lét sem sjá': 0x3CB371,
    'lét sem vita': 0x90EE90,
    'verða skapfátt': 0xFF6347,
    'X glotti að/við': 0xFFD700,
    'X glotti að/við og gaf sér ekki/fátt': 0xFFA500,
    'X varð reiður': 0xFF4500,
    'þykkja illa': 0xFF8C00
};

// Initialize the 3D scene
function init() {
    const container = document.getElementById('canvas-container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    scene.fog = new THREE.Fog(0xf5f5f5, 100, 300);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('3d-canvas'),
        antialias: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 20, 0xcccccc, 0xeeeeee);
    gridHelper.position.y = -25;
    scene.add(gridHelper);
    
    // Add axes
    createAxes();
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('mousemove', onMouseMove);
    
    // Start animation
    animate();
}

// Create coordinate axes
function createAxes() {
    const axesGroup = new THREE.Group();
    
    // X axis - red
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -25, -30),
        new THREE.Vector3(30, -25, -30)
    ]);
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const xAxis = new THREE.Line(xGeometry, xMaterial);
    axesGroup.add(xAxis);
    
    // Y axis - green
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -25, -30),
        new THREE.Vector3(-30, 25, -30)
    ]);
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    axesGroup.add(yAxis);
    
    // Z axis - blue
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -25, -30),
        new THREE.Vector3(-30, -25, 20)
    ]);
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    axesGroup.add(zAxis);
    
    scene.add(axesGroup);
}

// Create scale for dimension values
function createScale(dimension, range) {
    const values = bulk.instances.map(d => {
        const dim = d.dimensions.find(dim => dim.id === dimension.id);
        return dim ? dim.value : null;
    }).filter(v => v !== null);
    
    // Handle different value types
    const uniqueValues = [...new Set(values)];
    
    if (typeof values[0] === 'number') {
        // Numeric scale - D3 v3 syntax
        return d3.scale.linear()
            .domain(d3.extent(values))
            .range(range);
    } else {
        // Ordinal scale - D3 v3 syntax
        return d3.scale.ordinal()
            .domain(uniqueValues.sort())
            .rangePoints(range, 0.5);
    }
}

// Update visualization with selected dimensions
function updateVisualization() {
    // Clear existing instances
    instances.forEach(instance => {
        scene.remove(instance.mesh);
    });
    instances = [];
    
    if (!selectedDimensions.x || !selectedDimensions.y || !selectedDimensions.z) {
        return;
    }
    
    // Create scales
    const xScale = createScale(selectedDimensions.x, [-25, 25]);
    const yScale = createScale(selectedDimensions.y, [-25, 25]);
    const zScale = createScale(selectedDimensions.z, [-25, 25]);
    
    // Create color scale if selected
    let colorScale = null;
    if (selectedDimensions.color) {
        const colorValues = bulk.instances.map(d => {
            const dim = d.dimensions.find(dim => dim.id === selectedDimensions.color.id);
            return dim ? dim.value : null;
        }).filter(v => v !== null);
        
        if (typeof colorValues[0] === 'number') {
            // Numeric color scale - using D3 v3
            const extent = d3.extent(colorValues);
            colorScale = function(value) {
                const t = (value - extent[0]) / (extent[1] - extent[0]);
                // Simple gradient from blue to red
                const r = Math.floor(255 * t);
                const b = Math.floor(255 * (1 - t));
                return `rgb(${r}, 100, ${b})`;
            };
        } else {
            // Categorical color scale - D3 v3
            const uniqueColors = [...new Set(colorValues)];
            const colors = d3.scale.category10();
            colorScale = function(value) {
                const index = uniqueColors.indexOf(value);
                return colors(index);
            };
        }
    }
    
    // Create spheres for each instance
    bulk.instances.forEach((instance, index) => {
        const xDim = instance.dimensions.find(d => d.id === selectedDimensions.x.id);
        const yDim = instance.dimensions.find(d => d.id === selectedDimensions.y.id);
        const zDim = instance.dimensions.find(d => d.id === selectedDimensions.z.id);
        
        if (!xDim || !yDim || !zDim) return;
        
        const x = xScale(xDim.value);
        const y = yScale(yDim.value);
        const z = zScale(zDim.value);
        
        // Determine color
        let color = 0x4169E1; // Default blue
        if (selectedDimensions.color) {
            const colorDim = instance.dimensions.find(d => d.id === selectedDimensions.color.id);
            if (colorDim && colorScale) {
                const colorValue = colorScale(colorDim.value);
                if (typeof colorValue === 'string') {
                    color = new THREE.Color(colorValue).getHex();
                }
            }
        } else if (instance.formula) {
            // Use formula-based colors
            const formulaKey = Object.keys(formulaColors).find(key => 
                instance.formula.name && instance.formula.name.includes(key)
            );
            if (formulaKey) {
                color = formulaColors[formulaKey];
            }
        }
        
        // Create sphere
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            shininess: 100
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        
        // Store instance data
        sphere.userData = {
            instance: instance,
            index: index + 1
        };
        
        scene.add(sphere);
        instances.push({
            mesh: sphere,
            data: instance
        });
        
        // Add number label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        context.fillStyle = 'white';
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText((index + 1).toString(), 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(3, 3, 1);
        sphere.add(sprite);
    });
    
    updateLegend();
}

// Update legend
function updateLegend() {
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = '';
    
    const formulasInUse = new Set();
    instances.forEach(instance => {
        if (instance.data.formula && instance.data.formula.name) {
            formulasInUse.add(instance.data.formula.name);
        }
    });
    
    formulasInUse.forEach(formula => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        const formulaKey = Object.keys(formulaColors).find(key => formula.includes(key));
        if (formulaKey) {
            const color = formulaColors[formulaKey];
            colorBox.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
        }
        
        const label = document.createElement('span');
        label.textContent = formula;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legendContent.appendChild(item);
    });
}

// Handle mouse movement for hover effects
function onMouseMove(event) {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(instances.map(i => i.mesh));
    
    const tooltip = document.getElementById('tooltip');
    
    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        
        if (hoveredInstance !== intersected) {
            if (hoveredInstance) {
                hoveredInstance.material.emissiveIntensity = 0.2;
            }
            hoveredInstance = intersected;
            hoveredInstance.material.emissiveIntensity = 0.5;
        }
        
        // Update tooltip
        const instanceData = intersected.userData.instance;
        tooltip.innerHTML = `
            <strong>${instanceData.name}</strong><br>
            Instance #${intersected.userData.index}<br>
            ${selectedDimensions.x.name}: ${instanceData.dimensions.find(d => d.id === selectedDimensions.x.id)?.value || 'N/A'}<br>
            ${selectedDimensions.y.name}: ${instanceData.dimensions.find(d => d.id === selectedDimensions.y.id)?.value || 'N/A'}<br>
            ${selectedDimensions.z.name}: ${instanceData.dimensions.find(d => d.id === selectedDimensions.z.id)?.value || 'N/A'}
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX + 10 + 'px';
        tooltip.style.top = event.clientY + 10 + 'px';
    } else {
        if (hoveredInstance) {
            hoveredInstance.material.emissiveIntensity = 0.2;
            hoveredInstance = null;
        }
        tooltip.style.display = 'none';
    }
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Populate dimension dropdowns
function populateDimensions() {
    const dimensions = bulk.dimensions.sort((a, b) => a.name.localeCompare(b.name));
    
    ['x-dimension', 'y-dimension', 'z-dimension', 'color-dimension'].forEach((id, index) => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        
        if (id === 'color-dimension') {
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'None (use formulas)';
            select.appendChild(noneOption);
        }
        
        dimensions.forEach(dim => {
            const option = document.createElement('option');
            option.value = dim.id;
            option.textContent = dim.name;
            select.appendChild(option);
        });
        
        // Set defaults
        if (index === 0) select.value = dimensions[3]?.id || ''; // offence weight
        if (index === 1) select.value = dimensions[12]?.id || ''; // offence impact
        if (index === 2) select.value = dimensions[6]?.id || ''; // acting on anger
        
        select.addEventListener('change', () => {
            const dimId = select.value;
            const dim = dimensions.find(d => d.id === dimId);
            
            if (id === 'x-dimension') selectedDimensions.x = dim;
            else if (id === 'y-dimension') selectedDimensions.y = dim;
            else if (id === 'z-dimension') selectedDimensions.z = dim;
            else if (id === 'color-dimension') selectedDimensions.color = dimId ? dim : null;
            
            updateVisualization();
        });
    });
    
    // Initialize with defaults
    selectedDimensions.x = dimensions[3];
    selectedDimensions.y = dimensions[12];
    selectedDimensions.z = dimensions[6];
    updateVisualization();
}

// Load Three.js OrbitControls
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/OrbitControls.js';
script.onload = () => {
    // Initialize when bulk data is loaded
    d3.json("../bulk.json", function(error, json) {
        if (error) {
            console.error('Error loading bulk.json:', error);
            return;
        }
        setBulk(json);
        init();
        populateDimensions();
    });
};
document.head.appendChild(script);