let renderer, scene, camera, projector, state, glitch_renderer, active_renderer;
let models3D = {};

let div = document.getElementById('container');
let mouse = new THREE.Vector2();
let rotationCamera = -0.45;

let local_state = -1;
let global_state = 0; // For the tests

function animate() {
	requestAnimationFrame(animate);
	active_renderer.render(scene, camera);
};

init();
async function init() {
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(color.blue, 1);
	renderer.gammaOutput = true;
	renderer.gammaFactor = 2.2;
	renderer.shadowMap.enabled= true;
	active_renderer = renderer;
	div.appendChild(renderer.domElement);

	// Scene, lightning and camera organisation
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.2, 25000);
	camera.position.set(0, 200, 50);
	camera.rotation.x = rotationCamera * Math.PI;
	scene.add(camera);
	makeLight();
	makeSky();
	await createMap();
	renderer.render(scene, camera);

	// Postproduction
	glitch_renderer = new THREE.EffectComposer( renderer );
	glitch_renderer.addPass( new THREE.RenderPass( scene, camera ) );
	glitchPass = new THREE.GlitchPass();
	glitchPass.renderToScreen = true;
	glitch_renderer.addPass( glitchPass );
	console.log(glitch_renderer);

	// Starting the game
	animate();
	await loadEveryModels(models_paths, models3D);
	startGame();

	// Tests
	await sleep(5000);
	global_state++;
	await sleep(5000);
	global_state++;
	await sleep(5000);
	global_state++;
	await sleep(15000);
	global_state++;
}

async function startGame(event){
	let temp_state = getState();

	if(temp_state !== local_state){
		switch(temp_state) {
			case 0:
				document.getElementById('logo').style.opacity = 0;
				//await moveCamera(0,1,50,-0.01,20,100);
				await treeMap(scene, models3D);
				break;
			case 1:
				removeMap(scene, models3D);
				break;
			case 2:
				cityMap(scene, models3D);
				document.addEventListener('keypress', interactionEvent);
				await sleep(1000);
				break;
			case 3:
				active_renderer = glitch_renderer;
				break;
			case 4:
				glitch_renderer.passes[1].goWild = true;
				break;

		}
		local_state = temp_state;
	}
	setTimeout(startGame, 100);
}

function getState(){
	// TODO: Fontion à relier au serv python
	return global_state;
}

function interactionEvent(event){
	console.log(event.code)
	if(event.code === 'KeyQ'){
		addHouse();
	} else if (event.code === 'KeyB') {
		addBuilding();
	}
}

function makeLight(){
	lightAmbient = new THREE.AmbientLight(0x7f7f7f);

	solar_light = new THREE.DirectionalLight();
	solar_light.position.set(-500, 500, 0);
	solar_light.castShadow = true;
	solar_light.intensity = 1;

	solar_light.shadow.mapSize.width = 2048;
	solar_light.shadow.mapSize.height = 2048;
	solar_light.shadow.camera.near = 0.5;
	solar_light.shadow.camera.far = 20000;

	intensidad=150;

	solar_light.shadow.camera.left = -intensidad;
	solar_light.shadow.camera.right = intensidad;
	solar_light.shadow.camera.top = intensidad;
	solar_light.shadow.camera.bottom = -intensidad;

	scene.add(solar_light, lightAmbient);
}

function makeSky(){
	var vertexShader = `
		varying vec3 vWorldPosition;
			void main() {
				vec4 worldPosition = modelMatrix * vec4(position, 1.0);
				vWorldPosition = worldPosition.xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
	`;
	var fragmentShader = `
			uniform vec3 topColor;
			uniform vec3 bottomColor;
			uniform float offset;
			uniform float exponent;
			varying vec3 vWorldPosition;
			void main() {
				float h = normalize(vWorldPosition + offset ).y;
				gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h , 0.0), exponent ), 0.0 ) ), 1.0);
			}
	`;

	var uniforms = {
		"topColor": { value: new THREE.Color(0x0077ff ) },
		"bottomColor": { value: new THREE.Color(0xcfe5fe ) },
		"offset": { value: 33 },
		"exponent": { value: 0.6 }
	};

	scene.fog = new THREE.Fog(scene.background, 1, 800);
	scene.fog.color.copy(uniforms[ "bottomColor" ].value);
	var skyGeo = new THREE.SphereBufferGeometry(4000, 32, 15);
	var skyMat = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.BackSide
	});
	var sky = new THREE.Mesh(skyGeo, skyMat);
	scene.add(sky);
}

async function createMap(){
	texture = new THREE.TextureLoader().load("https://raw.githubusercontent.com/morvan-s/iCreate2019/master/src/textures/texture.jpg");
	material = new THREE.MeshLambertMaterial({ map: texture});
	plane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), material);
	plane.material.side = THREE.DoubleSide;
	plane.position.x = 10;
	plane.position.z = -30;
	plane.rotation.x = -0.5 * Math.PI;
	plane.receiveShadow = true;
	scene.add(plane);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.updateProjectionMatrix();
};

function onMouseMove(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	mouseX = event.clientX - window.innerWidth / 2;
	mouseY = event.clientY - window.innerHeight / 2;
	camera.position.x += (mouseX - camera.position.x) * 0.001;
	camera.position.y += (mouseY - camera.position.y) * 0.001;
	camera.lookAt(scene.position);
};

// A deplacer dans map :

// async function regionOccupated(x,y,x1,y1){
// 	for (var  i = x; i<=x1 ;i++) {
// 		for (var j = y; j<=y1;j++){
// 			if (isOccupated(i,j)){
// 				return false;
// 			}
// 		}
// 	}
// 	return false;
// }
//
// async function isOccupated(x,y){
// 	x = x -10;
// 	y = y+ 30
// 	var monImage = new Image();
// 	monImage.crossOrigin = 'Anonymous';
// 	if (x + 200>400 && y+200>400){
// 		console.log("X et Y en dehors des bornes")
// 	}
// 	monImage.onload = function()
// 	{
// 	  var img = nj.images.read(monImage);
// 	  var img=nj.images.resize(img,400,400);
// 	  var gray = nj.images.rgb2gray(img)
// 	  if (gray.get(x+200,y+200)< 100){
// 			return true;
// 		}
// 		else {
// 			return false;
// 		}
// 	}
// 	monImage.src=("https://raw.githubusercontent.com/morvan-s/iCreate2019/master/src/textures/texture_seuil.jpg");
// }
