// 3D PCA Visualization for Grettir's Temper Management
let scene, camera, renderer, controls;
let instances = [];
let raycaster, mouse;
let hoveredInstance = null;
let pcaData = null;
let modelData = null;

// Color schemes
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
    scene.add(directionalLight);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(80, 16, 0xcccccc, 0xeeeeee);
    gridHelper.position.y = -30;
    scene.add(gridHelper);
    
    // Add axes
    createAxes();
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('mousemove', onMouseMove);
    
    // Color selector
    document.getElementById('color-dimension').addEventListener('change', updateVisualization);
    
    // Start animation
    animate();
}

// Create coordinate axes with labels
function createAxes() {
    const axesGroup = new THREE.Group();
    
    // X axis (PC1) - red
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -30, -30),
        new THREE.Vector3(30, -30, -30)
    ]);
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const xAxis = new THREE.Line(xGeometry, xMaterial);
    axesGroup.add(xAxis);
    
    // Y axis (PC2) - green
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -30, -30),
        new THREE.Vector3(-30, 30, -30)
    ]);
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    axesGroup.add(yAxis);
    
    // Z axis (PC3) - blue
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -30, -30),
        new THREE.Vector3(-30, -30, 30)
    ]);
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    axesGroup.add(zAxis);
    
    scene.add(axesGroup);
}

// Update visualization with PCA data
function updateVisualization() {
    // Clear existing instances
    instances.forEach(instance => {
        scene.remove(instance.mesh);
    });
    instances = [];
    
    if (!pcaData || !pcaData.length) return;
    
    // Get color selection
    const colorMode = document.getElementById('color-dimension').value;
    
    // Create scales for PC1, PC2, PC3
    const pc1Values = pcaData.map(d => d.pc_1);
    const pc2Values = pcaData.map(d => d.pc_2);
    const pc3Values = pcaData.map(d => d.pc_3);
    
    const xScale = d3.scale.linear()
        .domain(d3.extent(pc1Values))
        .range([-25, 25]);
    
    const yScale = d3.scale.linear()
        .domain(d3.extent(pc2Values))
        .range([-25, 25]);
    
    const zScale = d3.scale.linear()
        .domain(d3.extent(pc3Values))
        .range([-25, 25]);
    
    // Color scale for PC4 if selected
    let colorScale = null;
    if (colorMode === 'pc4' && pcaData[0].pc_4 !== undefined) {
        const pc4Values = pcaData.map(d => d.pc_4);
        const extent = d3.extent(pc4Values);
        colorScale = function(value) {
            const t = (value - extent[0]) / (extent[1] - extent[0]);
            // Muted gradient from cold blue to warm red
            // Blue -> Teal -> Green -> Yellow -> Orange -> Red
            let r, g, b;
            if (t < 0.2) {
                // Muted Blue to Teal
                const localT = t / 0.2;
                r = Math.floor(40 + 30 * localT);
                g = Math.floor(60 + 80 * localT);
                b = Math.floor(180 - 30 * localT);
            } else if (t < 0.4) {
                // Teal to Muted Green
                const localT = (t - 0.2) / 0.2;
                r = Math.floor(70 + 30 * localT);
                g = Math.floor(140 + 20 * localT);
                b = Math.floor(150 - 50 * localT);
            } else if (t < 0.6) {
                // Muted Green to Yellow-Green
                const localT = (t - 0.4) / 0.2;
                r = Math.floor(100 + 80 * localT);
                g = Math.floor(160 + 20 * localT);
                b = Math.floor(100 - 40 * localT);
            } else if (t < 0.8) {
                // Yellow-Green to Muted Orange
                const localT = (t - 0.6) / 0.2;
                r = Math.floor(180 + 40 * localT);
                g = Math.floor(180 - 60 * localT);
                b = Math.floor(60);
            } else {
                // Muted Orange to Warm Red
                const localT = (t - 0.8) / 0.2;
                r = Math.floor(220 - 20 * localT);
                g = Math.floor(120 - 40 * localT);
                b = Math.floor(60 + 10 * localT);
            }
            return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
        };
    }
    
    // Create spheres for each instance
    pcaData.forEach((row, index) => {
        const x = xScale(row.pc_1);
        const y = yScale(row.pc_2);
        const z = zScale(row.pc_3);
        
        // Find corresponding instance in bulk data
        const instance = bulk.instances.firstWhose('id', row.id);
        if (!instance) return;
        
        // Determine color
        let color = 0x4169E1; // Default blue
        
        if (colorMode === 'pc4' && colorScale && row.pc_4 !== undefined) {
            color = colorScale(row.pc_4);
        } else if (colorMode === 'chapter' && instance.chapter) {
            // Color gradient by chapter - cold to hot
            const chapterScale = d3.scale.linear()
                .domain([1, 85])
                .range([0, 1]);
            const t = chapterScale(instance.chapter);
            // Use same muted cold-to-hot gradient
            let r, g, b;
            if (t < 0.2) {
                // Muted Blue to Teal
                const localT = t / 0.2;
                r = Math.floor(40 + 30 * localT);
                g = Math.floor(60 + 80 * localT);
                b = Math.floor(180 - 30 * localT);
            } else if (t < 0.4) {
                // Teal to Muted Green
                const localT = (t - 0.2) / 0.2;
                r = Math.floor(70 + 30 * localT);
                g = Math.floor(140 + 20 * localT);
                b = Math.floor(150 - 50 * localT);
            } else if (t < 0.6) {
                // Muted Green to Yellow-Green
                const localT = (t - 0.4) / 0.2;
                r = Math.floor(100 + 80 * localT);
                g = Math.floor(160 + 20 * localT);
                b = Math.floor(100 - 40 * localT);
            } else if (t < 0.8) {
                // Yellow-Green to Muted Orange
                const localT = (t - 0.6) / 0.2;
                r = Math.floor(180 + 40 * localT);
                g = Math.floor(180 - 60 * localT);
                b = Math.floor(60);
            } else {
                // Muted Orange to Warm Red
                const localT = (t - 0.8) / 0.2;
                r = Math.floor(220 - 20 * localT);
                g = Math.floor(120 - 40 * localT);
                b = Math.floor(60 + 10 * localT);
            }
            color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);
        } else if (colorMode === 'formula' && instance.formula) {
            // Use formula-based colors
            const formulaKey = Object.keys(formulaColors).find(key => 
                instance.formula.name && instance.formula.name.includes(key)
            );
            if (formulaKey) {
                color = formulaColors[formulaKey];
            }
        }
        
        // Create sphere
        const geometry = new THREE.SphereGeometry(1.2, 32, 32);
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
            pcaData: row,
            index: index + 1
        };
        
        scene.add(sphere);
        instances.push({
            mesh: sphere,
            data: instance,
            pcaData: row
        });
        
        // Add number label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        context.fillStyle = 'white';
        context.font = 'bold 32px Arial';
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
        sprite.scale.set(2.5, 2.5, 1);
        sphere.add(sprite);
    });
    
    updateLegend();
}

// Update legend
function updateLegend() {
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = '';
    
    // Add numbered instances
    instances.forEach((instance, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.style.fontSize = '0.75em';
        item.style.cursor = 'pointer';
        
        const number = document.createElement('strong');
        number.textContent = `${index + 1}. `;
        number.style.marginRight = '4px';
        
        const label = document.createElement('span');
        label.textContent = instance.data.name || `Instance ${index + 1}`;
        
        item.appendChild(number);
        item.appendChild(label);
        
        // Highlight on hover
        item.addEventListener('mouseenter', () => {
            instance.mesh.material.emissiveIntensity = 0.5;
        });
        item.addEventListener('mouseleave', () => {
            instance.mesh.material.emissiveIntensity = 0.2;
        });
        
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
        const pcaData = intersected.userData.pcaData;
        tooltip.innerHTML = `
            <strong>${instanceData.name}</strong><br>
            Instance #${intersected.userData.index}<br>
            PC1: ${pcaData.pc_1.toFixed(3)}<br>
            PC2: ${pcaData.pc_2.toFixed(3)}<br>
            PC3: ${pcaData.pc_3.toFixed(3)}<br>
            ${pcaData.pc_4 !== undefined ? `PC4: ${pcaData.pc_4.toFixed(3)}<br>` : ''}
            ${instanceData.formula ? `Formula: ${instanceData.formula.name}` : ''}
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

// Load PCA data and model
function loadPCAData() {
    // Load components data
    d3.dsv(";", "text/plain")("../pca1/components.csv")
        .row(function(d, instanceIndex) { 
            for(var i = 1; ; ++i) {
                var key = "pc_"+i
                var pc = d[key]
                if (!pc) break
                d[key] = parseFloat(pc)
            }
            d.number = instanceIndex + 1
            return d; 
        })
        .get(function(error, rows){ 
            if(error) {
                console.error('Error loading PCA data:', error);
                return;
            }
            pcaData = rows;
            
            // Load model data for variance explanation
            d3.xml("../pca1/model.xml", function(error, xml) {
                if (error) {
                    console.error('Error loading model:', error);
                    updateVisualization();
                    return;
                }
                
                const model = d3.select(xml).select("PCAModel PCAModel default");
                const variances = model.selectAll("variances double").eachText(parseFloat);
                
                if (variances && variances.length >= 3) {
                    const totalVariance = variances.reduce((a, b) => a + b, 0);
                    const pc1Percent = (variances[0] / totalVariance * 100).toFixed(1);
                    const pc2Percent = (variances[1] / totalVariance * 100).toFixed(1);
                    const pc3Percent = (variances[2] / totalVariance * 100).toFixed(1);
                    const totalExplained = (parseFloat(pc1Percent) + parseFloat(pc2Percent) + parseFloat(pc3Percent)).toFixed(1);
                    
                    document.getElementById('pc1-variance').textContent = `${pc1Percent}% variance`;
                    document.getElementById('pc2-variance').textContent = `${pc2Percent}% variance`;
                    document.getElementById('pc3-variance').textContent = `${pc3Percent}% variance`;
                    document.getElementById('variance-info').innerHTML = 
                        `<strong>Total variance explained by first 3 components:</strong> ${totalExplained}%`;
                }
                
                updateVisualization();
            });
        });
}

// Load Three.js OrbitControls
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/OrbitControls.js';
script.onload = () => {
    // Initialize when bulk data is loaded
    d3.json("../../bulk.json", function(error, json) {
        if (error) {
            console.error('Error loading bulk.json:', error);
            return;
        }
        setBulk(json);
        init();
        loadPCAData();
    });
};
document.head.appendChild(script);